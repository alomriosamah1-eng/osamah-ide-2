import { describe, expect, it } from "vitest";
import { canSaveWorkspaceTaskTitle } from "./workspace-task-title-edit";

describe("canSaveWorkspaceTaskTitle", () => {
  it("allows a changed non-empty title when no save is active", () => {
    expect(canSaveWorkspaceTaskTitle({ initialTitle: "مهمة أولى", draftTitle: "مهمة محدّثة", isSaving: false })).toBe(true);
  });

  it("rejects a blank, unchanged, or concurrently saving title", () => {
    expect(canSaveWorkspaceTaskTitle({ initialTitle: "مهمة", draftTitle: "   ", isSaving: false })).toBe(false);
    expect(canSaveWorkspaceTaskTitle({ initialTitle: "مهمة", draftTitle: " مهمة ", isSaving: false })).toBe(false);
    expect(canSaveWorkspaceTaskTitle({ initialTitle: "مهمة", draftTitle: "مهمة محدّثة", isSaving: true })).toBe(false);
  });
});
