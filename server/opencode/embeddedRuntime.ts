import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

type RuntimePhase = "source-missing" | "ready" | "running" | "unreachable" | "stopped";

export type EmbeddedOpenCodeStatus = {
  phase: RuntimePhase;
  endpoint: string;
  sourceRoot: string;
  sourceAvailable: boolean;
  runtimeStartedByOsamah: boolean;
  health: "healthy" | "unreachable" | "not-checked";
  detail: string;
};

export type EmbeddedOpenCodeServeCommand = {
  binary: string;
  args: string[];
  cwd: string;
};

let child: ChildProcessWithoutNullStreams | undefined;
let lastFailure = "";

function endpoint() {
  const port = Number(process.env.OPENCODE_EMBEDDED_PORT ?? "4096");
  const safePort = Number.isInteger(port) && port > 0 && port < 65536 ? port : 4096;
  return `http://127.0.0.1:${safePort}`;
}

export function embeddedOpenCodeRoot() {
  const configured = process.env.OPENCODE_EMBEDDED_ROOT;
  if (configured) return resolve(configured);
  return resolve(process.cwd(), "third_party/opencode");
}

async function exists(path: string) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function hasEmbeddedOpenCodeSource() {
  const root = embeddedOpenCodeRoot();
  return (
    (await exists(resolve(root, "LICENSE"))) &&
    (await exists(resolve(root, "packages/opencode/src/index.ts"))) &&
    (await exists(resolve(root, "packages/opencode/src/server/server.ts")))
  );
}

export function buildEmbeddedOpenCodeServeCommand(): EmbeddedOpenCodeServeCommand {
  const root = embeddedOpenCodeRoot();
  const port = endpoint().split(":").at(-1) ?? "4096";

  return {
    binary: resolveEmbeddedBunPath(),
    args: ["packages/opencode/src/index.ts", "serve", "--hostname", "127.0.0.1", "--port", port],
    cwd: root,
  };
}

function resolveEmbeddedBunPath() {
  const configured = process.env.OPENCODE_BUN_PATH?.trim();
  if (configured) return configured;

  const runtimeRoot = process.env.OPENCODE_BUN_ROOT?.trim() || resolve(process.env.HOME || "/home/ubuntu", ".opencode-runtime");
  try {
    const candidate = readdirSync(runtimeRoot, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith("bun-"))
      .sort((left, right) => right.name.localeCompare(left.name))
      .map(entry => resolve(runtimeRoot, entry.name, "bun-linux-x64", "bun"))
      .find(path => existsSync(path));

    if (candidate) return candidate;
  } catch {
    // Bun may be supplied by the deployment image instead of the local runtime cache.
  }

  return "bun";
}

async function probeHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_800);

  try {
    const response = await fetch(`${endpoint()}/api/health`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForHealthyRuntime(timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await probeHealth()) return true;
    if (!child || child.killed) return false;
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  return false;
}

export async function embeddedOpenCodeStatus(): Promise<EmbeddedOpenCodeStatus> {
  const root = embeddedOpenCodeRoot();
  const sourceAvailable = await hasEmbeddedOpenCodeSource();

  if (!sourceAvailable) {
    return {
      phase: "source-missing",
      endpoint: endpoint(),
      sourceRoot: root,
      sourceAvailable: false,
      runtimeStartedByOsamah: false,
      health: "not-checked",
      detail: "Embedded OpenCode source files are not available.",
    };
  }

  const healthy = await probeHealth();
  if (healthy) {
    return {
      phase: "running",
      endpoint: endpoint(),
      sourceRoot: root,
      sourceAvailable: true,
      runtimeStartedByOsamah: Boolean(child && !child.killed),
      health: "healthy",
      detail: "The embedded OpenCode HTTP API responded to its health check.",
    };
  }

  return {
    phase: child && !child.killed ? "unreachable" : "ready",
    endpoint: endpoint(),
    sourceRoot: root,
    sourceAvailable: true,
    runtimeStartedByOsamah: Boolean(child && !child.killed),
    health: "unreachable",
    detail:
      lastFailure ||
      "Embedded source is present. Install its Bun dependencies, then explicitly start the runtime before sending messages.",
  };
}

export async function readEmbeddedOpenCodePackage() {
  const packagePath = resolve(embeddedOpenCodeRoot(), "packages/opencode/package.json");
  const file = await readFile(packagePath, "utf8");
  const json = JSON.parse(file) as { name?: unknown; version?: unknown };
  return {
    name: typeof json.name === "string" ? json.name : "unknown",
    version: typeof json.version === "string" ? json.version : "unknown",
  };
}

/**
 * Starts the original OpenCode CLI entry point from the vendored source tree.
 * This is intentionally not called by a request handler: process startup must
 * remain an explicit, server-side operational action.
 */
export async function startEmbeddedOpenCodeRuntime() {
  const current = await embeddedOpenCodeStatus();
  if (!current.sourceAvailable) throw new Error(current.detail);
  if (current.health === "healthy" || (child && !child.killed)) return current;

  const command = buildEmbeddedOpenCodeServeCommand();
  lastFailure = "";
  child = spawn(command.binary, command.args, {
    cwd: command.cwd,
    env: {
      ...process.env,
      OPENCODE_SERVER_HOST: "127.0.0.1",
      OPENCODE_SERVER_PORT: command.args.at(-1),
    },
    stdio: "pipe",
  });

  child.once("error", error => {
    lastFailure = `OpenCode process could not start: ${error.message}`;
    child = undefined;
  });
  child.once("exit", (code, signal) => {
    if (code !== 0) lastFailure = `OpenCode process exited (${code ?? "unknown"}${signal ? `, ${signal}` : ""}).`;
    child = undefined;
  });

  if (!(await waitForHealthyRuntime())) {
    if (!lastFailure) lastFailure = "OpenCode process did not pass its health check before the startup timeout.";
  }

  return embeddedOpenCodeStatus();
}

export function stopEmbeddedOpenCodeRuntime() {
  if (child && !child.killed) child.kill("SIGTERM");
  child = undefined;
}
