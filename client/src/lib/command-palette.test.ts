import { describe, expect, it } from "vitest";
import { filterWorkspaceCommands, getWorkspaceCommands } from "./command-palette";

describe("workspace command palette", () => {
  it("exposes only concrete workspace destinations", () => {
    expect(getWorkspaceCommands("ar").map(command => command.target)).toEqual(["programming", "presentations", "mind"]);
    expect(getWorkspaceCommands("en").map(command => command.target)).toEqual(["programming", "presentations", "mind"]);
  });

  it("filters commands by title or detail without losing the empty-query list", () => {
    const commands = getWorkspaceCommands("en");
    expect(filterWorkspaceCommands(commands, "")).toEqual(commands);
    expect(filterWorkspaceCommands(commands, "slides")).toMatchObject([{ target: "presentations" }]);
    expect(filterWorkspaceCommands(getWorkspaceCommands("ar"), "البرمجة")).toMatchObject([{ target: "programming" }]);
  });
});
