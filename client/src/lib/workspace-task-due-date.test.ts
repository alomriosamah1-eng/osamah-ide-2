import { describe, expect, it } from "vitest";
import { canSaveWorkspaceTaskDueDate, getWorkspaceTaskDueDateInput, parseWorkspaceTaskDueDate } from "./workspace-task-due-date";

describe("workspace task due date helpers", () => {
  it("preserves a valid local calendar day for the date input and outgoing deadline", () => {
    expect(getWorkspaceTaskDueDateInput(new Date(2026, 7, 26))).toBe("2026-08-26");
    const parsed = parseWorkspaceTaskDueDate("2026-08-26");
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(7);
    expect(parsed?.getDate()).toBe(26);
    expect(parsed?.getHours()).toBe(0);
  });

  it("permits a changed or cleared date but rejects invalid, unchanged, and concurrent saves", () => {
    const initialDueAt = new Date(2026, 7, 26);
    expect(canSaveWorkspaceTaskDueDate({ initialDueAt, draftDate: "2026-08-27", isSaving: false })).toBe(true);
    expect(canSaveWorkspaceTaskDueDate({ initialDueAt, draftDate: "", isSaving: false })).toBe(true);
    expect(canSaveWorkspaceTaskDueDate({ initialDueAt, draftDate: "2026-08-26", isSaving: false })).toBe(false);
    expect(canSaveWorkspaceTaskDueDate({ initialDueAt, draftDate: "2026-02-30", isSaving: false })).toBe(false);
    expect(canSaveWorkspaceTaskDueDate({ initialDueAt, draftDate: "2026-08-27", isSaving: true })).toBe(false);
  });
});
