import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { normalizeWorkspacePath, requireFound, requireOwned } from "./access";

describe("workspace access guards", () => {
  it("normalizes a relative workspace path and refuses traversal", () => {
    expect(normalizeWorkspacePath("/src\\index.ts")).toBe("src/index.ts");
    expect(() => normalizeWorkspacePath("src/../secret.ts")).toThrow(TRPCError);
  });

  it("does not reveal another user's records", () => {
    expect(() => requireOwned({ ownerId: 7, id: 2 }, 8, "Project")).toThrow(TRPCError);
    expect(requireOwned({ ownerId: 7, id: 2 }, 7, "Project").id).toBe(2);
    expect(requireFound({ id: 3 }, "File").id).toBe(3);
  });
});
