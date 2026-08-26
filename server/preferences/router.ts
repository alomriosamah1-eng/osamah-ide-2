/**
 * @fileoverview Authenticated tRPC contract for the active account's UI preferences.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import { getPreferences, updatePreferences } from "./db.js";

/** Exposes preference reads and validated partial updates strictly for `ctx.user`. */
export const preferencesRouter = router({
  get: protectedProcedure.query(({ ctx }) => getPreferences(ctx.user.id)),
  update: protectedProcedure
    .input(z.object({
      language: z.enum(["ar", "en"]).optional(),
      theme: z.enum(["dark", "light"]).optional(),
      emailNotifications: z.boolean().optional(),
      desktopNotifications: z.boolean().optional(),
      agentMode: z.enum(["guided", "review", "manual"]).optional(),
    }))
    .mutation(({ ctx, input }) => updatePreferences(ctx.user.id, input)),
});
