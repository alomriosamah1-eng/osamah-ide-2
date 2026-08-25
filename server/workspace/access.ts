import { TRPCError } from "@trpc/server";

export function normalizeWorkspacePath(value: string) {
  const path = value.trim().replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/{2,}/g, "/");
  if (!path || path === "." || path.split("/").some(segment => segment === ".." || segment === ".")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A workspace path must be relative and cannot traverse directories." });
  }
  return path;
}

export function requireOwned<T extends { ownerId: number }>(row: T | undefined, ownerId: number, entity: string) {
  if (!row || row.ownerId !== ownerId) {
    throw new TRPCError({ code: "NOT_FOUND", message: `${entity} was not found.` });
  }
  return row;
}

export function requireFound<T>(row: T | undefined, entity: string) {
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: `${entity} was not found.` });
  }
  return row;
}
