import { describe, expect, it } from "vitest";
import { canSaveWorkspaceTaskProject, parseWorkspaceTaskProjectId } from "./workspace-task-project";

describe("workspace task project editor", () => {
  it("parses the explicit general-task option as null", () => {
    expect(parseWorkspaceTaskProjectId("")).toBeNull();
    expect(parseWorkspaceTaskProjectId("12")).toBe(12);
  });

  it("allows assigning a different owned project or clearing an existing assignment", () => {
    expect(canSaveWorkspaceTaskProject({ initialProjectId: null, draftProjectId: "12", isSaving: false })).toBe(true);
    expect(canSaveWorkspaceTaskProject({ initialProjectId: 12, draftProjectId: "", isSaving: false })).toBe(true);
  });

  it("rejects unchanged, malformed, and concurrent saves", () => {
    expect(canSaveWorkspaceTaskProject({ initialProjectId: 12, draftProjectId: "12", isSaving: false })).toBe(false);
    expect(canSaveWorkspaceTaskProject({ initialProjectId: null, draftProjectId: "not-a-project", isSaving: false })).toBe(false);
    expect(canSaveWorkspaceTaskProject({ initialProjectId: 12, draftProjectId: "13", isSaving: true })).toBe(false);
  });
});
