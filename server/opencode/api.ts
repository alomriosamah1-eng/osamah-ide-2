/**
 * @fileoverview Server-only HTTP adapter for an already-running embedded OpenCode runtime.
 * It discovers actual provider models and forwards session/permission operations; it never
 * supplies a default model, credentials, or browser-owned execution context.
 */

import { embeddedOpenCodeStatus } from "./embeddedRuntime.js";

type JsonRecord = Record<string, unknown>;

/** Normalized enabled-model record returned by the embedded OpenCode API. */
export type OpenCodeModel = {
  id: string;
  providerID: string;
  name: string;
  variant?: string;
  supportsTools: boolean;
};

/** Renderable text message normalized from OpenCode session output. */
export type OpenCodeConversationMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

/** Permission request belonging to one OpenCode session. */
export type OpenCodePermissionRequest = {
  id: string;
  label: string;
};

/** Minimal session identifier returned after an accepted OpenCode session creation. */
export type OpenCodeSession = {
  id: string;
};

/** Expected availability or protocol error raised by the embedded OpenCode gateway. */
export class OpenCodeGatewayError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "OpenCodeGatewayError";
  }
}

const opencodeMessagePollIntervalMs = 500;
const defaultOpenCodeMessagePollTimeoutMs = 90_000;
const minOpenCodeMessagePollTimeoutMs = 5_000;
const maxOpenCodeMessagePollTimeoutMs = 300_000;

/** Resolves the bounded server-side wait from configuration without accepting unsafe values. */
export function getOpenCodeMessagePollTimeoutMs(value = process.env.OPENCODE_MESSAGE_WAIT_TIMEOUT_MS) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return defaultOpenCodeMessagePollTimeoutMs;
  return Math.min(maxOpenCodeMessagePollTimeoutMs, Math.max(minOpenCodeMessagePollTimeoutMs, parsed));
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapData(value: unknown): unknown {
  return isRecord(value) && "data" in value ? value.data : value;
}

async function runtimeEndpoint() {
  const runtime = await embeddedOpenCodeStatus();
  if (runtime.health !== "healthy") {
    throw new OpenCodeGatewayError(
      "OpenCode embedded runtime is not healthy. Start the server-side runtime before creating a session.",
    );
  }
  return runtime.endpoint;
}

