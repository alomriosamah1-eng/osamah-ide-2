/**
 * @fileoverview Protected tRPC contract for persisted presentation drafts and slides.
 * It validates CRUD and ordering input only; Presenton generation remains separately
 * gated by real server-side runtime readiness and provider configuration.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requireFound } from "../workspace/access";
import {
  createPresentation,
  createPresentationSlide,
  getOwnedPresentation,
  getOwnedPresentationSlide,
  listPresentationSlides,
  listPresentations,
  removePresentation,
  removePresentationSlide,
  reorderPresentationSlides,
  updatePresentation,
  updatePresentationSlide,
} from "./db";

const id = z.number().int().positive();
const nullableText = z.string().max(100_000).nullable().optional();
const title = z.string().trim().min(1).max(240);

/** Account-scoped API for presentation records and their ordered slide children. */
export const presentationsRouter = router({
  list: protectedProcedure.query(({ ctx }) => listPresentations(ctx.user.id)),
  get: protectedProcedure.input(z.object({ id })).query(async ({ ctx, input }) => requireFound(await getOwnedPresentation(ctx.user.id, input.id), "Presentation")),
  create: protectedProcedure.input(z.object({ title })).mutation(({ ctx, input }) => createPresentation(ctx.user.id, input.title)),
  update: protectedProcedure.input(z.object({ id, title: title.optional(), status: z.enum(["draft", "generating", "ready", "failed"]).optional() }).refine(input => input.title !== undefined || input.status !== undefined, { message: "Presentation update must include at least one change." })).mutation(async ({ ctx, input }) => {
    const { id: presentationId, ...patch } = input;
    return requireFound(await updatePresentation(ctx.user.id, presentationId, patch), "Presentation");
  }),
  remove: protectedProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => requireFound(await removePresentation(ctx.user.id, input.id), "Presentation")),
  slide: router({
    list: protectedProcedure.input(z.object({ presentationId: id })).query(async ({ ctx, input }) => requireFound(await listPresentationSlides(ctx.user.id, input.presentationId), "Presentation")),
    get: protectedProcedure.input(z.object({ id })).query(async ({ ctx, input }) => requireFound(await getOwnedPresentationSlide(ctx.user.id, input.id), "Slide")),
    create: protectedProcedure.input(z.object({ presentationId: id, title: title.nullable().optional(), content: nullableText, speakerNotes: nullableText })).mutation(async ({ ctx, input }) => requireFound(await createPresentationSlide(ctx.user.id, input), "Presentation")),
    update: protectedProcedure.input(z.object({ id, title: title.nullable().optional(), content: nullableText, speakerNotes: nullableText }).refine(input => input.title !== undefined || input.content !== undefined || input.speakerNotes !== undefined, { message: "Slide update must include at least one change." })).mutation(async ({ ctx, input }) => {
      const { id: slideId, ...patch } = input;
      return requireFound(await updatePresentationSlide(ctx.user.id, slideId, patch), "Slide");
    }),
    remove: protectedProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => requireFound(await removePresentationSlide(ctx.user.id, input.id), "Slide")),
    reorder: protectedProcedure.input(z.object({ presentationId: id, orderedSlideIds: z.array(id).min(1).max(200) })).mutation(async ({ ctx, input }) => {
      const reordered = await reorderPresentationSlides(ctx.user.id, input.presentationId, input.orderedSlideIds);
      if (!reordered) throw new TRPCError({ code: "BAD_REQUEST", message: "Slide order does not match this presentation." });
      return reordered;
    }),
  }),
});
