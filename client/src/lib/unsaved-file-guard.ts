/** Describes an editor transition that could replace the active file draft. */
export type UnsavedDraftTransition =
  | "close-file"
  | "switch-file"
  | "switch-project"
  | "create-project"
  | "switch-slide"
  | "switch-deck"
  | "create-deck"
  | "create-slide"
  | "delete-deck"
  | "delete-slide"
  | "switch-knowledge-item"
  | "create-knowledge-item"
  | "delete-knowledge-item";

/** A file-editor transition retained for the programming workspace API. */
export type UnsavedFileTransition = Extract<UnsavedDraftTransition, "close-file" | "switch-file" | "switch-project" | "create-project">;

/** A knowledge-editor transition that would replace or discard the current note draft. */
export type UnsavedKnowledgeTransition = Extract<UnsavedDraftTransition, "switch-knowledge-item" | "create-knowledge-item" | "delete-knowledge-item">;

/**
 * Returns whether the user must explicitly confirm an editor transition.
 *
 * A confirmation is only necessary when a real active file has content that
 * differs from its last persisted value and the transition replaces that
 * editor context. The helper is pure so all transition callers share the
 * same data-loss rule.
 */
export function shouldConfirmUnsavedDraftTransition({
  hasActiveDraft,
  hasUnsavedChanges,
  transition,
}: {
  hasActiveDraft: boolean;
  hasUnsavedChanges: boolean;
  transition: UnsavedDraftTransition;
}): boolean {
  return hasActiveDraft && hasUnsavedChanges && transition !== undefined;
}

/** Applies the generic draft rule to the active programming file. */
export function shouldConfirmUnsavedFileTransition({
  hasActiveFile,
  hasUnsavedChanges,
  transition,
}: {
  hasActiveFile: boolean;
  hasUnsavedChanges: boolean;
  transition: UnsavedFileTransition;
}): boolean {
  return shouldConfirmUnsavedDraftTransition({ hasActiveDraft: hasActiveFile, hasUnsavedChanges, transition });
}

/** Applies the generic draft rule to the active Second Brain knowledge item. */
export function shouldConfirmUnsavedKnowledgeTransition({
  hasActiveItem,
  hasUnsavedChanges,
  transition,
}: {
  hasActiveItem: boolean;
  hasUnsavedChanges: boolean;
  transition: UnsavedKnowledgeTransition;
}): boolean {
  return shouldConfirmUnsavedDraftTransition({ hasActiveDraft: hasActiveItem, hasUnsavedChanges, transition });
}
