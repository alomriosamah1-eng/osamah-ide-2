import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

const baseUrl = (process.env.WORKSPACE_E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
let cookie = "";

function rememberCookie(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);
  for (const value of values) {
    const [pair] = value.split(";");
    if (!pair) continue;
    const separator = pair.indexOf("=");
    const cookieValue = separator === -1 ? "" : pair.slice(separator + 1);
    cookie = cookieValue ? pair : "";
  }
}

async function cookieFetch(url, options = {}) {
  const headers = new Headers(options.headers);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(url, { ...options, headers });
  rememberCookie(response);
  return response;
}

const client = createTRPCProxyClient({
  links: [httpBatchLink({ url: `${baseUrl}/api/trpc`, transformer: superjson, fetch: cookieFetch })],
});

function createIsolatedClient() {
  let isolatedCookie = "";
  const isolatedFetch = async (url, options = {}) => {
    const headers = new Headers(options.headers);
    if (isolatedCookie) headers.set("cookie", isolatedCookie);
    const response = await fetch(url, { ...options, headers });
    const values = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
    for (const value of values) {
      const [pair] = value.split(";");
      if (!pair) continue;
      const separator = pair.indexOf("=");
      isolatedCookie = separator === -1 ? "" : pair;
    }
    return response;
  };
  return createTRPCProxyClient({
    links: [httpBatchLink({ url: `${baseUrl}/api/trpc`, transformer: superjson, fetch: isolatedFetch })],
  });
}

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const accountKey = crypto.randomUUID();
const updatedEmail = `workspace-e2e-updated-${suffix}@example.invalid`;
const password = `E2e-${suffix}-Secure`;
let projectId;
let reassignmentProjectId;
let fileId;
let taskId;
let noteId;
let relatedKnowledgeId;
let knowledgeLinkId;
let presentationId;
let presentationSlideId;
let secondPresentationSlideId;
let secondBrainTaskIds = [];

