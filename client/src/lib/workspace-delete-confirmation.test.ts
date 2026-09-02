import { describe, expect, it } from "vitest";
import { canConfirmWorkspaceDelete, canOpenWorkspaceDeleteConfirmation } from "./workspace-delete-confirmation";

describe("workspace delete confirmation", () => {
  it("opens only for a persisted idle resource without a conflicting form", () => {
    expect(canOpenWorkspaceDeleteConfirmation({ id: 24, isMutating: false, hasConflictingForm: false })).toBe(true);
    expect(canOpenWorkspaceDeleteConfirmation({ id: null, isMutating: false, hasConflictingForm: false })).toBe(false);
    expect(canOpenWorkspaceDeleteConfirmation({ id: 0, isMutating: false, hasConflictingForm: false })).toBe(false);
    expect(canOpenWorkspaceDeleteConfirmation({ id: 24, isMutating: true, hasConflictingForm: false })).toBe(false);
    expect(canOpenWorkspaceDeleteConfirmation({ id: 24, isMutating: false, hasConflictingForm: true })).toBe(false);
  });

  it("requires a valid target and no pending mutation before confirming", () => {
    expect(canConfirmWorkspaceDelete({ kind: "project", id: 24, label: "Workspace" }, false)).toBe(true);
    expect(canConfirmWorkspaceDelete({ kind: "file", id: 0, label: "src/app.ts" }, false)).toBe(false);
    expect(canConfirmWorkspaceDelete({ kind: "file", id: 81, label: "src/app.ts" }, true)).toBe(false);
    expect(canConfirmWorkspaceDelete(null, false)).toBe(false);
  });
});
