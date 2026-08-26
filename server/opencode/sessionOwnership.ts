/**
 * @fileoverview In-process ownership boundary for transient OpenCode sessions.
 * A session created through the authenticated gateway is usable only by the
 * same local account for the lifetime of this server process.
 */

const sessionOwnerIDs = new Map<string, number>();

/** Records the local account that created a transient OpenCode session. */
export function registerOpenCodeSessionOwner(sessionID: string, userID: number) {
  sessionOwnerIDs.set(sessionID, userID);
}

/** Returns whether the local account owns the server-tracked transient session. */
export function isOpenCodeSessionOwnedBy(sessionID: string, userID: number) {
  return sessionOwnerIDs.get(sessionID) === userID;
}

/** Forgets a session after successful deletion or a confirmed missing-session result. */
export function releaseOpenCodeSessionOwner(sessionID: string) {
  sessionOwnerIDs.delete(sessionID);
}

/** Clears tracked owners for isolated tests; production code releases sessions individually. */
export function resetOpenCodeSessionOwnersForTest() {
  sessionOwnerIDs.clear();
}
