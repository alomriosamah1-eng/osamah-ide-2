import { describe, expect, it } from "vitest";
import { mapOpenCodeMessages, mapOpenCodeModels, mapOpenCodePermissions } from "./api";

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
