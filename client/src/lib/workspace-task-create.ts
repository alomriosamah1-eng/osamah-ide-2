/**
 * @fileoverview Pure validation for task creation from the workspace dashboard.
 * The server accepts an optional project reference, while this helper keeps the
 * client from submitting an empty title or a duplicated in-flight mutation.
 */

/** Returns whether a dashboard task draft can be submitted to the owned API. */
export function canCreateWorkspaceTask(input: { title: string; isSubmitting: boolean }): boolean {
  return input.title.trim().length > 0 && !input.isSubmitting;
}
