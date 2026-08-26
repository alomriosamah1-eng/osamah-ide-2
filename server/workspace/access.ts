/**
 * @fileoverview Ownership and path-validation guards used by the workspace contract.
 *
 * These helpers return `NOT_FOUND` for foreign records, avoiding disclosure of resource
 * existence across accounts, and reject relative paths that attempt directory traversal.
 */

import { TRPCError } from "@trpc/server";

/** Normalizes a relative workspace path and rejects traversal or empty path segments. */
export function normalizeWorkspacePath(value: string) {
  const path = value.trim().replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  if (!path || path === "." || path.split("/").some(segment => segment === ".." || segment === ".")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A workspace path must be relative and cannot traverse directories." });
  }
  return path;
}

/** Returns a record only when it belongs to the authenticated owner. */
export function requireOwned<T extends { ownerId: number }>(row: T | undefined, ownerId: number, entity: string) {
  if (!row || row.ownerId !== ownerId) {
    throw new TRPCError({ code: "NOT_FOUND", message: `${entity} was not found.` });
  }
  return row;
}

/** Converts an absent persistence result to the contract's stable `NOT_FOUND` response. */
export function requireFound<T>(row: T | undefined, entity: string) {
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: `${entity} was not found.` });
  }
  return row;
}
