import { describe, expect, it } from "vitest";
import { defaultPreferencesFor } from "./db";
import { normalizeLocalEmail } from "../db";

describe("defaultPreferencesFor", () => {
  it("creates Arabic dark defaults for the owning user", () => {
    expect(defaultPreferencesFor(42)).toEqual({
      userId: 42,
      language: "ar",
      theme: "dark",
      emailNotifications: 1,
      desktopNotifications: 1,
      agentMode: "guided",
    });
  });
});

describe("normalizeLocalEmail", () => {
  it("trims and lowercases a local account email", () => {
    expect(normalizeLocalEmail("  Owner@Example.COM ")).toBe("owner@example.com");
  });
});
