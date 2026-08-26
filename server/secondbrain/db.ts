/**
 * @fileoverview Account-scoped persistence for Second Brain items and directed links.
 * Link endpoints are verified as owned before insertion, preserving graph isolation
 * even when the client supplies arbitrary numeric identifiers.
 */

import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import { knowledgeItems, knowledgeLinks } from "../../drizzle/schema";
import { getDb } from "../db";
import { writeActivity } from "../workspace/db";
import { TRPCError } from "@trpc/server";

async function requireDatabase() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Knowledge storage is unavailable." });
  return db;
}

/** Writable fields for a stored knowledge item. */
export type KnowledgeInput = {
  title: string;
  kind: "note" | "source" | "insight";
  content?: string | null;
  sourceUrl?: string | null;
};

/** Writable fields for a directed relation between two owned knowledge items. */
export type KnowledgeLinkInput = {
  fromItemId: number;
  toItemId: number;
  label?: string | null;
};

/** Rejects self-links before the persistence layer performs endpoint lookups. */
export function hasDistinctKnowledgeLinkEndpoints(input: Pick<KnowledgeLinkInput, "fromItemId" | "toItemId">) {
  return input.fromItemId !== input.toItemId;
}

/** Returns a knowledge item only when it belongs to `ownerId`. */
export async function getOwnedKnowledgeItem(ownerId: number, id: number) {
  const db = await requireDatabase();
  const rows = await db.select().from(knowledgeItems).where(and(eq(knowledgeItems.id, id), eq(knowledgeItems.ownerId, ownerId))).limit(1);
  return rows[0];
}

/** Lists account-owned knowledge items by most recently updated first. */
export async function listKnowledgeItems(ownerId: number) {
  const db = await requireDatabase();
  return db.select().from(knowledgeItems).where(eq(knowledgeItems.ownerId, ownerId)).orderBy(desc(knowledgeItems.updatedAt));
}

function escapeLikeTerm(term: string) {
  return term.replace(/[\\%_]/g, "\\$&");
}

/** Searches owned item fields and items connected by an owned link-label match. */
export async function searchKnowledgeItems(ownerId: number, term: string, limit = 30) {
  const db = await requireDatabase();
  const pattern = `%${escapeLikeTerm(term)}%`;
  const matchingLinks = await db.select({ fromItemId: knowledgeLinks.fromItemId, toItemId: knowledgeLinks.toItemId }).from(knowledgeLinks).where(and(
    eq(knowledgeLinks.ownerId, ownerId),
    like(knowledgeLinks.label, pattern),
  ));
  const linkedItemIds = Array.from(new Set(matchingLinks.flatMap(link => [link.fromItemId, link.toItemId])));
  const textMatch = or(
    like(knowledgeItems.title, pattern),
    like(knowledgeItems.content, pattern),
    like(knowledgeItems.sourceUrl, pattern),
  );
  return db
    .select()
    .from(knowledgeItems)
    .where(and(
      eq(knowledgeItems.ownerId, ownerId),
      linkedItemIds.length > 0 ? or(textMatch, inArray(knowledgeItems.id, linkedItemIds)) : textMatch,
    ))
    .orderBy(desc(knowledgeItems.updatedAt))
    .limit(limit);
}

/** Creates an owned item and writes the resulting activity event. */
export async function createKnowledgeItem(ownerId: number, input: KnowledgeInput) {
  const db = await requireDatabase();
  const result = await db.insert(knowledgeItems).values({ ownerId, ...input });
  const item = await getOwnedKnowledgeItem(ownerId, Number(result[0].insertId));
  if (!item) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Knowledge item creation did not return a record." });
  await writeActivity(ownerId, "created", "knowledge", item.id, { kind: item.kind, title: item.title });
  return item;
}

