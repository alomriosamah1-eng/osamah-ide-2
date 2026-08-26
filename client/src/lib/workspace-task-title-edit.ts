/**
 * @fileoverview Pure UI guard for a task-title update that is persisted through the workspace API.
 */

/** Returns whether a changed, non-empty task title may be submitted while no save is in flight. */
export function canSaveWorkspaceTaskTitle({ initialTitle, draftTitle, isSaving }: { initialTitle: string; draftTitle: string; isSaving: boolean }): boolean {
  const normalizedDraft = draftTitle.trim();
  return !isSaving && normalizedDraft.length > 0 && normalizedDraft !== initialTitle.trim();
}
