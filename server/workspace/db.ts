import { and, asc, desc, eq } from "drizzle-orm";
import { activityLog, projectFiles, projects, tasks } from "../../drizzle/schema";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";

async function requireDatabase() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Workspace storage is unavailable." });
  return db;
}

export async function getOwnedProject(ownerId: number, projectId: number) {
  const db = await requireDatabase();
  const result = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId))).limit(1);
  return result[0];
}

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

export async function getOwnedTask(ownerId: number, taskId: number) {
  const db = await requireDatabase();
  const result = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.ownerId, ownerId))).limit(1);
  return result[0];
}

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

export async function listProjects(ownerId: number) {
  const db = await requireDatabase();
  return db.select().from(projects).where(eq(projects.ownerId, ownerId)).orderBy(desc(projects.updatedAt));
}

export async function createProject(ownerId: number, input: { name: string; description?: string | null; language?: string | null }) {
  const db = await requireDatabase();
  const result = await db.insert(projects).values({ ownerId, name: input.name, description: input.description ?? null, language: input.language ?? null });
  const created = await getOwnedProject(ownerId, Number(result[0].insertId));
  if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Project creation did not return a record." });
  await writeActivity(ownerId, "created", "project", created.id, { name: created.name });
  return created;
}

export async function updateProject(ownerId: number, projectId: number, input: { name?: string; description?: string | null; language?: string | null; status?: "active" | "archived" }) {
  const db = await requireDatabase();
  const existing = await getOwnedProject(ownerId, projectId);
  if (!existing) return undefined;
  await db.update(projects).set(input).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  const updated = await getOwnedProject(ownerId, projectId);
  await writeActivity(ownerId, input.status === "archived" ? "archived" : "updated", "project", projectId, input);
  return updated;
}

export async function removeProject(ownerId: number, projectId: number) {
  const db = await requireDatabase();
  const existing = await getOwnedProject(ownerId, projectId);
  if (!existing) return undefined;
  await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  await writeActivity(ownerId, "deleted", "project", projectId, { name: existing.name });
  return existing;
}

export async function listFiles(ownerId: number, projectId: number) {
  const db = await requireDatabase();
  const project = await getOwnedProject(ownerId, projectId);
  if (!project) return undefined;
  return db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId)).orderBy(asc(projectFiles.path));
}

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

export async function updateFile(ownerId: number, fileId: number, input: { path?: string; name?: string; language?: string | null; content?: string | null }) {
  const db = await requireDatabase();
  const existing = await getOwnedFile(ownerId, fileId);
  if (!existing) return undefined;
  await db.update(projectFiles).set(input).where(eq(projectFiles.id, fileId));
  const updated = await getOwnedFile(ownerId, fileId);
  await writeActivity(ownerId, input.path ? "renamed" : "saved", existing.kind, fileId, { projectId: existing.projectId, ...input });
  return updated;
}

export async function removeFile(ownerId: number, fileId: number) {
  const db = await requireDatabase();
  const existing = await getOwnedFile(ownerId, fileId);
  if (!existing) return undefined;
  await db.delete(projectFiles).where(eq(projectFiles.id, fileId));
  await writeActivity(ownerId, "deleted", existing.kind, fileId, { projectId: existing.projectId, path: existing.path });
  return existing;
}

export async function listTasks(ownerId: number, projectId?: number) {
  const db = await requireDatabase();
  const condition = projectId ? and(eq(tasks.ownerId, ownerId), eq(tasks.projectId, projectId)) : eq(tasks.ownerId, ownerId);
  return db.select().from(tasks).where(condition).orderBy(desc(tasks.updatedAt));
}

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

export async function removeTask(ownerId: number, taskId: number) {
  const db = await requireDatabase();
  const existing = await getOwnedTask(ownerId, taskId);
  if (!existing) return undefined;
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.ownerId, ownerId)));
  await writeActivity(ownerId, "deleted", "task", taskId, { title: existing.title });
  return existing;
}

export async function listActivity(ownerId: number, limit: number) {
  const db = await requireDatabase();
  return db.select().from(activityLog).where(eq(activityLog.ownerId, ownerId)).orderBy(desc(activityLog.createdAt)).limit(limit);
}
