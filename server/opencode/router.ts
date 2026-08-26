/**
 * @fileoverview OpenCode status and session contract. Read-only evidence remains public for
 * configuration visibility; every stateful session operation requires a local account session,
 * a healthy loopback runtime, and injects server-owned workspace context.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { buildAgentWorkspacePrompt, type AgentWorkspaceSection } from "../engines/router";
import { embeddedOpenCodeStatus, readEmbeddedOpenCodePackage } from "./embeddedRuntime.js";
import {
  createOpenCodeSession,
  findDiscoveredOpenCodeModel,
  listOpenCodeMessages,
  listOpenCodeModels,
  listOpenCodePermissions,
  OpenCodeGatewayError,
  isOpenCodeResponsePending,
  promptOpenCodeSession,
  replyToOpenCodePermission,
  waitForOpenCodeSession,
} from "./api.js";
import { isOpenCodeExecutionDisabled } from "./policy.js";

const modelSelection = z.object({
  id: z.string().min(1).max(256),
  providerID: z.string().min(1).max(256),
  variant: z.string().min(1).max(256).optional(),
});
const workspaceSection = z.enum(["dashboard", "programming", "presentations", "mind", "settings"]);

function exposeGatewayError(error: unknown): never {
  if (error instanceof OpenCodeGatewayError) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: error.message });
  }
  throw error;
}

/**
 * Tool-capable session routes require the server-issued local account session
 * and a healthy loopback runtime. Deployments can explicitly disable execution
 * with `OPENCODE_EMBEDDED_EXECUTION_ENABLED=0`; browser data is never trusted
 * as the agent's workspace context.
 */
const openCodeExecutionProcedure = protectedProcedure.use(async ({ next }) => {
  if (isOpenCodeExecutionDisabled()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "OpenCode session execution is disabled by the server-side policy.",
    });
  }

  const runtime = await embeddedOpenCodeStatus();
  if (runtime.health !== "healthy") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "OpenCode embedded runtime is not healthy. Start the server-side runtime before creating a session.",
    });
  }

  return next();
});

/**
 * Read-only runtime evidence and protected session operations. Startup and
 * provider credentials remain outside browser-initiated RPC calls.
 */
/** Gateway contract exposing status/models and policy-gated OpenCode session operations. */
export const openCodeRouter = router({
  status: publicProcedure.query(async () => embeddedOpenCodeStatus()),
  source: publicProcedure.query(async () => readEmbeddedOpenCodePackage()),
  models: publicProcedure.query(async () => listOpenCodeModels().catch(exposeGatewayError)),
  session: router({
    create: openCodeExecutionProcedure.input(z.object({ model: modelSelection })).mutation(async ({ input }) => {
      try {
        const discovered = await listOpenCodeModels();
        const model = findDiscoveredOpenCodeModel(discovered, input.model);
        if (!model) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "The selected OpenCode model is no longer enabled by the embedded runtime.",
          });
        }
        return await createOpenCodeSession({ id: model.id, providerID: model.providerID, variant: model.variant });
      } catch (error) {
        return exposeGatewayError(error);
      }
    }),
    prompt: openCodeExecutionProcedure.input(z.object({ sessionID: z.string().min(1), text: z.string().trim().min(1).max(32_000), section: workspaceSection })).mutation(async ({ ctx, input }) => {
      const prompt = await buildAgentWorkspacePrompt(ctx.user.id, input.section as AgentWorkspaceSection, input.text);
      return promptOpenCodeSession(input.sessionID, prompt).catch(exposeGatewayError);
    }),
    send: openCodeExecutionProcedure.input(z.object({ sessionID: z.string().min(1), text: z.string().trim().min(1).max(32_000), section: workspaceSection })).mutation(async ({ ctx, input }) => {
      try {
        const prompt = await buildAgentWorkspacePrompt(ctx.user.id, input.section as AgentWorkspaceSection, input.text);
        const initialAssistantMessageCount = (await listOpenCodeMessages(input.sessionID)).filter(message => message.role === "assistant").length;
        await promptOpenCodeSession(input.sessionID, prompt);
        let pending = false;
        try {
          await waitForOpenCodeSession(input.sessionID, initialAssistantMessageCount + 1);
        } catch (error) {
          if (isOpenCodeResponsePending(error)) pending = true;
          else throw error;
        }
        const [messages, permissions] = await Promise.all([
          listOpenCodeMessages(input.sessionID),
          listOpenCodePermissions(input.sessionID),
        ]);
        return { messages, permissions, pending };
      } catch (error) {
        return exposeGatewayError(error);
      }
    }),
    wait: openCodeExecutionProcedure.input(z.object({ sessionID: z.string().min(1) })).mutation(async ({ input }) => {
      return waitForOpenCodeSession(input.sessionID).catch(exposeGatewayError);
    }),
    messages: openCodeExecutionProcedure.input(z.object({ sessionID: z.string().min(1) })).query(async ({ input }) => {
      return listOpenCodeMessages(input.sessionID).catch(exposeGatewayError);
    }),
    permissions: openCodeExecutionProcedure.input(z.object({ sessionID: z.string().min(1) })).query(async ({ input }) => {
      return listOpenCodePermissions(input.sessionID).catch(exposeGatewayError);
    }),
    replyPermission: openCodeExecutionProcedure.input(z.object({
      sessionID: z.string().min(1),
      requestID: z.string().min(1),
      reply: z.enum(["once", "always", "reject"]),
      message: z.string().trim().max(2_000).optional(),
    })).mutation(async ({ input }) => {
      return replyToOpenCodePermission(input.sessionID, input.requestID, input.reply, input.message).catch(exposeGatewayError);
    }),
  }),
});
