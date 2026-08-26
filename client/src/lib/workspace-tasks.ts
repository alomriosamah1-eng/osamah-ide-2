/**
 * @fileoverview Pure view-state helpers for the account-scoped workspace task board.
 * They keep loading and mutation messaging honest without inventing task records.
 */

export type WorkspaceTaskStatus = "todo" | "in_progress" | "done";
export type WorkspaceTaskBoardPhase = "loading" | "error" | "empty" | "ready";
export type WorkspaceTaskStatusFilter = "all" | WorkspaceTaskStatus;
export type WorkspaceTaskFilterPhase = "ready" | "filtered_empty";

/** Derives the display phase from the real task query lifecycle. */
export function getWorkspaceTaskBoardPhase(input: { isLoading: boolean; isError: boolean; count: number }): WorkspaceTaskBoardPhase {
  if (input.isLoading) return "loading";
  if (input.isError) return "error";
  return input.count === 0 ? "empty" : "ready";
}

/** Filters already-loaded server tasks without creating client-side task records. */
export function filterWorkspaceTasks<T extends { status: WorkspaceTaskStatus }>(tasks: readonly T[], filter: WorkspaceTaskStatusFilter): T[] {
  return filter === "all" ? [...tasks] : tasks.filter((task) => task.status === filter);
}

/** Distinguishes an empty selected view from a genuinely empty task query. */
export function getWorkspaceTaskFilterPhase(input: { totalCount: number; filteredCount: number; filter: WorkspaceTaskStatusFilter }): WorkspaceTaskFilterPhase {
  return input.filter !== "all" && input.totalCount > 0 && input.filteredCount === 0 ? "filtered_empty" : "ready";
}

/** Cycles an existing task through its persisted workflow without assigning a default task. */
export function nextWorkspaceTaskStatus(status: WorkspaceTaskStatus): WorkspaceTaskStatus {
  if (status === "todo") return "in_progress";
  if (status === "in_progress") return "done";
  return "todo";
}
