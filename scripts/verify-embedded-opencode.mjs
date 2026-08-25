import assert from "node:assert/strict";
import {
  embeddedOpenCodeStatus,
  startEmbeddedOpenCodeRuntime,
  stopEmbeddedOpenCodeRuntime,
} from "../server/opencode/embeddedRuntime.ts";

try {
  const status = await startEmbeddedOpenCodeRuntime();
  assert.equal(status.sourceAvailable, true, "The vendored OpenCode source was not found.");
  assert.equal(status.health, "healthy", status.detail);
  console.log(JSON.stringify(status, null, 2));
} finally {
  stopEmbeddedOpenCodeRuntime();
  const finalStatus = await embeddedOpenCodeStatus();
  console.log(JSON.stringify({ phaseAfterStop: finalStatus.phase }, null, 2));
}
