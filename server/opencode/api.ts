import { embeddedOpenCodeStatus } from "./embeddedRuntime.js";

type JsonRecord = Record<string, unknown>;

export type OpenCodeModel = {
  id: string;
  providerID: string;
  name: string;
  variant?: string;
  supportsTools: boolean;
};

export type OpenCodeConversationMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type OpenCodePermissionRequest = {
  id: string;
  label: string;
};

export type OpenCodeSession = {
  id: string;
};

export class OpenCodeGatewayError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "OpenCodeGatewayError";
  }
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

export async function listOpenCodeModels() {
  const payload = await requestOpenCode<unknown>("/api/model");
  return mapOpenCodeModels(payload);
}

export type OpenCodeModelSelection = Pick<OpenCodeModel, "id" | "providerID" | "variant">;

export async function createOpenCodeSession(model?: OpenCodeModelSelection) {
  const payload = await requestOpenCode<unknown>("/api/session", {
    method: "POST",
    body: JSON.stringify({
      ...(model ? { model } : {}),
      location: { directory: process.env.OPENCODE_WORKSPACE_DIR?.trim() || process.cwd() },
    }),
  });
  const session = unwrapData(payload);
  if (!isRecord(session) || typeof session.id !== "string") throw new OpenCodeGatewayError("OpenCode did not return a valid session.");
  return { id: session.id } satisfies OpenCodeSession;
}

export async function promptOpenCodeSession(sessionID: string, text: string) {
  const payload = await requestOpenCode<unknown>(`/api/session/${encodeURIComponent(sessionID)}/prompt`, {
    method: "POST",
    body: JSON.stringify({ prompt: { text }, delivery: "queue" }),
  });
  return unwrapData(payload);
}

export async function waitForOpenCodeSession(sessionID: string) {
  await requestOpenCode<void>(`/api/session/${encodeURIComponent(sessionID)}/wait`, { method: "POST" });
}

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

export async function listOpenCodeMessages(sessionID: string) {
  const payload = await requestOpenCode<unknown>(`/api/session/${encodeURIComponent(sessionID)}/message?order=asc`);
  return mapOpenCodeMessages(payload);
}

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

export async function listOpenCodePermissions(sessionID: string) {
  const payload = await requestOpenCode<unknown>("/api/permission/request");
  return mapOpenCodePermissions(payload, sessionID);
}

export async function replyToOpenCodePermission(sessionID: string, requestID: string, reply: "once" | "always" | "reject", message?: string) {
  await requestOpenCode<void>(`/api/session/${encodeURIComponent(sessionID)}/permission/${encodeURIComponent(requestID)}/reply`, {
    method: "POST",
    body: JSON.stringify({ reply, ...(message ? { message } : {}) }),
  });
}
