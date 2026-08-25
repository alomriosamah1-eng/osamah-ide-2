import { and, asc, desc, eq, sql } from "drizzle-orm";
import { presentationSlides, presentations } from "../../drizzle/schema";
import { getDb } from "../db";
import { writeActivity } from "../workspace/db";

async function requireDatabase() {
  const db = await getDb();
  if (!db) throw new Error("Presentation storage is unavailable.");
  return db;
}

export function isExactSlideOrder(existingIds: number[], requestedIds: number[]) {
  return existingIds.length === requestedIds.length && new Set(existingIds).size === existingIds.length && new Set(requestedIds).size === requestedIds.length && existingIds.every(id => requestedIds.includes(id));
}

export async function getOwnedPresentation(ownerId: number, presentationId: number) {
  const db = await requireDatabase();
  const rows = await db.select().from(presentations).where(and(eq(presentations.id, presentationId), eq(presentations.ownerId, ownerId))).limit(1);
  return rows[0];
}

export async function getOwnedPresentationSlide(ownerId: number, slideId: number) {
  const db = await requireDatabase();
  const rows = await db.select({ slide: presentationSlides }).from(presentationSlides).innerJoin(presentations, eq(presentationSlides.presentationId, presentations.id)).where(and(eq(presentationSlides.id, slideId), eq(presentations.ownerId, ownerId))).limit(1);
  return rows[0]?.slide;
}

export async function listPresentations(ownerId: number) {
  const db = await requireDatabase();
  return db.select().from(presentations).where(eq(presentations.ownerId, ownerId)).orderBy(desc(presentations.updatedAt));
}

export async function createPresentation(ownerId: number, title: string) {
  const db = await requireDatabase();
  const result = await db.insert(presentations).values({ ownerId, title, status: "draft" });
  const created = await getOwnedPresentation(ownerId, Number(result[0].insertId));
  if (!created) throw new Error("Presentation creation did not return a record.");
  await writeActivity(ownerId, "created", "presentation", created.id, { title: created.title });
  return created;
}

export async function updatePresentation(ownerId: number, presentationId: number, patch: { title?: string; status?: "draft" | "generating" | "ready" | "failed" }) {
  const db = await requireDatabase();
  const existing = await getOwnedPresentation(ownerId, presentationId);
  if (!existing) return undefined;
  await db.update(presentations).set(patch).where(and(eq(presentations.id, presentationId), eq(presentations.ownerId, ownerId)));
  const updated = await getOwnedPresentation(ownerId, presentationId);
  await writeActivity(ownerId, "updated", "presentation", presentationId, patch);
  return updated;
}

export async function removePresentation(ownerId: number, presentationId: number) {
  const db = await requireDatabase();
  const existing = await getOwnedPresentation(ownerId, presentationId);
  if (!existing) return undefined;
  await db.delete(presentations).where(and(eq(presentations.id, presentationId), eq(presentations.ownerId, ownerId)));
  await writeActivity(ownerId, "deleted", "presentation", presentationId, { title: existing.title });
  return existing;
}

export async function listPresentationSlides(ownerId: number, presentationId: number) {
  const db = await requireDatabase();
  const presentation = await getOwnedPresentation(ownerId, presentationId);
  if (!presentation) return undefined;
  return db.select().from(presentationSlides).where(eq(presentationSlides.presentationId, presentationId)).orderBy(asc(presentationSlides.position));
}

export async function createPresentationSlide(ownerId: number, input: { presentationId: number; title?: string | null; content?: string | null; speakerNotes?: string | null }) {
  const db = await requireDatabase();
  const presentation = await getOwnedPresentation(ownerId, input.presentationId);
  if (!presentation) return undefined;
  const last = await db.select({ position: presentationSlides.position }).from(presentationSlides).where(eq(presentationSlides.presentationId, input.presentationId)).orderBy(desc(presentationSlides.position)).limit(1);
  const position = (last[0]?.position ?? -1) + 1;
  const result = await db.insert(presentationSlides).values({ ...input, position });
  const created = await getOwnedPresentationSlide(ownerId, Number(result[0].insertId));
  if (!created) throw new Error("Slide creation did not return a record.");
  await writeActivity(ownerId, "created", "presentation-slide", created.id, { presentationId: input.presentationId, position });
  return created;
}

export async function updatePresentationSlide(ownerId: number, slideId: number, patch: { title?: string | null; content?: string | null; speakerNotes?: string | null }) {
  const db = await requireDatabase();
  const existing = await getOwnedPresentationSlide(ownerId, slideId);
  if (!existing) return undefined;
  await db.update(presentationSlides).set(patch).where(eq(presentationSlides.id, slideId));
  const updated = await getOwnedPresentationSlide(ownerId, slideId);
  await writeActivity(ownerId, "updated", "presentation-slide", slideId, { presentationId: existing.presentationId });
  return updated;
}

export async function removePresentationSlide(ownerId: number, slideId: number) {
  const db = await requireDatabase();
  const existing = await getOwnedPresentationSlide(ownerId, slideId);
  if (!existing) return undefined;
  await db.delete(presentationSlides).where(eq(presentationSlides.id, slideId));
  await writeActivity(ownerId, "deleted", "presentation-slide", slideId, { presentationId: existing.presentationId });
  return existing;
}

export async function reorderPresentationSlides(ownerId: number, presentationId: number, orderedSlideIds: number[]) {
  const db = await requireDatabase();
  const slides = await listPresentationSlides(ownerId, presentationId);
  if (!slides || !isExactSlideOrder(slides.map(slide => slide.id), orderedSlideIds)) return undefined;
  await db.update(presentationSlides).set({ position: sql`${presentationSlides.position} + 1000000` }).where(eq(presentationSlides.presentationId, presentationId));
  for (let position = 0; position < orderedSlideIds.length; position += 1) {
    const slideId = orderedSlideIds[position];
    await db.update(presentationSlides).set({ position }).where(eq(presentationSlides.id, slideId));
  }
  const reordered = await listPresentationSlides(ownerId, presentationId);
  await writeActivity(ownerId, "reordered", "presentation", presentationId, { slideCount: orderedSlideIds.length });
  return reordered;
}