/** Updates an owned item; foreign or absent records return `undefined`. */
export async function updateKnowledgeItem(ownerId: number, id: number, patch: Partial<KnowledgeInput>) {
  const db = await requireDatabase();
  if (!await getOwnedKnowledgeItem(ownerId, id)) return undefined;
  await db.update(knowledgeItems).set(patch).where(and(eq(knowledgeItems.id, id), eq(knowledgeItems.ownerId, ownerId)));
  const item = await getOwnedKnowledgeItem(ownerId, id);
  await writeActivity(ownerId, "updated", "knowledge", id, patch);
  return item;
}

/** Deletes an owned item and records the deletion. */
export async function removeKnowledgeItem(ownerId: number, id: number) {
  const db = await requireDatabase();
  const item = await getOwnedKnowledgeItem(ownerId, id);
  if (!item) return undefined;
  await db.delete(knowledgeItems).where(and(eq(knowledgeItems.id, id), eq(knowledgeItems.ownerId, ownerId)));
  await writeActivity(ownerId, "deleted", "knowledge", id, { title: item.title });
  return item;
}

/** Lists directed links whose records belong to `ownerId`. */
export async function listKnowledgeLinks(ownerId: number) {
  const db = await requireDatabase();
  return db.select().from(knowledgeLinks).where(eq(knowledgeLinks.ownerId, ownerId)).orderBy(desc(knowledgeLinks.createdAt));
}

/** Returns a graph link only when it belongs to `ownerId`. */
export async function getOwnedKnowledgeLink(ownerId: number, id: number) {
  const db = await requireDatabase();
  const rows = await db.select().from(knowledgeLinks).where(and(eq(knowledgeLinks.id, id), eq(knowledgeLinks.ownerId, ownerId))).limit(1);
  return rows[0];
}

/** Creates a unique owned link after validating both endpoints and duplicate absence. */
export async function createKnowledgeLink(ownerId: number, input: KnowledgeLinkInput) {
  const db = await requireDatabase();
  const [fromItem, toItem] = await Promise.all([
    getOwnedKnowledgeItem(ownerId, input.fromItemId),
    getOwnedKnowledgeItem(ownerId, input.toItemId),
  ]);
  if (!fromItem || !toItem) return undefined;
  const existing = await db.select().from(knowledgeLinks).where(and(
    eq(knowledgeLinks.ownerId, ownerId),
    eq(knowledgeLinks.fromItemId, input.fromItemId),
    eq(knowledgeLinks.toItemId, input.toItemId),
  )).limit(1);
  if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "Knowledge link already exists." });
  const result = await db.insert(knowledgeLinks).values({ ownerId, ...input });
  const link = await getOwnedKnowledgeLink(ownerId, Number(result[0].insertId));
  if (!link) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Knowledge link creation did not return a record." });
  await writeActivity(ownerId, "created", "knowledge-link", link.id, { fromItemId: link.fromItemId, toItemId: link.toItemId, label: link.label });
  return link;
}

/** Updates the label of an owned link and writes an activity event. */
export async function updateKnowledgeLink(ownerId: number, id: number, label: string | null) {
  const db = await requireDatabase();
  if (!await getOwnedKnowledgeLink(ownerId, id)) return undefined;
  await db.update(knowledgeLinks).set({ label }).where(and(eq(knowledgeLinks.id, id), eq(knowledgeLinks.ownerId, ownerId)));
  const link = await getOwnedKnowledgeLink(ownerId, id);
  await writeActivity(ownerId, "updated", "knowledge-link", id, { label });
  return link;
}

/** Deletes an owned link and records its former endpoint metadata. */
export async function removeKnowledgeLink(ownerId: number, id: number) {
  const db = await requireDatabase();
  const link = await getOwnedKnowledgeLink(ownerId, id);
  if (!link) return undefined;
  await db.delete(knowledgeLinks).where(and(eq(knowledgeLinks.id, id), eq(knowledgeLinks.ownerId, ownerId)));
  await writeActivity(ownerId, "deleted", "knowledge-link", id, { fromItemId: link.fromItemId, toItemId: link.toItemId, label: link.label });
  return link;
}
