import { describe, expect, it } from "vitest";
import { getWorkspaceTaskBoardPhase, nextWorkspaceTaskStatus } from "./workspace-tasks";

describe("workspace task board helpers", () => {
  it("keeps lifecycle presentation honest when tasks are loading, failed, empty, or ready", () => {
    expect(getWorkspaceTaskBoardPhase({ isLoading: true, isError: false, count: 0 })).toBe("loading");
    expect(getWorkspaceTaskBoardPhase({ isLoading: false, isError: true, count: 4 })).toBe("error");
    expect(getWorkspaceTaskBoardPhase({ isLoading: false, isError: false, count: 0 })).toBe("empty");
    expect(getWorkspaceTaskBoardPhase({ isLoading: false, isError: false, count: 1 })).toBe("ready");
  });

  it("cycles only an existing persisted task status", () => {
    expect(nextWorkspaceTaskStatus("todo")).toBe("in_progress");
    expect(nextWorkspaceTaskStatus("in_progress")).toBe("done");
    expect(nextWorkspaceTaskStatus("done")).toBe("todo");
  });
});
