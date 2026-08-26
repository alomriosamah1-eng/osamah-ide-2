/** Converts the select value used by the task-project editor into the nullable server contract value. */
export function parseWorkspaceTaskProjectId(draftProjectId: string): number | null {
  if (draftProjectId === "") return null;
  const projectId = Number(draftProjectId);
  return Number.isSafeInteger(projectId) && projectId > 0 ? projectId : null;
}

/** Returns whether a project reassignment is valid, changed, and not already being saved. */
export function canSaveWorkspaceTaskProject({
  initialProjectId,
  draftProjectId,
  isSaving,
}: {
  initialProjectId: number | null | undefined;
  draftProjectId: string;
  isSaving: boolean;
}): boolean {
  if (isSaving) return false;
  if (draftProjectId !== "" && parseWorkspaceTaskProjectId(draftProjectId) === null) return false;
  return parseWorkspaceTaskProjectId(draftProjectId) !== (initialProjectId ?? null);
}
