import { beforeAll, describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import {
  createLocalSession,
  hashLocalPassword,
  hashRecoveryAnswer,
  verifyLocalPassword,
  verifyRecoveryAnswer,
} from "./localAuth";

describe("local account credentials", () => {
  beforeAll(() => {
    ENV.cookieSecret = "test-jwt-secret-key-for-local-auth-32-chars-long";
  });
  it("derives and verifies passwords without retaining the original value", async () => {
    const hash = await hashLocalPassword("Sufficiently-Strong-Password");
    expect(hash).not.toContain("Sufficiently-Strong-Password");
    await expect(verifyLocalPassword("Sufficiently-Strong-Password", hash)).resolves.toBe(true);
    await expect(verifyLocalPassword("different-password", hash)).resolves.toBe(false);
  });

  it("normalizes recovery answers while preserving password case sensitivity", async () => {
    const hash = await hashRecoveryAnswer("  Riyadh  ");
    await expect(verifyRecoveryAnswer("riyadh", hash)).resolves.toBe(true);
    await expect(verifyRecoveryAnswer("Jeddah", hash)).resolves.toBe(false);
  });

  it("creates a signed local-session token", async () => {
    const token = await createLocalSession(42);
    expect(token.split(".")).toHaveLength(3);
  });
});
