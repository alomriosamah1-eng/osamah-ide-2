/**
 * @fileoverview Pure view-state helpers for the account-scoped workspace task board.
 * They keep loading and mutation messaging honest without inventing task records.
 */

export type WorkspaceTaskStatus = "todo" | "in_progress" | "done";
export type WorkspaceTaskBoardPhase = "loading" | "error" | "empty" | "ready";

/** Derives the display phase from the real task query lifecycle. */
export function getWorkspaceTaskBoardPhase(input: { isLoading: boolean; isError: boolean; count: number }): WorkspaceTaskBoardPhase {
  if (input.isLoading) return "loading";
  if (input.isError) return "error";
  return input.count === 0 ? "empty" : "ready";
}

/** Cycles an existing task through its persisted workflow without assigning a default task. */
export function nextWorkspaceTaskStatus(status: WorkspaceTaskStatus): WorkspaceTaskStatus {
  if (status === "todo") return "in_progress";
  if (status === "in_progress") return "done";
  return "todo";
}
