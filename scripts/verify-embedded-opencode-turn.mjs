import assert from "node:assert/strict";
import { buildAgentWorkspacePrompt } from "../server/engines/router.ts";
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

const sections = ["programming", "presentations", "mind"];
const timeoutMs = 90_000;
const ownerId = Number.parseInt(process.env.OPENCODE_SMOKE_OWNER_ID ?? "0", 10);
const sessionIds = [];
const statistics = {
  sessionsCreated: 0,
  promptAdmissions: 0,
  assistantTextResponses: 0,
  providerPendingResponses: 0,
  sessionsDeletedWith404: 0,
};

async function withinTimeout(promise, label, limitMs = timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${limitMs}ms.`)), limitMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

try {
  assert.ok(Number.isInteger(ownerId) && ownerId >= 0, "OPENCODE_SMOKE_OWNER_ID must be a non-negative integer when supplied.");
  const runtime = await startEmbeddedOpenCodeRuntime();
  assert.equal(runtime.health, "healthy", runtime.detail);

  const models = await listOpenCodeModels();
  const model = models.find(candidate => candidate.providerID === "opencode") ?? models[0];
  assert.ok(model, "OpenCode reported no discovered enabled model.");

  const results = [];
  for (const section of sections) {
    const session = await createOpenCodeSession({ id: model.id, providerID: model.providerID, variant: model.variant });
    sessionIds.push(session.id);
    statistics.sessionsCreated += 1;

    const text = `Integration health-check for ${section}. Do not call tools and do not change files. Reply with exactly: OSAMAH_${section.toUpperCase()}_READY`;
    const prompt = await buildAgentWorkspacePrompt(ownerId, section, text);
    assert.match(prompt, new RegExp(`Selected section: ${section}\\.`));
    assert.match(prompt, /\[OSAMAH SERVER CONTEXT\]/);

    await withinTimeout(promptOpenCodeSession(session.id, prompt), `${section} prompt admission`);
    statistics.promptAdmissions += 1;
    let responsePending = false;
    try {
      await withinTimeout(waitForOpenCodeSession(session.id), `${section} agent completion`, timeoutMs + 5_000);
    } catch (error) {
      if (isOpenCodeResponsePending(error)) responsePending = true;
      else throw error;
    }
    const messages = await listOpenCodeMessages(session.id);
    const assistant = messages.filter(message => message.role === "assistant").at(-1);
    if (assistant?.text) statistics.assistantTextResponses += 1;
    if (responsePending) statistics.providerPendingResponses += 1;

    results.push({
      section,
      promptAccepted: true,
      response: assistant?.text ? "assistant-text" : responsePending ? "provider-pending" : "completed-without-text",
    });
  }

} finally {
  const cleanup = await Promise.allSettled(sessionIds.map(sessionID => deleteOpenCodeSession(sessionID)));
  const cleanupFailure = cleanup.find(result => result.status === "rejected");
  if (cleanupFailure?.status === "rejected") throw cleanupFailure.reason;
  for (const sessionID of sessionIds) {
    try {
      await listOpenCodeMessages(sessionID);
      throw new Error("A verification session remained readable after deletion.");
    } catch (error) {
      if (!(error instanceof OpenCodeGatewayError) || error.status !== 404) throw error;
      statistics.sessionsDeletedWith404 += 1;
    }
  }
  await stopEmbeddedOpenCodeRuntime();
}

assert.equal(statistics.sessionsCreated, sections.length, "The verifier did not create one session per section.");
assert.equal(statistics.promptAdmissions, sections.length, "The verifier did not confirm every prompt admission.");
assert.equal(statistics.sessionsDeletedWith404, sections.length, "The verifier did not confirm every cleanup through 404.");
console.log(JSON.stringify({
  promptAdmissionVerified: true,
  sectionCount: sections.length,
  responseCounts: {
    assistantText: statistics.assistantTextResponses,
    providerPending: statistics.providerPendingResponses,
  },
  cleanup: { deletedWith404: statistics.sessionsDeletedWith404 },
}, null, 2));
process.exit(0);
