/**
 * @fileoverview Pure client-side guard for the owned workspace project contract.
 * The server remains authoritative; this guard only prevents an avoidable invalid
 * or concurrent submission and normalizes optional text to explicit null values.
 */

export type WorkspaceProjectCreatePayload = {
  name: string;
  language: string | null;
  description: string | null;
};

/** Returns a normalized project payload when it satisfies the server contract. */
export function getWorkspaceProjectCreatePayload(input: {
  name: string;
  language: string;
  description: string;
  isSubmitting: boolean;
}): WorkspaceProjectCreatePayload | null {
  if (input.isSubmitting) return null;

  const name = input.name.trim();
  const language = input.language.trim();
  const description = input.description.trim();

  if (name.length === 0 || name.length > 160 || language.length > 64 || description.length > 100_000) return null;

  return {
    name,
    language: language || null,
    description: description || null,
  };
}