async function requestOpenCode<T>(path: string, init?: RequestInit): Promise<T> {
  const endpoint = await runtimeEndpoint();
  const response = await fetch(`${endpoint}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.message === "string" ? payload.message : `OpenCode request failed (${response.status}).`;
    throw new OpenCodeGatewayError(message, response.status);
  }
  return payload as T;
}

/** Safely projects untrusted OpenCode model JSON into UI-safe model selections. */
export function mapOpenCodeModels(payload: unknown): OpenCodeModel[] {
  const list = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];
  return list.flatMap(item => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.providerID !== "string" || typeof item.name !== "string") {
      return [];
    }
    const capabilities = isRecord(item.capabilities) ? item.capabilities : undefined;
    return [{
      id: item.id,
      providerID: item.providerID,
      name: item.name,
      variant: typeof item.variant === "string" ? item.variant : undefined,
      supportsTools: capabilities?.tools === true,
    }];
  });
}

/** Fetches actually enabled OpenCode models; an empty result is a valid unconfigured state. */
export async function listOpenCodeModels() {
  const payload = await requestOpenCode<unknown>("/api/model");
  return mapOpenCodeModels(payload);
}

/** Server-validated model selection passed to a new OpenCode session. */
export type OpenCodeModelSelection = Pick<OpenCodeModel, "id" | "providerID" | "variant">;

/** Returns the selected model only when it is present in the current runtime discovery result. */
export function findDiscoveredOpenCodeModel(models: OpenCodeModel[], selection: OpenCodeModelSelection) {
  return models.find(model => (
    model.id === selection.id &&
    model.providerID === selection.providerID &&
    model.variant === selection.variant
  ));
}

/** Creates a runtime session with a server-validated, caller-selected discovered model. */
export async function createOpenCodeSession(model: OpenCodeModelSelection) {
  const payload = await requestOpenCode<unknown>("/api/session", {
    method: "POST",
    body: JSON.stringify({
      model,
      location: { directory: process.env.OPENCODE_WORKSPACE_DIR?.trim() || process.cwd() },
    }),
  });
  const session = unwrapData(payload);
  if (!isRecord(session) || typeof session.id !== "string") throw new OpenCodeGatewayError("OpenCode did not return a valid session.");
  return { id: session.id } satisfies OpenCodeSession;
}

/** Builds the documented legacy removal route required to delete a v2-created session. */
export function buildOpenCodeSessionRemovalPath(sessionID: string, directory = process.env.OPENCODE_WORKSPACE_DIR?.trim() || process.cwd()) {
  const query = new URLSearchParams({ directory });
  return `/session/${encodeURIComponent(sessionID)}?${query.toString()}`;
}

/** Removes a transient or explicitly discarded OpenCode session using its source-defined route. */
export async function deleteOpenCodeSession(sessionID: string) {
  await requestOpenCode<void>(buildOpenCodeSessionRemovalPath(sessionID), { method: "DELETE" });
}

/** Queues a complete server-built prompt for an existing runtime session. */
export async function promptOpenCodeSession(sessionID: string, text: string) {
  const payload = await requestOpenCode<unknown>(`/api/session/${encodeURIComponent(sessionID)}/prompt`, {
    method: "POST",
    body: JSON.stringify({ prompt: { text }, delivery: "queue" }),
  });
  return unwrapData(payload);
}

/** Returns true only for the documented runtime placeholder that lacks the wait implementation. */
export function shouldPollOpenCodeMessages(error: unknown) {
  return error instanceof OpenCodeGatewayError && error.status === 503 && /wait is not available yet/i.test(error.message);
}

/** Identifies a bounded poll timeout where OpenCode accepted the prompt but has not produced text yet. */
export function isOpenCodeResponsePending(error: unknown) {
  return error instanceof OpenCodeGatewayError && error.status === 504 && /expected assistant response before the server-side wait timeout/i.test(error.message);
}

/** Extracts only nonempty user/assistant text from an OpenCode message response. */
export function mapOpenCodeMessages(payload: unknown): OpenCodeConversationMessage[] {
  const messages = isRecord(payload) && Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return messages.flatMap((entry, index) => {
    if (!isRecord(entry)) return [];
    const role = entry.type;
    if (role !== "user" && role !== "assistant") return [];
    const text = role === "user" && typeof entry.text === "string"
      ? entry.text.trim()
      : Array.isArray(entry.content)
        ? entry.content
            .flatMap(part => isRecord(part) && part.type === "text" && typeof part.text === "string" ? [part.text] : [])
            .join("\n")
            .trim()
        : "";
    if (!text) return [];
    return [{ id: typeof entry.id === "string" ? entry.id : `${role}-${index}`, role, text } satisfies OpenCodeConversationMessage];
  });
}

/** Lists normalized messages for the requested OpenCode session. */
export async function listOpenCodeMessages(sessionID: string) {
  const payload = await requestOpenCode<unknown>(`/api/session/${encodeURIComponent(sessionID)}/message?order=asc`);
  return mapOpenCodeMessages(payload);
}

/**
 * Waits for session completion. Older embedded builds return 503 for their documented
 * wait endpoint, so the gateway falls back to bounded server-side message polling rather
 * than claiming a generated response before OpenCode has returned one.
 */
export async function waitForOpenCodeSession(sessionID: string, expectedAssistantMessages = 1, timeoutMs = getOpenCodeMessagePollTimeoutMs()) {
  try {
    await requestOpenCode<void>(`/api/session/${encodeURIComponent(sessionID)}/wait`, { method: "POST" });
    return;
  } catch (error) {
    if (!shouldPollOpenCodeMessages(error)) throw error;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const assistantCount = (await listOpenCodeMessages(sessionID)).filter(message => message.role === "assistant").length;
    if (assistantCount >= expectedAssistantMessages) return;
    await new Promise(resolve => setTimeout(resolve, opencodeMessagePollIntervalMs));
  }
  throw new OpenCodeGatewayError("OpenCode did not return the expected assistant response before the server-side wait timeout.", 504);
}

/** Filters runtime permission data to requests that belong to the specified session. */
export function mapOpenCodePermissions(payload: unknown, sessionID: string): OpenCodePermissionRequest[] {
  const requests = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];
  return requests.flatMap((entry, index) => {
    if (!isRecord(entry) || typeof entry.id !== "string" || entry.sessionID !== sessionID || typeof entry.action !== "string") return [];
    const resources = Array.isArray(entry.resources)
      ? entry.resources.filter((resource): resource is string => typeof resource === "string")
      : [];
    const suffix = resources.length > 0 ? ` · ${resources.join(", ")}` : ` #${index + 1}`;
    return [{ id: entry.id, label: `${entry.action}${suffix}` } satisfies OpenCodePermissionRequest];
  });
}

/** Lists pending permission requests associated with a runtime session. */
export async function listOpenCodePermissions(sessionID: string) {
  const payload = await requestOpenCode<unknown>("/api/permission/request");
  return mapOpenCodePermissions(payload, sessionID);
}

/** Submits a server-authorized reply to one pending OpenCode permission request. */
export async function replyToOpenCodePermission(sessionID: string, requestID: string, reply: "once" | "always" | "reject", message?: string) {
  await requestOpenCode<void>(`/api/session/${encodeURIComponent(sessionID)}/permission/${encodeURIComponent(requestID)}/reply`, {
    method: "POST",
    body: JSON.stringify({ reply, ...(message ? { message } : {}) }),
  });
}
