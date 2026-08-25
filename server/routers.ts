import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  createLocalAccount,
  getLocalAccountByEmail,
  touchLocalUser,
  updateLocalAccountPassword,
  updateLocalAccountProfile,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  createLocalSession,
  hashLocalPassword,
  hashRecoveryAnswer,
  LOCAL_SESSION_COOKIE,
  LOCAL_SESSION_MAX_AGE_MS,
  verifyLocalPassword,
  verifyRecoveryAnswer,
} from "./localAuth";
import { openCodeRouter } from "./opencode/router";
import { presentonRouter } from "./presenton/router";
import { presentationsRouter } from "./presentations/router";
import { preferencesRouter } from "./preferences/router";
import { secondBrainRouter } from "./secondbrain/router";
import { theiaRouter } from "./theia/router";
import { workspaceRouter } from "./workspace/router";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  opencode: openCodeRouter,
  presenton: presentonRouter,
  presentations: presentationsRouter,
  preferences: preferencesRouter,
  secondBrain: secondBrainRouter,
  theia: theiaRouter,
  workspace: workspaceRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    local: router({
      register: publicProcedure.input(z.object({
        name: z.string().trim().min(1).max(160),
        email: z.string().trim().email().max(320),
        password: z.string().min(8).max(256),
        recoveryQuestion: z.string().trim().min(1).max(128),
        recoveryAnswer: z.string().trim().min(1).max(256),
      })).mutation(async ({ ctx, input }) => {
        const email = input.email.toLowerCase();
        const existing = await getLocalAccountByEmail(email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "A local account already exists for this email." });
        const openId = `local:${createHash("sha256").update(email).digest("hex").slice(0, 58)}`;
        const user = await createLocalAccount({
          openId,
          name: input.name,
          email,
          passwordHash: await hashLocalPassword(input.password),
          recoveryQuestion: input.recoveryQuestion,
          recoveryAnswerHash: await hashRecoveryAnswer(input.recoveryAnswer),
        });
        ctx.res.cookie(LOCAL_SESSION_COOKIE, await createLocalSession(user.id), {
          ...getSessionCookieOptions(ctx.req),
          maxAge: LOCAL_SESSION_MAX_AGE_MS,
        });
        return { id: user.id, name: user.name, email: user.email };
      }),
      login: publicProcedure.input(z.object({
        email: z.string().trim().email().max(320),
        password: z.string().min(1).max(256),
      })).mutation(async ({ ctx, input }) => {
        const account = await getLocalAccountByEmail(input.email.toLowerCase());
        if (!account || !await verifyLocalPassword(input.password, account.account.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid local email or password." });
        }
        await touchLocalUser(account.user.id);
        ctx.res.cookie(LOCAL_SESSION_COOKIE, await createLocalSession(account.user.id), {
          ...getSessionCookieOptions(ctx.req),
          maxAge: LOCAL_SESSION_MAX_AGE_MS,
        });
        return { id: account.user.id, name: account.user.name, email: account.user.email };
      }),
      recoveryQuestion: publicProcedure.input(z.object({ email: z.string().trim().email().max(320) }))
        .query(async ({ input }) => {
          const account = await getLocalAccountByEmail(input.email.toLowerCase());
          if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Local account not found." });
          return { recoveryQuestion: account.account.recoveryQuestion };
        }),
      resetPassword: publicProcedure.input(z.object({
        email: z.string().trim().email().max(320),
        recoveryAnswer: z.string().trim().min(1).max(256),
        newPassword: z.string().min(8).max(256),
      })).mutation(async ({ ctx, input }) => {
        const account = await getLocalAccountByEmail(input.email.toLowerCase());
        if (!account || !await verifyRecoveryAnswer(input.recoveryAnswer, account.account.recoveryAnswerHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Local account recovery verification failed." });
        }
        await updateLocalAccountPassword(account.user.id, await hashLocalPassword(input.newPassword));
        ctx.res.cookie(LOCAL_SESSION_COOKIE, await createLocalSession(account.user.id), {
          ...getSessionCookieOptions(ctx.req),
          maxAge: LOCAL_SESSION_MAX_AGE_MS,
        });
        return { success: true };
      }),
      updateProfile: publicProcedure.input(z.object({
        name: z.string().trim().min(1).max(160).optional(),
        email: z.string().trim().email().max(320).optional(),
      }).refine((input) => input.name !== undefined || input.email !== undefined, {
        message: "Provide at least one profile field.",
      })).mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        try {
          return await updateLocalAccountProfile(ctx.user.id, input);
        } catch (error) {
          if (error instanceof Error && error.message === "Local email address is already in use.") {
            throw new TRPCError({ code: "CONFLICT", message: error.message });
          }
          throw error;
        }
      }),
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      ctx.res.clearCookie(LOCAL_SESSION_COOKIE, cookieOptions);
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
