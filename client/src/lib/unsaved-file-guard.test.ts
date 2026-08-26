import { describe, expect, it } from "vitest";
import { shouldConfirmUnsavedFileTransition } from "./unsaved-file-guard";

describe("shouldConfirmUnsavedFileTransition", () => {
  it("does not interrupt a transition when no editor draft has changed", () => {
    expect(shouldConfirmUnsavedFileTransition({ hasActiveFile: false, hasUnsavedChanges: true, transition: "switch-file" })).toBe(false);
    expect(shouldConfirmUnsavedFileTransition({ hasActiveFile: true, hasUnsavedChanges: false, transition: "switch-project" })).toBe(false);
  });

  it("requires confirmation before each transition that replaces a changed active draft", () => {
    for (const transition of ["close-file", "switch-file", "switch-project", "create-project"] as const) {
      expect(shouldConfirmUnsavedFileTransition({ hasActiveFile: true, hasUnsavedChanges: true, transition })).toBe(true);
    }
  });
});