try {
  const account = await client.auth.local.register.mutate({
    accountKey,
    password,
    recoveryQuestion: "اسم هذا التحقق؟",
    recoveryAnswer: "Osamah",
  });
  if (!account.id || !cookie) throw new Error("Registration did not issue a local session cookie.");
  const recoveryQuestion = await client.auth.local.recoveryQuestion.query({ accountKey });
  if (recoveryQuestion.recoveryQuestion !== "اسم هذا التحقق؟") {
    throw new Error("The local recovery question was not persisted without name or email.");
  }
  try {
    await client.auth.local.verifyRecoveryAnswer.mutate({ accountKey, recoveryAnswer: "إجابة خاطئة" });
    throw new Error("Recovery verification accepted an incorrect answer.");
  } catch (error) {
    if (error?.message === "Recovery verification accepted an incorrect answer.") throw error;
  }
  const verifiedRecovery = await client.auth.local.verifyRecoveryAnswer.mutate({ accountKey, recoveryAnswer: "Osamah" });
  if (!verifiedRecovery.verified) throw new Error("Recovery verification did not confirm the saved answer.");

  const initialPreferences = await client.preferences.get.query();
  if (initialPreferences.language !== "ar" || initialPreferences.theme !== "dark") {
    throw new Error("Default server preferences were not created as Arabic/dark.");
  }
  const updatedPreferences = await client.preferences.update.mutate({
    language: "en",
    theme: "light",
    emailNotifications: false,
    desktopNotifications: false,
    agentMode: "review",
  });
  if (updatedPreferences.language !== "en" || updatedPreferences.theme !== "light" || updatedPreferences.emailNotifications !== 0 || updatedPreferences.desktopNotifications !== 0 || updatedPreferences.agentMode !== "review") {
    throw new Error("Server preference update was not persisted.");
  }

  const nameOnlyProfile = await client.auth.local.updateProfile.mutate({
    name: "Workspace E2E Name Only",
  });
  if (nameOnlyProfile.name !== "Workspace E2E Name Only" || nameOnlyProfile.email !== null) {
    throw new Error("Local profile did not persist a single optional display name.");
  }

  const updatedProfile = await client.auth.local.updateProfile.mutate({
    name: "Workspace E2E Updated",
    email: updatedEmail,
  });
  if (updatedProfile.name !== "Workspace E2E Updated" || updatedProfile.email !== updatedEmail) {
    throw new Error("Local profile update was not persisted.");
  }

  const presentonStatus = await client.presenton.status.query();
  if (!presentonStatus.sourceAvailable || !presentonStatus.fastApiSourceAvailable) {
    throw new Error("Embedded Presenton source evidence was not available.");
  }

  const presentation = await client.presentations.create.mutate({ title: "E2E Presentation" });
  presentationId = presentation.id;
  const renamedPresentation = await client.presentations.update.mutate({ id: presentationId, title: "E2E Presentation Renamed" });
  if (renamedPresentation.title !== "E2E Presentation Renamed" || renamedPresentation.status !== "draft") {
    throw new Error("Presentation create or rename was not persisted.");
  }
  const firstSlide = await client.presentations.slide.create.mutate({
    presentationId,
    title: "First slide",
    content: "Initial slide content",
    speakerNotes: "Initial speaker notes",
  });
  presentationSlideId = firstSlide.id;
  const secondSlide = await client.presentations.slide.create.mutate({
    presentationId,
    title: "Second slide",
    content: "Second slide content",
    speakerNotes: "Second speaker notes",
  });
  secondPresentationSlideId = secondSlide.id;
  const savedSlide = await client.presentations.slide.update.mutate({ id: presentationSlideId, content: "Saved slide content", speakerNotes: "Saved speaker notes" });
  if (savedSlide.content !== "Saved slide content" || savedSlide.speakerNotes !== "Saved speaker notes") {
    throw new Error("Slide update was not persisted.");
  }
  const reorderedSlides = await client.presentations.slide.reorder.mutate({ presentationId, orderedSlideIds: [secondPresentationSlideId, presentationSlideId] });
  if (reorderedSlides.map(slide => slide.id).join(",") !== `${secondPresentationSlideId},${presentationSlideId}`) {
    throw new Error("Slide reorder was not persisted.");
  }
  await client.presentations.slide.remove.mutate({ id: secondPresentationSlideId });
  secondPresentationSlideId = undefined;
  const remainingSlides = await client.presentations.slide.list.query({ presentationId });
  if (remainingSlides.length !== 1 || remainingSlides[0].id !== presentationSlideId) {
    throw new Error("Slide deletion was not persisted.");
  }

  const project = await client.workspace.project.create.mutate({
    name: "E2E Workspace",
    description: "Created only to verify protected CRUD.",
    language: "TypeScript",
  });
  projectId = project.id;
  if (project.language !== "TypeScript" || project.description !== "Created only to verify protected CRUD.") {
    throw new Error("Project creation metadata was not persisted.");
  }

  const reassignmentProject = await client.workspace.project.create.mutate({
    name: "E2E Reassignment Target",
    description: "Created only to verify task project reassignment.",
    language: "TypeScript",
  });
  reassignmentProjectId = reassignmentProject.id;

  const updatedProject = await client.workspace.project.update.mutate({
    id: projectId,
    name: "E2E Workspace Renamed",
    language: "JavaScript",
    description: "Updated only to verify project metadata editing.",
  });
  if (updatedProject.name !== "E2E Workspace Renamed" || updatedProject.language !== "JavaScript" || updatedProject.description !== "Updated only to verify project metadata editing.") {
    throw new Error("Project metadata update was not persisted.");
  }

  const file = await client.workspace.file.create.mutate({
    projectId,
    path: "/src/main.ts",
    name: "main.ts",
    kind: "file",
    language: "TypeScript",
    content: "export const source = 'e2e';\n",
  });
  fileId = file.id;
  if (file.path !== "src/main.ts" || file.name !== "main.ts" || file.language !== "TypeScript" || file.content !== "export const source = 'e2e';") {
    throw new Error("File creation metadata was not persisted.");
  }

  const savedFile = await client.workspace.file.save.mutate({ id: fileId, content: "export const source = 'saved';\n" });
  if (savedFile.content !== "export const source = 'saved';\n") throw new Error("File save was not persisted.");

  const renamedFile = await client.workspace.file.rename.mutate({ id: fileId, path: "/src/app.ts", name: "app.ts" });
  if (renamedFile.path !== "src/app.ts" || renamedFile.name !== "app.ts") throw new Error("File rename was not persisted.");

  const task = await client.workspace.task.create.mutate({ projectId, title: "Verify protected CRUD", status: "todo" });
  taskId = task.id;
  const completedTask = await client.workspace.task.update.mutate({ id: taskId, status: "done" });
  if (completedTask.status !== "done") throw new Error("Task update was not persisted.");
  const reassignedTask = await client.workspace.task.update.mutate({ id: taskId, projectId: reassignmentProjectId });
  if (reassignedTask.projectId !== reassignmentProjectId) throw new Error("Task project reassignment was not persisted.");
  const reassignedTasks = await client.workspace.task.list.query({ projectId: reassignmentProjectId });
  if (!reassignedTasks.some(item => item.id === taskId)) throw new Error("Reassigned task was not listed under its new project.");
  const generalTask = await client.workspace.task.update.mutate({ id: taskId, projectId: null });
  if (generalTask.projectId !== null) throw new Error("Task project clearing was not persisted.");

  const [projects, files, tasks, activity] = await Promise.all([
    client.workspace.project.list.query(),
    client.workspace.file.list.query({ projectId }),
    client.workspace.task.list.query(),
    client.workspace.activity.list.query({ limit: 25 }),
  ]);
  const listedProject = projects.find(item => item.id === projectId);
  if (!listedProject) throw new Error("Created project was not listed.");
  if (listedProject.name !== "E2E Workspace Renamed" || listedProject.language !== "JavaScript" || listedProject.description !== "Updated only to verify project metadata editing.") {
    throw new Error("Project metadata update was not returned by the list contract.");
  }
  if (!files.some(item => item.id === fileId && item.path === "src/app.ts")) throw new Error("Saved file was not listed.");
  if (!tasks.some(item => item.id === taskId && item.status === "done" && item.projectId === null)) throw new Error("Updated general task was not listed.");
  if (!activity.some(item => item.entityType === "project" && item.entityId === projectId)) throw new Error("Workspace activity was not recorded.");

  const isolatedClient = createIsolatedClient();
  await isolatedClient.auth.local.register.mutate({
    accountKey: crypto.randomUUID(),
    password: `Isolated-${suffix}-Secure`,
    recoveryQuestion: "Isolated audit account?",
    recoveryAnswer: "Yes",
  });
  const isolatedProjects = await isolatedClient.workspace.project.list.query();
  if (isolatedProjects.some(item => item.id === projectId)) throw new Error("Workspace project leaked into another local account.");
  for (const [label, operation] of [
    ["project update", () => isolatedClient.workspace.project.update.mutate({ id: projectId, name: "Unauthorized" })],
    ["file save", () => isolatedClient.workspace.file.save.mutate({ id: fileId, content: "Unauthorized" })],
    ["task update", () => isolatedClient.workspace.task.update.mutate({ id: taskId, status: "todo" })],
  ]) {
    let rejected = false;
    try {
      await operation();
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error(`Workspace ${label} accepted a different local account.`);
  }

  const note = await client.secondBrain.item.create.mutate({
    title: "E2E Second Brain Note",
    kind: "note",
    content: "## Action items\n- [ ] Verify Second Brain extraction\n- [x] Do not extract this completed item",
  });
  noteId = note.id;
  const relatedKnowledge = await client.secondBrain.item.create.mutate({
    title: "E2E Knowledge Source",
    kind: "source",
    content: "A linked reference for protected search verification.",
    sourceUrl: "https://example.invalid/e2e-knowledge-source",
  });
  relatedKnowledgeId = relatedKnowledge.id;
  const searchResults = await client.secondBrain.item.search.query({ term: "e2e-knowledge-source" });
  if (!searchResults.some(item => item.id === relatedKnowledgeId)) throw new Error("Knowledge search did not return a matching owned source URL.");
  const link = await client.secondBrain.link.create.mutate({
    fromItemId: noteId,
    toItemId: relatedKnowledgeId,
    label: "verifies",
  });
  knowledgeLinkId = link.id;
  let selfLinkRejected = false;
  try {
    await client.secondBrain.link.create.mutate({ fromItemId: noteId, toItemId: noteId, label: null });
  } catch {
    selfLinkRejected = true;
  }
  if (!selfLinkRejected) throw new Error("Knowledge link creation accepted identical endpoints.");
  const renamedLink = await client.secondBrain.link.update.mutate({ id: knowledgeLinkId, label: "verified link" });
  if (renamedLink.label !== "verified link") throw new Error("Knowledge link update was not persisted.");
  const linkSearchResults = await client.secondBrain.item.search.query({ term: "verified link" });
  if (!linkSearchResults.some(item => item.id === noteId) || !linkSearchResults.some(item => item.id === relatedKnowledgeId)) {
    throw new Error("Knowledge search did not return both endpoints of a matching owned link label.");
  }
  const knowledgeLinks = await client.secondBrain.link.list.query();
  if (!knowledgeLinks.some(item => item.id === knowledgeLinkId && item.fromItemId === noteId && item.toItemId === relatedKnowledgeId)) throw new Error("Knowledge link was not listed.");
  const materialized = await client.secondBrain.materializeNoteTasks.mutate({ id: noteId });
  if (!materialized.candidates.includes("Verify Second Brain extraction")) throw new Error("Second Brain did not extract the open task candidate.");
  if (materialized.candidates.some(candidate => candidate.includes("Do not extract"))) throw new Error("Second Brain extracted a closed task candidate.");
  if (materialized.created.length !== 1) throw new Error("Second Brain did not materialize exactly one task.");
  secondBrainTaskIds = materialized.created.map(item => item.id);

  for (const [label, operation] of [
    ["presentation update", () => isolatedClient.presentations.update.mutate({ id: presentationId, title: "Unauthorized" })],
    ["presentation slide update", () => isolatedClient.presentations.slide.update.mutate({ id: presentationSlideId, title: "Unauthorized" })],
    ["knowledge item update", () => isolatedClient.secondBrain.item.update.mutate({ id: noteId, title: "Unauthorized" })],
    ["knowledge link update", () => isolatedClient.secondBrain.link.update.mutate({ id: knowledgeLinkId, label: "Unauthorized" })],
  ]) {
    let rejected = false;
    try {
      await operation();
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error(`${label} accepted a different local account.`);
  }

  await Promise.all(secondBrainTaskIds.map(id => client.workspace.task.remove.mutate({ id })));
  secondBrainTaskIds = [];
  await client.secondBrain.link.remove.mutate({ id: knowledgeLinkId });
  knowledgeLinkId = undefined;
  await client.secondBrain.item.remove.mutate({ id: relatedKnowledgeId });
  relatedKnowledgeId = undefined;
  await client.secondBrain.item.remove.mutate({ id: noteId });
  noteId = undefined;

  const removedFileId = fileId;
  await client.workspace.file.remove.mutate({ id: removedFileId });
  const filesAfterDelete = await client.workspace.file.list.query({ projectId });
  if (filesAfterDelete.some(item => item.id === removedFileId)) throw new Error("File deletion was not persisted.");
  fileId = undefined;
  await client.workspace.task.remove.mutate({ id: taskId });
  taskId = undefined;
  await client.workspace.project.remove.mutate({ id: projectId });
  projectId = undefined;
  await client.workspace.project.remove.mutate({ id: reassignmentProjectId });
  reassignmentProjectId = undefined;

  await client.presentations.remove.mutate({ id: presentationId });
  presentationId = undefined;
  presentationSlideId = undefined;

  const remainingProjects = await client.workspace.project.list.query();
  if (remainingProjects.some(item => item.name === "E2E Workspace Renamed")) throw new Error("Project deletion was not persisted.");

  await client.auth.logout.mutate();
  if (cookie) throw new Error("Logout did not clear the local session cookie.");

  console.log(JSON.stringify({
    verified: ["local-password-recovery-registration", "server-preferences-create-update", "local-profile-update", "presenton-source-status", "presentation-create-rename-delete", "presentation-slide-create-update-reorder-delete", "workspace-cross-account-isolation", "presentation-cross-account-isolation", "project-create-metadata-update-delete", "task-project-reassign-clear", "file-create-save-rename-delete", "activity-log", "second-brain-note-task-extraction", "second-brain-search", "second-brain-link-create-update-delete", "second-brain-self-link-rejected", "second-brain-cross-account-isolation"],
    cleanedWorkspaceContent: true,
  }, null, 2));
} catch (error) {
  const cleanup = [];
  if (knowledgeLinkId) cleanup.push(client.secondBrain.link.remove.mutate({ id: knowledgeLinkId }).catch(() => undefined));
  if (relatedKnowledgeId) cleanup.push(client.secondBrain.item.remove.mutate({ id: relatedKnowledgeId }).catch(() => undefined));
  if (noteId) cleanup.push(client.secondBrain.item.remove.mutate({ id: noteId }).catch(() => undefined));
  for (const id of secondBrainTaskIds) cleanup.push(client.workspace.task.remove.mutate({ id }).catch(() => undefined));
  if (fileId) cleanup.push(client.workspace.file.remove.mutate({ id: fileId }).catch(() => undefined));
  if (taskId) cleanup.push(client.workspace.task.remove.mutate({ id: taskId }).catch(() => undefined));
  if (projectId) cleanup.push(client.workspace.project.remove.mutate({ id: projectId }).catch(() => undefined));
  if (reassignmentProjectId) cleanup.push(client.workspace.project.remove.mutate({ id: reassignmentProjectId }).catch(() => undefined));
  if (presentationId) cleanup.push(client.presentations.remove.mutate({ id: presentationId }).catch(() => undefined));
  await Promise.all(cleanup);
  throw error;
}
