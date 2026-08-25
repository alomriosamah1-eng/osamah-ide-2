import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import { getPreferences, updatePreferences } from "./db.js";

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
