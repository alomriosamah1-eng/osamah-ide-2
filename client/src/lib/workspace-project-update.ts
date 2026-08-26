/**
 * @fileoverview Pure guard for partial updates to an owned workspace project.
 * The server remains authoritative; this avoids invalid, no-op, or concurrent saves.
 */

export type WorkspaceProjectMetadata = {
  name: string;
  language: string | null;
  description: string | null;
};

export type WorkspaceProjectUpdatePayload = Partial<WorkspaceProjectMetadata>;

/** Returns only changed normalized fields when they satisfy the server contract. */
export function getWorkspaceProjectUpdatePayload(input: {
  initial: WorkspaceProjectMetadata;
  name: string;
  language: string;
  description: string;
  isSubmitting: boolean;
}): WorkspaceProjectUpdatePayload | null {
  if (input.isSubmitting) return null;

  const name = input.name.trim();
  const language = input.language.trim();
  const description = input.description.trim();

  if (name.length === 0 || name.length > 160 || language.length > 64 || description.length > 100_000) return null;

  const initialName = input.initial.name.trim();
  const initialLanguage = input.initial.language?.trim() || null;
  const initialDescription = input.initial.description?.trim() || null;
  const payload: WorkspaceProjectUpdatePayload = {};

  if (name !== initialName) payload.name = name;
  if ((language || null) !== initialLanguage) payload.language = language || null;
  if ((description || null) !== initialDescription) payload.description = description || null;

  return Object.keys(payload).length > 0 ? payload : null;
}
