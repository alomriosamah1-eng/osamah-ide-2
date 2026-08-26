/**
 * @fileoverview Account-scoped persistence service for workspace projects, files, tasks,
 * and activity records. Every lookup accepts an `ownerId` and queries ownership at the
 * database boundary; router procedures must still use the matching authenticated user ID.
 */

import { and, asc, desc, eq } from "drizzle-orm";
import { activityLog, projectFiles, projects, tasks } from "../../drizzle/schema";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";

async function requireDatabase() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Workspace storage is unavailable." });
  return db;
}

/** Returns a project only when its stored owner matches `ownerId`. */
export async function getOwnedProject(ownerId: number, projectId: number) {
  const db = await requireDatabase();
  const result = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId))).limit(1);
  return result[0];
}

/** Returns a file only through a project owned by `ownerId`. */
export async function getOwnedFile(ownerId: number, fileId: number) {
  const db = await requireDatabase();
  const result = await db
    .select({ file: projectFiles, project: projects })
    .from(projectFiles)
    .innerJoin(projects, eq(projectFiles.projectId, projects.id))
    .where(and(eq(projectFiles.id, fileId), eq(projects.ownerId, ownerId)))
    .limit(1);
  return result[0]?.file;
}

/** Returns a task only when its stored owner matches `ownerId`. */
export async function getOwnedTask(ownerId: number, taskId: number) {
  const db = await requireDatabase();
  const result = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.ownerId, ownerId))).limit(1);
  return result[0];
}

/** Appends an account-owned audit event for a completed workspace mutation. */
export async function writeActivity(ownerId: number, action: string, entityType: string, entityId?: number, metadata?: Record<string, unknown>) {
  const db = await requireDatabase();
  await db.insert(activityLog).values({
    ownerId,
    action,
    entityType,
    entityId: entityId ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

/** Lists the caller's projects from most recently updated to oldest. */
export async function listProjects(ownerId: number) {
  const db = await requireDatabase();
  return db.select().from(projects).where(eq(projects.ownerId, ownerId)).orderBy(desc(projects.updatedAt));
}

/** Creates an owned project and records its creation in the activity log. */
export async function createProject(ownerId: number, input: { name: string; description?: string | null; language?: string | null }) {
  const db = await requireDatabase();
  const result = await db.insert(projects).values({ ownerId, name: input.name, description: input.description ?? null, language: input.language ?? null });
  const created = await getOwnedProject(ownerId, Number(result[0].insertId));
  if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Project creation did not return a record." });
  await writeActivity(ownerId, "created", "project", created.id, { name: created.name });
  return created;
}

/** Updates an existing owned project and records whether it was updated or archived. */
export async function updateProject(ownerId: number, projectId: number, input: { name?: string; description?: string | null; language?: string | null; status?: "active" | "archived" }) {
  const db = await requireDatabase();
  const existing = await getOwnedProject(ownerId, projectId);
  if (!existing) return undefined;
  await db.update(projects).set(input).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  const updated = await getOwnedProject(ownerId, projectId);
  await writeActivity(ownerId, input.status === "archived" ? "archived" : "updated", "project", projectId, input);
  return updated;
}

/** Removes an owned project and records the deletion after the ownership check succeeds. */
export async function removeProject(ownerId: number, projectId: number) {
  const db = await requireDatabase();
  const existing = await getOwnedProject(ownerId, projectId);
  if (!existing) return undefined;
  await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  await writeActivity(ownerId, "deleted", "project", projectId, { name: existing.name });
  return existing;
}

/** Lists a project's files after confirming that the project belongs to `ownerId`. */
export async function listFiles(ownerId: number, projectId: number) {
  const db = await requireDatabase();
  const project = await getOwnedProject(ownerId, projectId);
  if (!project) return undefined;
  return db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId)).orderBy(asc(projectFiles.path));
}

/** Creates an item inside an owned project, validating any parent directory first. */
export async function createFile(ownerId: number, input: { projectId: number; parentId?: number | null; path: string; name: string; kind: "file" | "directory"; language?: string | null; content?: string | null }) {
  const db = await requireDatabase();
  const project = await getOwnedProject(ownerId, input.projectId);
  if (!project) return undefined;
  if (input.parentId) {
    const parent = await getOwnedFile(ownerId, input.parentId);
    if (!parent || parent.projectId !== input.projectId || parent.kind !== "directory") return undefined;
  }
  const result = await db.insert(projectFiles).values(input);
  const id = Number(result[0].insertId);
  const file = await getOwnedFile(ownerId, id);
  if (!file) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "File creation did not return a record." });
  await writeActivity(ownerId, "created", input.kind, id, { projectId: input.projectId, path: input.path });
  return file;
}

