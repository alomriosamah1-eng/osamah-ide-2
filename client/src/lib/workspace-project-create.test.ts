import { describe, expect, it } from "vitest";
import { getWorkspaceProjectCreatePayload } from "./workspace-project-create";

describe("getWorkspaceProjectCreatePayload", () => {
  it("normalizes valid optional language and description fields", () => {
    expect(getWorkspaceProjectCreatePayload({
      name: "  Orbit IDE  ",
      language: "  TypeScript  ",
      description: "  A real workspace project.  ",
      isSubmitting: false,
    })).toEqual({ name: "Orbit IDE", language: "TypeScript", description: "A real workspace project." });

    expect(getWorkspaceProjectCreatePayload({ name: "Orbit IDE", language: " ", description: " ", isSubmitting: false })).toEqual({
      name: "Orbit IDE",
      language: null,
      description: null,
    });
  });

  it("rejects an empty or oversized project name", () => {
    expect(getWorkspaceProjectCreatePayload({ name: "   ", language: "TypeScript", description: "", isSubmitting: false })).toBeNull();
    expect(getWorkspaceProjectCreatePayload({ name: "p".repeat(161), language: "TypeScript", description: "", isSubmitting: false })).toBeNull();
  });

  it("rejects optional text that exceeds the server limits", () => {
    expect(getWorkspaceProjectCreatePayload({ name: "Orbit IDE", language: "l".repeat(65), description: "", isSubmitting: false })).toBeNull();
    expect(getWorkspaceProjectCreatePayload({ name: "Orbit IDE", language: "", description: "d".repeat(100_001), isSubmitting: false })).toBeNull();
  });

  it("blocks submission while the project mutation is pending", () => {
    expect(getWorkspaceProjectCreatePayload({ name: "Orbit IDE", language: "TypeScript", description: "", isSubmitting: true })).toBeNull();
  });
});
