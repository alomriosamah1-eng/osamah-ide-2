import { describe, expect, it, vi } from "vitest";
import { getOrCreateOpenCodeSession } from "./opencode-session";

describe("getOrCreateOpenCodeSession", () => {
  it("reuses the active session without creating an orphaned replacement", async () => {
    const create = vi.fn(async () => ({ id: "new-session" }));

    await expect(getOrCreateOpenCodeSession("active-session", create)).resolves.toBe("active-session");
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a session only when no active identifier exists", async () => {
    const create = vi.fn(async () => ({ id: "created-session" }));

    await expect(getOrCreateOpenCodeSession(null, create)).resolves.toBe("created-session");
    expect(create).toHaveBeenCalledTimes(1);
  });
});
