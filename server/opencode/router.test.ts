import { afterEach, describe, expect, it } from "vitest";
import { isOpenCodeExecutionDisabled } from "./policy";
import { openCodeRouter } from "./router";

const originalExecutionFlag = process.env.OPENCODE_EMBEDDED_EXECUTION_ENABLED;

afterEach(() => {
  if (originalExecutionFlag === undefined) delete process.env.OPENCODE_EMBEDDED_EXECUTION_ENABLED;
  else process.env.OPENCODE_EMBEDDED_EXECUTION_ENABLED = originalExecutionFlag;
});

describe("OpenCode execution authorization gate", () => {
  it("allows the execution policy by default and honors a deliberate shutdown switch", () => {
    expect(isOpenCodeExecutionDisabled(undefined)).toBe(false);
    expect(isOpenCodeExecutionDisabled("1")).toBe(false);
    expect(isOpenCodeExecutionDisabled("0")).toBe(true);
  });

  it("rejects a session creation request when the server has explicitly disabled execution", async () => {
    process.env.OPENCODE_EMBEDDED_EXECUTION_ENABLED = "0";
    const caller = openCodeRouter.createCaller({ user: { id: 1 } } as never);

    await expect(caller.session.create({ model: { id: "configured-model", providerID: "configured-provider" } })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("disabled"),
    });
  });
});
