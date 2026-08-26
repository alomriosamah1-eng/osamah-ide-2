import assert from "node:assert/strict";
import { createOpenCodeSession, deleteOpenCodeSession, listOpenCodeModels } from "../server/opencode/api.ts";
import { startEmbeddedOpenCodeRuntime, stopEmbeddedOpenCodeRuntime } from "../server/opencode/embeddedRuntime.ts";

let session;
let endpoint;
let result;
try {
  const runtime = await startEmbeddedOpenCodeRuntime();
  assert.equal(runtime.health, "healthy", runtime.detail);
  endpoint = runtime.endpoint;

  const models = await listOpenCodeModels();
  const model = models.find(candidate => candidate.providerID === "opencode") ?? models[0];
  assert.ok(model, "OpenCode reported no discovered enabled model.");
  session = await createOpenCodeSession({ id: model.id, providerID: model.providerID, variant: model.variant });
  assert.equal(typeof session.id, "string");
  assert.ok(session.id.length > 0);

  result = { runtime: runtime.phase, modelCount: models.length, providerID: model.providerID, modelID: model.id, sessionCreated: true, promptSent: false };
} finally {
  if (session?.id) {
    await deleteOpenCodeSession(session.id);
    const verification = await fetch(`${endpoint}/api/session/${encodeURIComponent(session.id)}`, {
      headers: { Accept: "application/json" },
    });
    assert.equal(verification.status, 404, "OpenCode verification session must be absent after cleanup.");
    result = { ...result, sessionRemoved: true, absenceVerified: true };
  }
  await stopEmbeddedOpenCodeRuntime();
}

console.log(JSON.stringify(result, null, 2));
