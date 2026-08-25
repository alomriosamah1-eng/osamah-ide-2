/**
 * Design philosophy — Quiet Intelligence Observatory:
 * This browser-side adapter speaks only to a user-run OpenCode server on loopback.
 * It never stores API keys, never supplies a model fallback, and turns the server's
 * enabled runtime models into the only selectable entries in Osamah IDE.
 */
import type { OpenCodeModelCatalog, OpenCodeModelPreference } from "./opencode-contract";

const OPEN_CODE_CONNECTION_STORAGE_KEY = "osamah.ide.opencode.connection.v1";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1", "opencode.local"]);

export type OpenCodeConnectionConfig = {
  baseUrl: string;
};

export type OpenCodeDiscoveryResult = {
  catalog: OpenCodeModelCatalog;
  endpoint: string;
  providerCount: number;
};

type OpenCodeHealthPayload = { healthy?: unknown };
type OpenCodeProviderPayload = { data?: unknown };
type OpenCodeModelPayload = { data?: unknown };

type ProviderRecord = {
  id: string;
  name: string;
  disabled?: boolean;
};

type ModelRecord = {
  id: string;
  providerID: string;
  name: string;
  enabled: boolean;
};

export class OpenCodeConnectionError extends Error {
  constructor(
    public readonly kind: "invalid-endpoint" | "offline" | "protocol",
    message: string,
  ) {
    super(message);
    this.name = "OpenCodeConnectionError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProviderRecord(value: unknown): value is ProviderRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.disabled === undefined || typeof value.disabled === "boolean")
  );
}

function isModelRecord(value: unknown): value is ModelRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.providerID === "string" &&
    typeof value.name === "string" &&
    typeof value.enabled === "boolean"
  );
}

function isHealthy(payload: unknown): payload is { healthy: true } {
  return isRecord(payload) && payload.healthy === true;
}

function formatEndpoint(url: URL) {
  return url.toString().replace(/\/$/, "");
}

/**
 * OpenCode's network defaults bind to 127.0.0.1. Keeping this adapter loopback-only
 * prevents a browser field intended for the local tool from becoming an arbitrary remote
 * execution target; a future authenticated gateway requires a separate explicit design.
 */
export function normalizeOpenCodeEndpoint(value: string): string {
  const candidate = value.trim();
  if (!candidate) {
    throw new OpenCodeConnectionError("invalid-endpoint", "An OpenCode endpoint is required.");
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new OpenCodeConnectionError("invalid-endpoint", "The OpenCode endpoint is not a valid URL.");
  }

  if ((url.protocol !== "http:" && url.protocol !== "https:") || !LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) {
    throw new OpenCodeConnectionError("invalid-endpoint", "Only a loopback OpenCode server can be connected here.");
  }

  if (url.username || url.password || (url.pathname !== "/" && url.pathname !== "" ) || url.search || url.hash) {
    throw new OpenCodeConnectionError("invalid-endpoint", "Use the OpenCode server origin only, without credentials or a path.");
  }

  return formatEndpoint(url);
}

export function loadOpenCodeConnection(): OpenCodeConnectionConfig | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(OPEN_CODE_CONNECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.baseUrl !== "string") return null;
    return { baseUrl: normalizeOpenCodeEndpoint(parsed.baseUrl) };
  } catch {
    return null;
  }
}

export function saveOpenCodeConnection(config: OpenCodeConnectionConfig) {
  if (typeof window === "undefined") return;
  const baseUrl = normalizeOpenCodeEndpoint(config.baseUrl);
  window.localStorage.setItem(OPEN_CODE_CONNECTION_STORAGE_KEY, JSON.stringify({ baseUrl }));
}

export function clearOpenCodeConnection() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(OPEN_CODE_CONNECTION_STORAGE_KEY);
}

async function requestJson<T>(endpoint: string, path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${endpoint}${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
  } catch {
    throw new OpenCodeConnectionError(
      "offline",
      "The OpenCode server could not be reached. Confirm it is running and allows this browser origin.",
    );
  }

  if (!response.ok) {
    throw new OpenCodeConnectionError("protocol", `OpenCode returned HTTP ${response.status} for ${path}.`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new OpenCodeConnectionError("protocol", `OpenCode returned an invalid JSON response for ${path}.`);
  }
}

function toModelPreference(model: ModelRecord, provider?: ProviderRecord): OpenCodeModelPreference {
  const providerName = provider?.name ?? model.providerID;
  return {
    value: `${encodeURIComponent(model.providerID)}:${encodeURIComponent(model.id)}`,
    providerId: model.providerID,
    modelId: model.id,
    label: { ar: model.name, en: model.name },
    detail: {
      ar: `مزوّد فعلي: ${providerName}`,
      en: `Runtime provider: ${providerName}`,
    },
    source: "runtime",
  };
}

/**
 * The routes map to OpenCode's generated client contract: /api/health, /api/provider,
 * and /api/model. Only enabled models whose provider is not disabled are surfaced.
 */
export async function discoverOpenCodeModels(baseUrl: string, signal?: AbortSignal): Promise<OpenCodeDiscoveryResult> {
  const endpoint = normalizeOpenCodeEndpoint(baseUrl);
  const health = await requestJson<OpenCodeHealthPayload>(endpoint, "/api/health", signal);
  if (!isHealthy(health)) {
    throw new OpenCodeConnectionError("protocol", "OpenCode did not confirm a healthy runtime.");
  }

  const [providersPayload, modelsPayload] = await Promise.all([
    requestJson<OpenCodeProviderPayload>(endpoint, "/api/provider", signal),
    requestJson<OpenCodeModelPayload>(endpoint, "/api/model", signal),
  ]);

  const providers = isRecord(providersPayload) && Array.isArray(providersPayload.data)
    ? providersPayload.data.filter(isProviderRecord)
    : null;
  const models = isRecord(modelsPayload) && Array.isArray(modelsPayload.data)
    ? modelsPayload.data.filter(isModelRecord)
    : null;

  if (!providers || !models) {
    throw new OpenCodeConnectionError("protocol", "OpenCode returned an unexpected provider or model payload.");
  }

  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const selectableModels = models
    .filter((model) => model.enabled && providersById.get(model.providerID)?.disabled !== true)
    .map((model) => toModelPreference(model, providersById.get(model.providerID)));

  return {
    endpoint,
    providerCount: providers.filter((provider) => provider.disabled !== true).length,
    catalog: {
      runtime: selectableModels.length > 0 ? "ready" : "unconfigured",
      discoveredAt: new Date().toISOString(),
      models: selectableModels,
    },
  };
}
