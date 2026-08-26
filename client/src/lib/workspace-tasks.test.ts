import { describe, expect, it } from "vitest";
import { filterWorkspaceTasks, getWorkspaceTaskBoardPhase, getWorkspaceTaskFilterPhase, nextWorkspaceTaskStatus } from "./workspace-tasks";

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

  it("filters only loaded task records and identifies a selected empty view", () => {
    const tasks = [{ id: 1, status: "todo" as const }, { id: 2, status: "done" as const }];

    expect(filterWorkspaceTasks(tasks, "all")).toEqual(tasks);
    expect(filterWorkspaceTasks(tasks, "done")).toEqual([{ id: 2, status: "done" }]);
    expect(getWorkspaceTaskFilterPhase({ totalCount: 2, filteredCount: 0, filter: "in_progress" })).toBe("filtered_empty");
    expect(getWorkspaceTaskFilterPhase({ totalCount: 0, filteredCount: 0, filter: "todo" })).toBe("ready");
  });
});
