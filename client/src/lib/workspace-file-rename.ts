/** @fileoverview Pure no-op and contract guard for renaming a server-backed workspace item. */

export type WorkspaceFileRenamePayload = { path: string; name: string };

function normalizePath(value: string) {
  return value.trim().replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/{2,}/g, "/");
}

/** Returns a normalized changed path and derived name, or null when saving should be blocked. */
export function getWorkspaceFileRenamePayload(input: {
  initialPath: string;
  path: string;
  isSubmitting: boolean;
}): WorkspaceFileRenamePayload | null {
  if (input.isSubmitting) return null;

  const path = normalizePath(input.path);
  const initialPath = normalizePath(input.initialPath);
  const segments = path.split("/");
  const name = segments.at(-1) ?? "";
  const hasTraversal = segments.some(segment => segment === "." || segment === "..");

  if (!path || path === "." || hasTraversal || path.length > 1024 || !name || name.length > 255 || path === initialPath) return null;

  return { path, name };
}
