/**
 * @fileoverview Protected engine-readiness and server-context contract. It reports only
 * observed source/runtime/model state and builds OpenCode context from account-owned data;
 * browser-provided workspace context is never trusted for execution.
 */

import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { listOpenCodeModels } from "../opencode/api";
import { embeddedOpenCodeStatus } from "../opencode/embeddedRuntime";
import { embeddedPresentonStatus } from "../presenton/embeddedRuntime";
import { listPresentations } from "../presentations/db";
import { listKnowledgeItems } from "../secondbrain/db";
import { embeddedTheiaStatus } from "../theia/embeddedRuntime";
import { listProjects, listTasks } from "../workspace/db";

const sectionInput = z.enum(["dashboard", "programming", "presentations", "mind", "settings"]);
/** Sections that can be represented in a server-built agent workspace prompt. */
export type AgentWorkspaceSection = z.infer<typeof sectionInput>;

async function exists(path: string) {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function secondBrainEngineStatus() {
  const sourceRoot = resolve(process.cwd(), "third_party/second-brain");
  const [sourceAvailable, extractorAvailable] = await Promise.all([
    exists(resolve(sourceRoot, "src/secondbrain/tasks.py")),
    exists(resolve(process.cwd(), "scripts/secondbrain-extract-tasks.py")),
  ]);

  return {
    id: "second-brain" as const,
    name: "Second Brain",
    sourceAvailable,
    status: sourceAvailable && extractorAvailable ? "available" as const : "unavailable" as const,
    agentReady: sourceAvailable && extractorAvailable,
    capabilities: sourceAvailable && extractorAvailable ? ["knowledge", "search", "task-extraction"] : [],
    detail: sourceAvailable && extractorAvailable
      ? "The embedded task extractor is available through the server-owned Python adapter."
      : "The embedded Second Brain source or its server-owned task-extraction adapter is unavailable.",
  };
}

/** Aggregates truthful readiness state for the approved embedded engine sources. */
export async function buildEngineStatus() {
  const [openCode, theia, presenton, secondBrain] = await Promise.all([
    embeddedOpenCodeStatus(),
    embeddedTheiaStatus(),
    embeddedPresentonStatus(),
    secondBrainEngineStatus(),
  ]);

  const modelCount = openCode.health === "healthy"
    ? await listOpenCodeModels().then(models => models.length).catch(() => 0)
    : 0;
  const executionEnabled = process.env.OPENCODE_EMBEDDED_EXECUTION_ENABLED === "1";

  return [
    {
      id: "opencode" as const,
      name: "OpenCode",
      sourceAvailable: openCode.sourceAvailable,
      status: openCode.health === "healthy" && modelCount > 0 && executionEnabled
        ? "ready" as const
        : openCode.health === "healthy" ? "needs-configuration" as const : "unavailable" as const,
      agentReady: openCode.health === "healthy" && modelCount > 0 && executionEnabled,
      capabilities: openCode.health === "healthy" ? ["sessions", "model-discovery"] : [],
      detail: openCode.health !== "healthy"
        ? openCode.detail
        : modelCount === 0
          ? "OpenCode is healthy, but no enabled model has been discovered."
          : !executionEnabled
            ? "OpenCode discovered enabled models, but server-side execution is disabled."
            : "OpenCode is healthy, has an enabled model, and server-side execution is enabled.",
      modelCount,
    },
    {
      id: "theia" as const,
      name: "Eclipse Theia",
      sourceAvailable: theia.sourceAvailable,
      status: theia.health === "healthy" ? "ready" as const : theia.applicationBuilt ? "stopped" as const : "build-required" as const,
      agentReady: theia.health === "healthy",
      capabilities: theia.health === "healthy" ? ["browser-ide"] : [],
      detail: theia.detail,
    },
    {
      id: "presenton" as const,
      name: "Presenton",
      sourceAvailable: presenton.sourceAvailable,
      status: presenton.health === "healthy" && presenton.generationEnabled
        ? "ready" as const
        : presenton.health === "healthy" ? "needs-configuration" as const : "unavailable" as const,
      agentReady: presenton.health === "healthy" && presenton.generationEnabled,
      capabilities: presenton.health === "healthy" ? ["presentation-api"] : [],
      detail: presenton.detail,
    },
    secondBrain,
  ];
}

/** Builds a server-owned prompt prefix with account counts and observed engine readiness. */
export async function buildAgentWorkspacePrompt(ownerId: number, section: AgentWorkspaceSection, text: string) {
  const [engines, projects, tasks, knowledgeItems, presentations] = await Promise.all([
    buildEngineStatus(),
    listProjects(ownerId),
    listTasks(ownerId),
    listKnowledgeItems(ownerId),
    listPresentations(ownerId),
  ]);
  const engineSummary = engines.map(engine => `${engine.id}=${engine.agentReady ? "ready" : engine.status}`).join(", ");

  return [
    "[OSAMAH SERVER CONTEXT]",
    `Selected section: ${section}.`,
    `Owned workspace counts: projects=${projects.length}, tasks=${tasks.length}, knowledgeItems=${knowledgeItems.length}, presentations=${presentations.length}.`,
    `Embedded engine states: ${engineSummary}.`,
    "Use only capabilities reported ready. Do not claim that an unavailable or unconfigured engine executed an action.",
    "[/OSAMAH SERVER CONTEXT]",
    "",
    text,
  ].join("\n");
}

/** Protected status and read-only context endpoints consumed by the agent panel. */
export const enginesRouter = router({
  status: protectedProcedure.query(async () => ({ engines: await buildEngineStatus() })),
  context: protectedProcedure.input(z.object({ section: sectionInput })).query(async ({ ctx, input }) => {
    const [engines, projects, tasks, knowledgeItems, presentations] = await Promise.all([
      buildEngineStatus(),
      listProjects(ctx.user.id),
      listTasks(ctx.user.id),
      listKnowledgeItems(ctx.user.id),
      listPresentations(ctx.user.id),
    ]);

    return {
      section: input.section,
      engines,
      workspace: {
        projectCount: projects.length,
        taskCount: tasks.length,
        knowledgeItemCount: knowledgeItems.length,
        presentationCount: presentations.length,
      },
      policy: {
        sendsWorkspaceDataWithPrompt: true,
        note: "Engine readiness and owned workspace counts are added server-side only when the user submits a message to an OpenCode session.",
      },
    };
  }),
});
