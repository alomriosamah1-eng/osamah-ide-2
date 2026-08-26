import { afterEach, describe, expect, it } from "vitest";
import {
  isOpenCodeSessionOwnedBy,
  registerOpenCodeSessionOwner,
  releaseOpenCodeSessionOwner,
  resetOpenCodeSessionOwnersForTest,
} from "./sessionOwnership";

afterEach(() => {
  resetOpenCodeSessionOwnersForTest();
});

describe("OpenCode transient session ownership", () => {
  it("permits only the local account that created a tracked session", () => {
    registerOpenCodeSessionOwner("session-for-owner-1", 1);

    expect(isOpenCodeSessionOwnedBy("session-for-owner-1", 1)).toBe(true);
    expect(isOpenCodeSessionOwnedBy("session-for-owner-1", 2)).toBe(false);
    expect(isOpenCodeSessionOwnedBy("unknown-session", 1)).toBe(false);
  });

  it("releases ownership after the transient session is discarded", () => {
    registerOpenCodeSessionOwner("session-to-release", 7);
    releaseOpenCodeSessionOwner("session-to-release");

    expect(isOpenCodeSessionOwnedBy("session-to-release", 7)).toBe(false);
  });
});
