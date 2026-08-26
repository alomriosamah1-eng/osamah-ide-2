/**
 * @fileoverview Small session-lifecycle guard for the OpenCode chat panel.
 * It preserves a verified session identifier for subsequent prompts and never
 * creates a replacement session while one is already active.
 */

/** A session identifier returned by the server-owned OpenCode gateway. */
export type OpenCodeSessionReference = { id: string };

/** A safe, display-only representation of an OpenCode permission request. */
export type OpenCodePendingPermission = { id: string; label: string };

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
 * Polls permission requests only while an identified OpenCode session is still
 * awaiting work from the runtime. This keeps the browser from polling arbitrary
 * sessions and lets late runtime permission requests reach the owning user.
 */
export function shouldPollOpenCodeSessionPermissions(
  activeSessionId: string | null,
  awaitingAssistantResponse: boolean,
) {
  return Boolean(activeSessionId && awaitingAssistantResponse);
}

/**
 * Replaces pending permissions only when the owned-session query returned a
 * concrete list. Query failures preserve the visible requests so the user can
 * retry instead of losing a decision that has not been submitted.
 */
export function reconcileOpenCodePendingPermissions(
  previous: OpenCodePendingPermission[],
  received: OpenCodePendingPermission[] | undefined,
) {
  return received ?? previous;
}

/** Removes one permission request only after the runtime accepted its reply. */
export function removeResolvedOpenCodePermission(
  permissions: OpenCodePendingPermission[],
  requestID: string,
) {
  return permissions.filter(permission => permission.id !== requestID);
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
