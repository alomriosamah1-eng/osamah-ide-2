import { describe, expect, it } from "vitest";
import { getWorkspaceHelpEnginePhase } from "./workspace-help";

describe("getWorkspaceHelpEnginePhase", () => {
  it("shows loading before the engine-status query completes", () => {
    expect(getWorkspaceHelpEnginePhase({ isLoading: true, isError: false, engineCount: 0 })).toBe("loading");
  });

  it("keeps loading ahead of a stale query error", () => {
    expect(getWorkspaceHelpEnginePhase({ isLoading: true, isError: true, engineCount: 0 })).toBe("loading");
  });

  it("distinguishes query failure, empty data, and ready engine data", () => {
    expect(getWorkspaceHelpEnginePhase({ isLoading: false, isError: true, engineCount: 0 })).toBe("error");
    expect(getWorkspaceHelpEnginePhase({ isLoading: false, isError: false, engineCount: 0 })).toBe("empty");
    expect(getWorkspaceHelpEnginePhase({ isLoading: false, isError: false, engineCount: 4 })).toBe("ready");
  });
});
