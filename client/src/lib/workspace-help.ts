/**
 * Represents the visible availability state of the live engine-status section
 * inside the workspace help panel.
 */
export type WorkspaceHelpEnginePhase = "loading" | "error" | "empty" | "ready";

/**
 * Maps query state to one mutually exclusive help-panel state.
 * Loading always wins so a stale error cannot replace the initial progress cue.
 */
export function getWorkspaceHelpEnginePhase(input: {
  isLoading: boolean;
  isError: boolean;
  engineCount: number;
}): WorkspaceHelpEnginePhase {
  if (input.isLoading) return "loading";
  if (input.isError) return "error";
  if (input.engineCount === 0) return "empty";
  return "ready";
}
