import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { normalizeWorkspacePath, requireFound, requireOwned } from "./access";
import {
  createFile,
  createProject,
  createTask,
  getOwnedFile,
  getOwnedProject,
  getOwnedTask,
  listActivity,
  listFiles,
  listProjects,
  listTasks,
  removeFile,
  removeProject,
  removeTask,
  updateFile,
  updateProject,
  updateTask,
} from "./db";

const id = z.number().int().positive();
const nullableText = z.string().trim().max(100_000).nullable().optional();
const projectInput = z.object({
  name: z.string().trim().min(1).max(160),
  description: nullableText,
  language: z.string().trim().max(64).nullable().optional(),
});
const taskStatus = z.enum(["todo", "in_progress", "done"]);
const fileInput = z.object({
  projectId: id,
  parentId: id.nullable().optional(),
  path: z.string().trim().min(1).max(1024).transform(normalizeWorkspacePath),
  name: z.string().trim().min(1).max(255),
  kind: z.enum(["file", "directory"]),
  language: z.string().trim().max(64).nullable().optional(),
  content: nullableText,
});

export const workspaceRouter = router({
  project: router({
    list: protectedProcedure.query(({ ctx }) => listProjects(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id })).query(async ({ ctx, input }) => requireOwned(await getOwnedProject(ctx.user.id, input.id), ctx.user.id, "Project")),
    create: protectedProcedure.input(projectInput).mutation(({ ctx, input }) => createProject(ctx.user.id, input)),
    update: protectedProcedure.input(z.object({ id, ...projectInput.partial().shape, status: z.enum(["active", "archived"]).optional() })).mutation(async ({ ctx, input }) => {
      const { id: projectId, ...patch } = input;
      if (Object.keys(patch).length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Project update must include at least one change." });
      return requireOwned(await updateProject(ctx.user.id, projectId, patch), ctx.user.id, "Project");
    }),
    remove: protectedProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => requireOwned(await removeProject(ctx.user.id, input.id), ctx.user.id, "Project")),
  }),
  file: router({
    list: protectedProcedure.input(z.object({ projectId: id })).query(async ({ ctx, input }) => {
      const files = await listFiles(ctx.user.id, input.projectId);
      if (!files) throw new TRPCError({ code: "NOT_FOUND", message: "Project was not found." });
      return files;
    }),
    get: protectedProcedure.input(z.object({ id })).query(async ({ ctx, input }) => requireFound(await getOwnedFile(ctx.user.id, input.id), "File")),
    create: protectedProcedure.input(fileInput).mutation(async ({ ctx, input }) => requireFound(await createFile(ctx.user.id, input), "Workspace item")),
    save: protectedProcedure.input(z.object({ id, content: z.string().max(100_000).nullable(), language: z.string().trim().max(64).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const { id: fileId, ...patch } = input;
      return requireFound(await updateFile(ctx.user.id, fileId, patch), "File");
    }),
    rename: protectedProcedure.input(z.object({ id, path: z.string().trim().min(1).max(1024).transform(normalizeWorkspacePath), name: z.string().trim().min(1).max(255) })).mutation(async ({ ctx, input }) => {
      const { id: fileId, ...patch } = input;
      return requireFound(await updateFile(ctx.user.id, fileId, patch), "Workspace item");
    }),
    remove: protectedProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => requireFound(await removeFile(ctx.user.id, input.id), "Workspace item")),
  }),
  task: router({
    list: protectedProcedure.input(z.object({ projectId: id.optional() }).optional()).query(({ ctx, input }) => listTasks(ctx.user.id, input?.projectId)),
    get: protectedProcedure.input(z.object({ id })).query(async ({ ctx, input }) => requireOwned(await getOwnedTask(ctx.user.id, input.id), ctx.user.id, "Task")),
    create: protectedProcedure.input(z.object({ projectId: id.nullable().optional(), title: z.string().trim().min(1).max(240), description: nullableText, status: taskStatus.optional(), dueAt: z.date().nullable().optional() })).mutation(async ({ ctx, input }) => requireOwned(await createTask(ctx.user.id, input), ctx.user.id, "Task")),
    update: protectedProcedure.input(z.object({ id, projectId: id.nullable().optional(), title: z.string().trim().min(1).max(240).optional(), description: nullableText, status: taskStatus.optional(), dueAt: z.date().nullable().optional() })).mutation(async ({ ctx, input }) => {
      const { id: taskId, ...patch } = input;
      if (Object.keys(patch).length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Task update must include at least one change." });
      return requireOwned(await updateTask(ctx.user.id, taskId, patch), ctx.user.id, "Task");
    }),
    remove: protectedProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => requireOwned(await removeTask(ctx.user.id, input.id), ctx.user.id, "Task")),
  }),
  activity: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(25) }).optional()).query(({ ctx, input }) => listActivity(ctx.user.id, input?.limit ?? 25)),
  }),
});
