import { describe, expect, it } from "vitest";
import { getWorkspaceFileCreatePayload } from "./workspace-file-create";
import { getWorkspaceFileRenamePayload } from "./workspace-file-rename";

describe("workspace file form guards", () => {
  it("normalizes a valid file create payload and nulls a blank optional language", () => {
    expect(getWorkspaceFileCreatePayload({ projectId: 7, path: " /src\\main.ts ", language: "  ", isSubmitting: false })).toEqual({
      projectId: 7,
      path: "src/main.ts",
      name: "main.ts",
      kind: "file",
      language: null,
      content: "",
    });
  });

  it("blocks invalid create paths, contract overflows, and a pending submission", () => {
    expect(getWorkspaceFileCreatePayload({ projectId: 7, path: "src/../secret.ts", language: "TypeScript", isSubmitting: false })).toBeNull();
    expect(getWorkspaceFileCreatePayload({ projectId: 7, path: "a".repeat(1025), language: "TypeScript", isSubmitting: false })).toBeNull();
    expect(getWorkspaceFileCreatePayload({ projectId: 7, path: "app.ts", language: "x".repeat(65), isSubmitting: false })).toBeNull();
    expect(getWorkspaceFileCreatePayload({ projectId: 7, path: "app.ts", language: "TypeScript", isSubmitting: true })).toBeNull();
  });

  it("returns only a normalized, changed rename payload", () => {
    expect(getWorkspaceFileRenamePayload({ initialPath: "src/app.ts", path: " /src\\entry.ts ", isSubmitting: false })).toEqual({ path: "src/entry.ts", name: "entry.ts" });
    expect(getWorkspaceFileRenamePayload({ initialPath: "src/app.ts", path: " /src\\app.ts ", isSubmitting: false })).toBeNull();
  });

  it("blocks invalid, oversized, and concurrent rename requests", () => {
    expect(getWorkspaceFileRenamePayload({ initialPath: "src/app.ts", path: "../app.ts", isSubmitting: false })).toBeNull();
    expect(getWorkspaceFileRenamePayload({ initialPath: "src/app.ts", path: "a".repeat(1025), isSubmitting: false })).toBeNull();
    expect(getWorkspaceFileRenamePayload({ initialPath: "src/app.ts", path: "src/entry.ts", isSubmitting: true })).toBeNull();
  });
});
