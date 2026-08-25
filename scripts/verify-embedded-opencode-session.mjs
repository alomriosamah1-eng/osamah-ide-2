import assert from "node:assert/strict";
import { createOpenCodeSession, listOpenCodeModels } from "../server/opencode/api.ts";
import { startEmbeddedOpenCodeRuntime, stopEmbeddedOpenCodeRuntime } from "../server/opencode/embeddedRuntime.ts";

try {
  const runtime = await startEmbeddedOpenCodeRuntime();
  assert.equal(runtime.health, "healthy", runtime.detail);

  const models = await listOpenCodeModels();
  const session = await createOpenCodeSession();
  assert.equal(typeof session.id, "string");
  assert.ok(session.id.length > 0);

  console.log(JSON.stringify({ runtime: runtime.phase, modelCount: models.length, sessionID: session.id }, null, 2));
} finally {
  await stopEmbeddedOpenCodeRuntime();
}
