import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createTask, listTasks } from "../workspace/db";
import { createKnowledgeItem, createKnowledgeLink, getOwnedKnowledgeItem, hasDistinctKnowledgeLinkEndpoints, listKnowledgeItems, listKnowledgeLinks, removeKnowledgeItem, removeKnowledgeLink, searchKnowledgeItems, updateKnowledgeItem, updateKnowledgeLink } from "./db";
import { extractSecondBrainTaskCandidates } from "./extract";

const id = z.number().int().positive();
const nullableText = z.string().max(100_000).nullable().optional();
const itemInput = z.object({
  title: z.string().trim().min(1).max(240),
  kind: z.enum(["note", "source", "insight"]),
  content: nullableText,
  sourceUrl: z.string().trim().url().max(2048).nullable().optional(),
});
const linkInput = z.object({
  fromItemId: id,
  toItemId: id,
  label: z.string().trim().max(160).nullable().optional(),
});

export const secondBrainRouter = router({
  item: router({
    list: protectedProcedure.query(({ ctx }) => listKnowledgeItems(ctx.user.id)),
    search: protectedProcedure.input(z.object({ term: z.string().trim().min(1).max(240), limit: z.number().int().min(1).max(100).optional() }))
      .query(({ ctx, input }) => searchKnowledgeItems(ctx.user.id, input.term, input.limit)),
    get: protectedProcedure.input(z.object({ id })).query(async ({ ctx, input }) => {
      const item = await getOwnedKnowledgeItem(ctx.user.id, input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge item was not found." });
      return item;
    }),
    create: protectedProcedure.input(itemInput).mutation(({ ctx, input }) => createKnowledgeItem(ctx.user.id, input)),
    update: protectedProcedure.input(z.object({ id, ...itemInput.partial().shape })).mutation(async ({ ctx, input }) => {
      const { id: itemId, ...patch } = input;
      if (Object.keys(patch).length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Knowledge item update must include at least one change." });
      const item = await updateKnowledgeItem(ctx.user.id, itemId, patch);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge item was not found." });
      return item;
    }),
    remove: protectedProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => {
      const item = await removeKnowledgeItem(ctx.user.id, input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge item was not found." });
      return item;
    }),
  }),
  link: router({
    list: protectedProcedure.query(({ ctx }) => listKnowledgeLinks(ctx.user.id)),
    create: protectedProcedure.input(linkInput).mutation(async ({ ctx, input }) => {
      if (!hasDistinctKnowledgeLinkEndpoints(input)) throw new TRPCError({ code: "BAD_REQUEST", message: "Knowledge link endpoints must be different." });
      const link = await createKnowledgeLink(ctx.user.id, input);
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge link endpoints were not found." });
      return link;
    }),
    update: protectedProcedure.input(z.object({ id, label: z.string().trim().max(160).nullable() })).mutation(async ({ ctx, input }) => {
      const link = await updateKnowledgeLink(ctx.user.id, input.id, input.label);
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge link was not found." });
      return link;
    }),
    remove: protectedProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => {
      const link = await removeKnowledgeLink(ctx.user.id, input.id);
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge link was not found." });
      return link;
    }),
  }),
  taskCandidates: protectedProcedure.input(z.object({ content: z.string().min(1).max(100_000), includeVoicePatterns: z.boolean().optional() }))
    .mutation(({ input }) => extractSecondBrainTaskCandidates(input.content, input.includeVoicePatterns)),
  materializeNoteTasks: protectedProcedure.input(z.object({ id, includeVoicePatterns: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const note = await getOwnedKnowledgeItem(ctx.user.id, input.id);
    if (!note) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge item was not found." });
    const candidates = await extractSecondBrainTaskCandidates(note.content ?? "", input.includeVoicePatterns);
    const existing = await listTasks(ctx.user.id);
    const sourceMarker = `Second Brain note #${note.id}`;
    const created = [];
    for (const title of candidates) {
      if (existing.some(task => task.title.toLowerCase() === title.toLowerCase() && task.description?.includes(sourceMarker))) continue;
      const task = await createTask(ctx.user.id, { title, description: sourceMarker });
      if (task) created.push(task);
    }
    return { candidates, created };
  }),
});
