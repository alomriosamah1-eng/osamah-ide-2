import { describe, expect, it } from "vitest";
import { canCreateWorkspaceTask } from "./workspace-task-create";

describe("canCreateWorkspaceTask", () => {
  it("allows a titled task without requiring a project", () => {
    expect(canCreateWorkspaceTask({ title: "مراجعة العقد", isSubmitting: false })).toBe(true);
  });

  it("rejects whitespace-only titles and concurrent submissions", () => {
    expect(canCreateWorkspaceTask({ title: "   ", isSubmitting: false })).toBe(false);
    expect(canCreateWorkspaceTask({ title: "مراجعة العقد", isSubmitting: true })).toBe(false);
  });
});
