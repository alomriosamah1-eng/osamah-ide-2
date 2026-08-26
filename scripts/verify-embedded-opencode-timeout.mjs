import assert from "node:assert/strict";
import {
  createOpenCodeSession,
  deleteOpenCodeSession,
  isOpenCodeResponsePending,
  listOpenCodeMessages,
  listOpenCodeModels,
  OpenCodeGatewayError,
  promptOpenCodeSession,
  waitForOpenCodeSession,
} from "../server/opencode/api.ts";
import { startEmbeddedOpenCodeRuntime, stopEmbeddedOpenCodeRuntime } from "../server/opencode/embeddedRuntime.ts";

let sessionID;
let cleanupVerified = false;
const timeoutMs = 5;
const statistics = {
  sessionsCreated: 0,
  messagesBeforeWait: 0,
  messagesAfterWait: 0,
  pendingResponses: 0,
  sessionsDeletedWith404: 0,
};

try {
  const runtime = await startEmbeddedOpenCodeRuntime();
  assert.equal(runtime.health, "healthy", runtime.detail);
  const model = (await listOpenCodeModels())[0];
  assert.ok(model, "OpenCode reported no discovered enabled model.");

  const session = await createOpenCodeSession({ id: model.id, providerID: model.providerID, variant: model.variant });
  sessionID = session.id;
  statistics.sessionsCreated += 1;
  await promptOpenCodeSession(sessionID, "Integration timeout verification. Do not call tools or change files.");
  statistics.messagesBeforeWait = (await listOpenCodeMessages(sessionID)).length;

  let pending = false;
  try {
    await waitForOpenCodeSession(sessionID, 1, timeoutMs);
  } catch (error) {
    pending = isOpenCodeResponsePending(error);
    if (!pending) throw error;
  }
  assert.equal(pending, true, "The bounded wait did not produce the expected pending state.");
  statistics.pendingResponses += 1;
  statistics.messagesAfterWait = (await listOpenCodeMessages(sessionID)).length;
} finally {
  if (sessionID) {
    await deleteOpenCodeSession(sessionID);
    try {
      await listOpenCodeMessages(sessionID);
      throw new Error("The verification session was still readable after deletion.");
    } catch (error) {
      if (!(error instanceof OpenCodeGatewayError) || error.status !== 404) throw error;
      cleanupVerified = true;
      statistics.sessionsDeletedWith404 += 1;
    }
  }
  await stopEmbeddedOpenCodeRuntime();
}

assert.equal(cleanupVerified, true, "Timeout verification cleanup could not be confirmed.");
console.log(JSON.stringify({
  pendingStateVerified: true,
  cleanupVerified: true,
  statistics: {
    timeoutMs,
    ...statistics,
  },
}, null, 2));
