/**
 * @fileoverview Pure preflight guard for creating a server-backed workspace file.
 * The server still normalizes and owns the file; this only avoids invalid or duplicate submissions.
 */

export type WorkspaceFileCreatePayload = {
  projectId: number;
  path: string;
  name: string;
  kind: "file";
  language: string | null;
  content: string;
};

function normalizePath(value: string) {
  return value.trim().replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/{2,}/g, "/");
}

/** Returns a normalized create payload only when it satisfies the file contract locally. */
export function getWorkspaceFileCreatePayload(input: {
  projectId: number | null;
  path: string;
  language: string;
  isSubmitting: boolean;
}): WorkspaceFileCreatePayload | null {
  if (input.isSubmitting || !input.projectId || !Number.isInteger(input.projectId) || input.projectId < 1) return null;

  const path = normalizePath(input.path);
  const language = input.language.trim();
  const segments = path.split("/");
  const name = segments.at(-1) ?? "";
  const hasTraversal = segments.some(segment => segment === "." || segment === "..");

  if (!path || path === "." || hasTraversal || path.length > 1024 || !name || name.length > 255 || language.length > 64) return null;

  return { projectId: input.projectId, path, name, kind: "file", language: language || null, content: "" };
}
