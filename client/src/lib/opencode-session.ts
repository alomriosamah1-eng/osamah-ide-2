/**
 * @fileoverview Small session-lifecycle guard for the OpenCode chat panel.
 * It preserves a verified session identifier for subsequent prompts and never
 * creates a replacement session while one is already active.
 */

/** A session identifier returned by the server-owned OpenCode gateway. */
export type OpenCodeSessionReference = { id: string };

/**
 * Keeps a failed cleanup visible as an operational blocker so a prior workspace
 * session cannot accidentally receive a prompt for the next workspace.
 */
export function isOpenCodeSessionCleanupBlocked(
  activeSessionId: string | null,
  cleanupFailed: boolean,
) {
  return Boolean(activeSessionId && cleanupFailed);
}

/**
 * Reuses an active OpenCode session or creates exactly one when no session exists.
 * The caller retains the returned identifier in its component state/ref.
 */
export async function getOrCreateOpenCodeSession(
  activeSessionId: string | null,
  createSession: () => Promise<OpenCodeSessionReference>,
) {
  if (activeSessionId) return activeSessionId;
  return (await createSession()).id;
}
