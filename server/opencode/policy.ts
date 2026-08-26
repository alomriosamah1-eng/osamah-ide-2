/**
 * @fileoverview Shared server-only execution policy for the embedded OpenCode runtime.
 * The default is enabled when a healthy runtime and discovered model exist; deployments
 * can stop all stateful OpenCode calls explicitly with one environment switch.
 */

/** Returns true only when the deployment explicitly switches OpenCode execution off. */
export function isOpenCodeExecutionDisabled(policyValue = process.env.OPENCODE_EMBEDDED_EXECUTION_ENABLED) {
  return policyValue === "0";
}
