export type WorkspaceDeleteTarget =
  | { kind: "project"; id: number; label: string }
  | { kind: "file"; id: number; label: string };

type WorkspaceDeleteOpenInput = {
  id: number | null | undefined;
  isMutating: boolean;
  hasConflictingForm: boolean;
};

export function canOpenWorkspaceDeleteConfirmation({ id, isMutating, hasConflictingForm }: WorkspaceDeleteOpenInput) {
  return Number.isInteger(id) && (id ?? 0) > 0 && !isMutating && !hasConflictingForm;
}

export function canConfirmWorkspaceDelete(target: WorkspaceDeleteTarget | null, isMutating: boolean) {
  return Boolean(target && Number.isInteger(target.id) && target.id > 0 && !isMutating);
}
