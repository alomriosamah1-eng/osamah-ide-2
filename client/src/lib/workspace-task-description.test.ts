import { describe, expect, it } from "vitest";
import { canSaveWorkspaceTaskDescription } from "./workspace-task-description";

describe("canSaveWorkspaceTaskDescription", () => {
  it("allows adding a non-empty description to a task without one", () => {
    expect(canSaveWorkspaceTaskDescription({ initialDescription: null, draftDescription: "Clarify the acceptance criteria.", isSaving: false })).toBe(true);
  });

  it("allows clearing a saved description", () => {
    expect(canSaveWorkspaceTaskDescription({ initialDescription: "Existing description", draftDescription: "", isSaving: false })).toBe(true);
  });

  it("rejects equivalent whitespace and concurrent saves", () => {
    expect(canSaveWorkspaceTaskDescription({ initialDescription: "Existing description", draftDescription: "  Existing description  ", isSaving: false })).toBe(false);
    expect(canSaveWorkspaceTaskDescription({ initialDescription: null, draftDescription: "New description", isSaving: true })).toBe(false);
  });
});
