/** Decides whether a task description differs enough to warrant a server update. */
export function canSaveWorkspaceTaskDescription({
  initialDescription,
  draftDescription,
  isSaving,
}: {
  initialDescription: string | null;
  draftDescription: string;
  isSaving: boolean;
}): boolean {
  if (isSaving) return false;
  return draftDescription.trim() !== (initialDescription ?? "").trim();
}
