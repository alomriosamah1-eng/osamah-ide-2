import { describe, expect, it } from "vitest";
import { getOpenCodeModelPlaceholder } from "./opencode-contract";

describe("getOpenCodeModelPlaceholder", () => {
  it("waits only while no OpenCode model has been discovered", () => {
    expect(getOpenCodeModelPlaceholder({ hasDiscoveredModels: false, language: "ar" })).toBe("بانتظار نماذج OpenCode");
    expect(getOpenCodeModelPlaceholder({ hasDiscoveredModels: false, language: "en" })).toBe("Waiting for OpenCode models");
  });

  it("requires an explicit selection after discovery without supplying a default", () => {
    expect(getOpenCodeModelPlaceholder({ hasDiscoveredModels: true, language: "ar" })).toBe("اختر نموذج OpenCode");
    expect(getOpenCodeModelPlaceholder({ hasDiscoveredModels: true, language: "en" })).toBe("Choose an OpenCode model");
  });
});
