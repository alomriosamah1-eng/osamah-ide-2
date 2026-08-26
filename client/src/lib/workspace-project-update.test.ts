import { getWorkspaceProjectUpdatePayload } from "./workspace-project-update";
import { describe, expect, it } from "vitest";

const initial = { name: "Orbit IDE", language: "TypeScript", description: "Project workspace" };

describe("getWorkspaceProjectUpdatePayload", () => {
  it("returns only changed normalized metadata", () => {
    expect(getWorkspaceProjectUpdatePayload({
      initial,
      name: " Orbit IDE ",
      language: " JavaScript ",
      description: " ",
      isSubmitting: false,
    })).toEqual({ language: "JavaScript", description: null });
  });

  it("allows adding or clearing optional metadata", () => {
    expect(getWorkspaceProjectUpdatePayload({
      initial: { name: "Orbit IDE", language: null, description: null },
      name: "Orbit IDE",
      language: "TypeScript",
      description: "A real workspace project.",
      isSubmitting: false,
    })).toEqual({ language: "TypeScript", description: "A real workspace project." });
  });

  it("rejects unchanged metadata and values outside the contract", () => {
    expect(getWorkspaceProjectUpdatePayload({ initial, name: " Orbit IDE ", language: " TypeScript ", description: " Project workspace ", isSubmitting: false })).toBeNull();
    expect(getWorkspaceProjectUpdatePayload({ initial, name: "p".repeat(161), language: "TypeScript", description: "Project workspace", isSubmitting: false })).toBeNull();
    expect(getWorkspaceProjectUpdatePayload({ initial, name: "Orbit IDE", language: "l".repeat(65), description: "Project workspace", isSubmitting: false })).toBeNull();
    expect(getWorkspaceProjectUpdatePayload({ initial, name: "Orbit IDE", language: "TypeScript", description: "d".repeat(100_001), isSubmitting: false })).toBeNull();
  });

  it("blocks submission while the project update mutation is pending", () => {
    expect(getWorkspaceProjectUpdatePayload({ initial, name: "Renamed Orbit", language: "TypeScript", description: "Project workspace", isSubmitting: true })).toBeNull();
  });
});
