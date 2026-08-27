/**
 * Verifies that a configured OpenCode runtime accepts a server-shaped session
 * request for one currently discovered model. It deliberately never sends a
 * prompt, then deletes the transient verification session.
 */

const endpoint = process.env.OPENCODE_EMBEDDED_ENDPOINT || "http://127.0.0.1:4096";

const modelsResponse = await fetch(`${endpoint}/api/model`, { headers: { Accept: "application/json" } });
if (!modelsResponse.ok) throw new Error(`OpenCode model discovery failed (${modelsResponse.status}).`);

const modelsPayload = await modelsResponse.json();
const models = Array.isArray(modelsPayload?.data) ? modelsPayload.data : [];
const model = models.find(candidate => (
  candidate &&
  typeof candidate.id === "string" &&
  typeof candidate.providerID === "string" &&
  candidate.enabled === true &&
  candidate.providerID === "opencode"
)) ?? models.find(candidate => (
  candidate &&
  typeof candidate.id === "string" &&
  typeof candidate.providerID === "string" &&
  candidate.enabled === true
));

if (!model) throw new Error("OpenCode reported no enabled model suitable for a verification session.");

let sessionId;
try {
  const createResponse = await fetch(`${endpoint}/api/session`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: { id: model.id, providerID: model.providerID, ...(typeof model.variant === "string" ? { variant: model.variant } : {}) },
      location: { directory: process.cwd() },
    }),
  });
  if (!createResponse.ok) throw new Error(`OpenCode session creation failed (${createResponse.status}).`);

  const createdPayload = await createResponse.json();
  sessionId = createdPayload?.data?.id ?? createdPayload?.id;
  if (typeof sessionId !== "string" || !sessionId) throw new Error("OpenCode session creation returned no identifier.");

  console.log(JSON.stringify({
    verified: true,
    providerID: model.providerID,
    modelID: model.id,
    sessionCreated: true,
    promptSent: false,
  }));
} finally {
  if (sessionId) {
    const cleanupLocation = new URL(`${endpoint}/session/${encodeURIComponent(sessionId)}`);
    cleanupLocation.searchParams.set("directory", process.cwd());
    const deletion = await fetch(cleanupLocation, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    if (!deletion.ok) throw new Error(`OpenCode verification session cleanup failed (${deletion.status}).`);

    const verifyAbsence = await fetch(`${endpoint}/api/session/${encodeURIComponent(sessionId)}`, {
      headers: { Accept: "application/json" },
    });
    if (verifyAbsence.status !== 404) {
      throw new Error(`OpenCode verification session must return 404 after deletion, received ${verifyAbsence.status}.`);
    }
  }
}
