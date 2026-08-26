/** Describes an editor transition that could replace the active file draft. */
export type UnsavedFileTransition = "close-file" | "switch-file" | "switch-project" | "create-project";

/**
 * Returns whether the user must explicitly confirm an editor transition.
 *
 * A confirmation is only necessary when a real active file has content that
 * differs from its last persisted value and the transition replaces that
 * editor context. The helper is pure so all transition callers share the
 * same data-loss rule.
 */
export function shouldConfirmUnsavedFileTransition({
  hasActiveFile,
  hasUnsavedChanges,
  transition,
}: {
  hasActiveFile: boolean;
  hasUnsavedChanges: boolean;
  transition: UnsavedFileTransition;
}): boolean {
  return hasActiveFile && hasUnsavedChanges && transition !== undefined;
}
