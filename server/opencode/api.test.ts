import { describe, expect, it } from "vitest";
import { OpenCodeGatewayError, buildOpenCodeSessionRemovalPath, findDiscoveredOpenCodeModel, getOpenCodeMessagePollTimeoutMs, isOpenCodeResponsePending, mapOpenCodeMessages, mapOpenCodeModels, mapOpenCodePermissions, shouldPollOpenCodeMessages } from "./api";

describe("mapOpenCodeModels", () => {
  it("keeps only real OpenCode model entries from the runtime payload", () => {
    const models = mapOpenCodeModels({
      data: [
        { id: "real-model", providerID: "configured-provider", name: "Configured model", capabilities: { tools: true } },
        { id: "missing-provider", name: "Invalid" },
      ],
    });

    expect(models).toEqual([{
      id: "real-model",
      providerID: "configured-provider",
      name: "Configured model",
      variant: undefined,
      supportsTools: true,
    }]);
  });
});

describe("OpenCode generated payload mappings", () => {
  it("falls back to bounded message polling only for the known unavailable wait endpoint", () => {
    expect(shouldPollOpenCodeMessages(new OpenCodeGatewayError("Session wait is not available yet", 503))).toBe(true);
    expect(shouldPollOpenCodeMessages(new OpenCodeGatewayError("OpenCode request failed", 503))).toBe(false);
    expect(shouldPollOpenCodeMessages(new OpenCodeGatewayError("Session wait is not available yet", 500))).toBe(false);
  });

  it("distinguishes an accepted prompt awaiting text from a gateway failure", () => {
    const pending = new OpenCodeGatewayError("OpenCode did not return the expected assistant response before the server-side wait timeout.", 504);
    expect(isOpenCodeResponsePending(pending)).toBe(true);
    expect(isOpenCodeResponsePending(new OpenCodeGatewayError("OpenCode request failed", 504))).toBe(false);
    expect(isOpenCodeResponsePending(new OpenCodeGatewayError("OpenCode did not return the expected assistant response before the server-side wait timeout.", 503))).toBe(false);
  });

  it("bounds the configured message wait while retaining a safe default", () => {
    expect(getOpenCodeMessagePollTimeoutMs()).toBe(90_000);
    expect(getOpenCodeMessagePollTimeoutMs("3000")).toBe(5_000);
    expect(getOpenCodeMessagePollTimeoutMs("120000")).toBe(120_000);
    expect(getOpenCodeMessagePollTimeoutMs("999999")).toBe(300_000);
    expect(getOpenCodeMessagePollTimeoutMs("not-a-number")).toBe(90_000);
  });

  it("uses OpenCode's documented legacy route when deleting a v2-created session", () => {
    expect(buildOpenCodeSessionRemovalPath("ses_abc", "/workspace/with space")).toBe("/session/ses_abc?directory=%2Fworkspace%2Fwith+space");
  });

  it("accepts a session selection only when it came from current runtime discovery", () => {
    const discovered = mapOpenCodeModels({
      data: [{ id: "model-a", providerID: "provider-a", name: "Model A", capabilities: { tools: true } }],
    });

    expect(findDiscoveredOpenCodeModel(discovered, { id: "model-a", providerID: "provider-a" })).toEqual(discovered[0]);
    expect(findDiscoveredOpenCodeModel(discovered, { id: "model-a", providerID: "forged-provider" })).toBeUndefined();
  });

  it("maps direct user and assistant messages while excluding non-chat events", () => {
    const messages = mapOpenCodeMessages({
      data: [
        { id: "user-1", type: "user", text: "افحص هذا الملف" },
        { id: "assistant-1", type: "assistant", content: [{ type: "reasoning", text: "لا يُعرض" }, { type: "text", text: "سأفحصه." }] },
        { id: "system-1", type: "system", text: "حدث داخلي" },
      ],
    });

    expect(messages).toEqual([
      { id: "user-1", role: "user", text: "افحص هذا الملف" },
      { id: "assistant-1", role: "assistant", text: "سأفحصه." },
    ]);
  });

  it("maps only permission requests belonging to the active session", () => {
    const permissions = mapOpenCodePermissions({
      data: [
        { id: "permission-1", sessionID: "session-a", action: "bash", resources: ["git status"] },
        { id: "permission-2", sessionID: "session-b", action: "write", resources: ["notes.md"] },
      ],
    }, "session-a");

    expect(permissions).toEqual([{ id: "permission-1", label: "bash · git status" }]);
  });
});