/** Saves or renames an owned file and records the corresponding activity event. */
export async function updateFile(ownerId: number, fileId: number, input: { path?: string; name?: string; language?: string | null; content?: string | null }) {
  const db = await requireDatabase();
  const existing = await getOwnedFile(ownerId, fileId);
  if (!existing) return undefined;
  await db.update(projectFiles).set(input).where(eq(projectFiles.id, fileId));
  const updated = await getOwnedFile(ownerId, fileId);
  await writeActivity(ownerId, input.path ? "renamed" : "saved", existing.kind, fileId, { projectId: existing.projectId, ...input });
  return updated;
}

/** Deletes an owned file after loading it through the ownership-scoped lookup. */
export async function removeFile(ownerId: number, fileId: number) {
  const db = await requireDatabase();
  const existing = await getOwnedFile(ownerId, fileId);
  if (!existing) return undefined;
  await db.delete(projectFiles).where(eq(projectFiles.id, fileId));
  await writeActivity(ownerId, "deleted", existing.kind, fileId, { projectId: existing.projectId, path: existing.path });
  return existing;
}

/** Lists account-owned tasks, optionally constrained to an owned project identifier. */
export async function listTasks(ownerId: number, projectId?: number) {
  const db = await requireDatabase();
  const condition = projectId ? and(eq(tasks.ownerId, ownerId), eq(tasks.projectId, projectId)) : eq(tasks.ownerId, ownerId);
  return db.select().from(tasks).where(condition).orderBy(desc(tasks.updatedAt));
}

/** Creates an owned task, validating any linked project and deriving completion time. */
export async function createTask(ownerId: number, input: { projectId?: number | null; title: string; description?: string | null; status?: "todo" | "in_progress" | "done"; dueAt?: Date | null }) {
  const db = await requireDatabase();
  if (input.projectId) {
    const project = await getOwnedProject(ownerId, input.projectId);
    if (!project) return undefined;
  }
  const status = input.status ?? "todo";
  const result = await db.insert(tasks).values({ ...input, ownerId, status, completedAt: status === "done" ? new Date() : null });
  const id = Number(result[0].insertId);
  const task = await getOwnedTask(ownerId, id);
  if (!task) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Task creation did not return a record." });
  await writeActivity(ownerId, "created", "task", id, { title: task.title, projectId: task.projectId });
  return task;
}

/** Updates an owned task and keeps `completedAt` consistent with the requested status. */
export async function updateTask(ownerId: number, taskId: number, input: { projectId?: number | null; title?: string; description?: string | null; status?: "todo" | "in_progress" | "done"; dueAt?: Date | null }) {
  const db = await requireDatabase();
  const existing = await getOwnedTask(ownerId, taskId);
  if (!existing) return undefined;
  if (input.projectId) {
    const project = await getOwnedProject(ownerId, input.projectId);
    if (!project) return undefined;
  }
  const updates = { ...input, completedAt: input.status === "done" ? new Date() : input.status ? null : undefined };
  await db.update(tasks).set(updates).where(and(eq(tasks.id, taskId), eq(tasks.ownerId, ownerId)));
  const updated = await getOwnedTask(ownerId, taskId);
  await writeActivity(ownerId, input.status === "done" ? "completed" : "updated", "task", taskId, input);
  return updated;
}

/** Deletes an owned task and appends a deletion audit event. */
export async function removeTask(ownerId: number, taskId: number) {
  const db = await requireDatabase();
  const existing = await getOwnedTask(ownerId, taskId);
  if (!existing) return undefined;
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.ownerId, ownerId)));
  await writeActivity(ownerId, "deleted", "task", taskId, { title: existing.title });
  return existing;
}

/** Lists the newest account-owned workspace activity events up to a validated limit. */
export async function listActivity(ownerId: number, limit: number) {
  const db = await requireDatabase();
  return db.select().from(activityLog).where(eq(activityLog.ownerId, ownerId)).orderBy(desc(activityLog.createdAt)).limit(limit);
}
