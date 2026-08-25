import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

type RuntimePhase = "source-missing" | "build-required" | "ready" | "running" | "unreachable" | "stopped";

export type EmbeddedTheiaStatus = {
  phase: RuntimePhase;
  endpoint: string;
  sourceRoot: string;
  sourceAvailable: boolean;
  applicationBuilt: boolean;
  runtimeStartedByOsamah: boolean;
  health: "healthy" | "unreachable" | "not-checked";
  detail: string;
};

export type EmbeddedTheiaServeCommand = {
  binary: string;
  args: string[];
  cwd: string;
};

let child: ChildProcessWithoutNullStreams | undefined;
let lastFailure = "";

function endpoint() {
  const port = Number(process.env.THEIA_EMBEDDED_PORT ?? "4080");
  const safePort = Number.isInteger(port) && port > 0 && port < 65536 ? port : 4080;
  return `http://127.0.0.1:${safePort}`;
}

export function embeddedTheiaRoot() {
  return resolve(process.env.THEIA_EMBEDDED_ROOT?.trim() || resolve(process.cwd(), "third_party/theia"));
}

export function embeddedTheiaApplicationRoot() {
  return resolve(process.env.THEIA_EMBEDDED_APPLICATION_ROOT?.trim() || resolve(embeddedTheiaRoot(), "examples/browser-only"));
}

function entryPoint() {
  return resolve(embeddedTheiaApplicationRoot(), "src-gen/backend/main.js");
}

async function exists(path: string) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function hasEmbeddedTheiaSource() {
  const root = embeddedTheiaRoot();
  return (
    (await exists(resolve(root, "package.json"))) &&
    (await exists(resolve(root, "dev-packages/cli/package.json"))) &&
    (await exists(resolve(root, "examples/browser-only/package.json")))
  );
}

export async function hasBuiltEmbeddedTheiaApplication() {
  return exists(entryPoint());
}

export function buildEmbeddedTheiaServeCommand(): EmbeddedTheiaServeCommand {
  const port = endpoint().split(":").at(-1) ?? "4080";
  return {
    binary: process.env.THEIA_NODE_PATH?.trim() || process.execPath,
    args: [entryPoint(), "--hostname=127.0.0.1", `--port=${port}`],
    cwd: embeddedTheiaApplicationRoot(),
  };
}

async function probeHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_800);
  try {
    const response = await fetch(endpoint(), { headers: { Accept: "text/html" }, signal: controller.signal, redirect: "manual" });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForHealthyRuntime(timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probeHealth()) return true;
    if (!child || child.killed) return false;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  return false;
}

export async function embeddedTheiaStatus(): Promise<EmbeddedTheiaStatus> {
  const sourceRoot = embeddedTheiaRoot();
  const sourceAvailable = await hasEmbeddedTheiaSource();
  if (!sourceAvailable) {
    return {
      phase: "source-missing",
      endpoint: endpoint(),
      sourceRoot,
      sourceAvailable: false,
      applicationBuilt: false,
      runtimeStartedByOsamah: false,
      health: "not-checked",
      detail: "Embedded Theia source files are not available.",
    };
  }

  const applicationBuilt = await hasBuiltEmbeddedTheiaApplication();
  if (!applicationBuilt) {
    return {
      phase: "build-required",
      endpoint: endpoint(),
      sourceRoot,
      sourceAvailable: true,
      applicationBuilt: false,
      runtimeStartedByOsamah: false,
      health: "not-checked",
      detail: "Embedded Theia source is present, but its browser application has not been built. No IDE process was started.",
    };
  }

  const healthy = await probeHealth();
  if (healthy) {
    return {
      phase: "running",
      endpoint: endpoint(),
      sourceRoot,
      sourceAvailable: true,
      applicationBuilt: true,
      runtimeStartedByOsamah: Boolean(child && !child.killed),
      health: "healthy",
      detail: "The embedded Theia browser application responded on its loopback endpoint.",
    };
  }

  return {
    phase: child && !child.killed ? "unreachable" : "ready",
    endpoint: endpoint(),
    sourceRoot,
    sourceAvailable: true,
    applicationBuilt: true,
    runtimeStartedByOsamah: Boolean(child && !child.killed),
    health: "unreachable",
    detail: lastFailure || "The embedded Theia application is built but is not running.",
  };
}

export async function readEmbeddedTheiaPackage() {
  const packagePath = resolve(embeddedTheiaRoot(), "packages/core/package.json");
  const file = await readFile(packagePath, "utf8");
  const json = JSON.parse(file) as { name?: unknown; version?: unknown; license?: unknown };
  return {
    name: typeof json.name === "string" ? json.name : "unknown",
    version: typeof json.version === "string" ? json.version : "unknown",
    license: typeof json.license === "string" ? json.license : "unknown",
  };
}

/**
 * Starts a previously built Theia browser application. It is intentionally not
 * exposed through browser-initiated RPC; starting an IDE server requires a
 * server-side authorization policy and a controlled build artifact.
 */
export async function startEmbeddedTheiaRuntime() {
  const current = await embeddedTheiaStatus();
  if (!current.sourceAvailable || !current.applicationBuilt) throw new Error(current.detail);
  if (current.health === "healthy" || (child && !child.killed)) return current;

  const command = buildEmbeddedTheiaServeCommand();
  lastFailure = "";
  child = spawn(command.binary, command.args, {
    cwd: command.cwd,
    env: { ...process.env, THEIA_HOST: "127.0.0.1", THEIA_PORT: command.args.at(-1)?.replace("--port=", "") },
    stdio: "pipe",
  });
  child.once("error", error => {
    lastFailure = `Theia process could not start: ${error.message}`;
    child = undefined;
  });
  child.once("exit", (code, signal) => {
    if (code !== 0) lastFailure = `Theia process exited (${code ?? "unknown"}${signal ? `, ${signal}` : ""}).`;
    child = undefined;
  });
  if (!(await waitForHealthyRuntime()) && !lastFailure) lastFailure = "Theia process did not respond before the startup timeout.";
  return embeddedTheiaStatus();
}

export function stopEmbeddedTheiaRuntime() {
  if (child && !child.killed) child.kill("SIGTERM");
  child = undefined;
}
