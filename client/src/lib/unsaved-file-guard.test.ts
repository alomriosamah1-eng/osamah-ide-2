import { describe, expect, it } from "vitest";
import { shouldConfirmUnsavedDraftTransition, shouldConfirmUnsavedFileTransition } from "./unsaved-file-guard";

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

  it("shares the same data-loss rule with all presentation slide transitions", () => {
    for (const transition of ["switch-slide", "switch-deck", "create-deck", "create-slide", "delete-deck", "delete-slide"] as const) {
      expect(shouldConfirmUnsavedDraftTransition({ hasActiveDraft: true, hasUnsavedChanges: true, transition })).toBe(true);
      expect(shouldConfirmUnsavedDraftTransition({ hasActiveDraft: true, hasUnsavedChanges: false, transition })).toBe(false);
    }
  });
});
