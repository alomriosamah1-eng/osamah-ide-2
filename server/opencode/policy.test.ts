import { describe, expect, it } from "vitest";
import { isOpenCodeExecutionDisabled } from "./policy";

describe("OpenCode execution policy", () => {
  it("allows execution by default and only stops it through the explicit shutdown switch", () => {
    expect(isOpenCodeExecutionDisabled(undefined)).toBe(false);
    expect(isOpenCodeExecutionDisabled("1")).toBe(false);
    expect(isOpenCodeExecutionDisabled("0")).toBe(true);
  });
});
