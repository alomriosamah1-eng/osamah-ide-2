/**
 * @fileoverview Detects the vendored Presenton source and a separately configured
 * loopback runtime. This bridge reports readiness only; it never enables
 * generation unless both explicit server-side flags are present.
 */

import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

type PresentonPhase = "source-missing" | "runtime-not-configured" | "unreachable" | "running";

/** Truthful Presenton source, loopback-health, provider and generation state for the UI. */
export type EmbeddedPresentonStatus = {
  phase: PresentonPhase;
  endpoint: string | null;
  sourceRoot: string;
  sourceAvailable: boolean;
  fastApiSourceAvailable: boolean;
  providerConfigured: boolean;
  generationEnabled: boolean;
  health: "healthy" | "unreachable" | "not-checked";
  upstreamApiPrefix: "/api/v1/ppt";
  detail: string;
};

async function exists(path: string) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function configuredEndpoint() {
  const value = process.env.PRESENTON_EMBEDDED_ENDPOINT?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

/** Resolves the server-owned Presenton source root without exposing it to clients. */
export function embeddedPresentonRoot() {
  return resolve(process.env.PRESENTON_EMBEDDED_ROOT?.trim() || resolve(process.cwd(), "third_party/presenton"));
}

/** Checks that the minimal vendored Presenton and FastAPI source markers are readable. */
export async function hasEmbeddedPresentonSource() {
  const root = embeddedPresentonRoot();
  return (await exists(resolve(root, "package.json"))) && (await exists(resolve(root, "servers/fastapi/pyproject.toml")));
}

/** Checks specifically for the vendored FastAPI application entry module. */
export async function hasEmbeddedPresentonFastApiSource() {
  return exists(resolve(embeddedPresentonRoot(), "servers/fastapi/api/main.py"));
}

async function probeHealth(endpoint: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_800);
  try {
    const response = await fetch(`${endpoint}/openapi.json`, { headers: { Accept: "application/json" }, signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Computes read-only readiness from source markers, a validated server-only endpoint,
 * a bounded health probe, and explicit provider and generation enablement flags.
 */
export async function embeddedPresentonStatus(): Promise<EmbeddedPresentonStatus> {
  const sourceRoot = embeddedPresentonRoot();
  const sourceAvailable = await hasEmbeddedPresentonSource();
  const fastApiSourceAvailable = sourceAvailable && await hasEmbeddedPresentonFastApiSource();
  const endpoint = configuredEndpoint();
  const providerConfigured = process.env.PRESENTON_EMBEDDED_PROVIDER_CONFIGURED === "1";
  const generationEnabled = process.env.PRESENTON_EMBEDDED_GENERATION_ENABLED === "1";

  if (!sourceAvailable || !fastApiSourceAvailable) {
    return { phase: "source-missing", endpoint, sourceRoot, sourceAvailable, fastApiSourceAvailable, providerConfigured: false, generationEnabled: false, health: "not-checked", upstreamApiPrefix: "/api/v1/ppt", detail: "Embedded Presenton FastAPI source files are not available." };
  }
  if (!endpoint) {
    return { phase: "runtime-not-configured", endpoint: null, sourceRoot, sourceAvailable, fastApiSourceAvailable, providerConfigured, generationEnabled: false, health: "not-checked", upstreamApiPrefix: "/api/v1/ppt", detail: "Presenton source is embedded, but no server-side endpoint has been configured or started." };
  }

  const healthy = await probeHealth(endpoint);
  if (!healthy) {
    return { phase: "unreachable", endpoint, sourceRoot, sourceAvailable, fastApiSourceAvailable, providerConfigured, generationEnabled: false, health: "unreachable", upstreamApiPrefix: "/api/v1/ppt", detail: "The configured Presenton endpoint did not respond to its OpenAPI health probe." };
  }
  if (!providerConfigured || !generationEnabled) {
    return { phase: "running", endpoint, sourceRoot, sourceAvailable, fastApiSourceAvailable, providerConfigured, generationEnabled: false, health: "healthy", upstreamApiPrefix: "/api/v1/ppt", detail: "Presenton responded, but generation remains disabled until an approved provider configuration and explicit server-side enablement are present." };
  }
  return { phase: "running", endpoint, sourceRoot, sourceAvailable, fastApiSourceAvailable, providerConfigured, generationEnabled: true, health: "healthy", upstreamApiPrefix: "/api/v1/ppt", detail: "Presenton responded and server-side generation has been explicitly enabled." };
}

/** Reads safe package metadata from the vendored Presenton source for status displays. */
export async function readEmbeddedPresentonPackage() {
  const packagePath = resolve(embeddedPresentonRoot(), "package.json");
  const file = await readFile(packagePath, "utf8");
  const json = JSON.parse(file) as { name?: unknown; version?: unknown; license?: unknown };
  return {
    name: typeof json.name === "string" ? json.name : "unknown",
    version: typeof json.version === "string" ? json.version : "unknown",
    license: typeof json.license === "string" ? json.license : "unknown",
    fastApiEntry: "servers/fastapi/api/main.py",
    upstreamApiPrefix: "/api/v1/ppt" as const,
  };
}
