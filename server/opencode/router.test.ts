import { afterEach, describe, expect, it } from "vitest";
import { openCodeRouter } from "./router";

const originalExecutionFlag = process.env.OPENCODE_EMBEDDED_EXECUTION_ENABLED;

afterEach(() => {
  if (originalExecutionFlag === undefined) delete process.env.OPENCODE_EMBEDDED_EXECUTION_ENABLED;
  else process.env.OPENCODE_EMBEDDED_EXECUTION_ENABLED = originalExecutionFlag;
});

describe("OpenCode execution authorization gate", () => {
  it("rejects a session creation request when execution is not explicitly enabled", async () => {
    delete process.env.OPENCODE_EMBEDDED_EXECUTION_ENABLED;
    const caller = openCodeRouter.createCaller({ user: { id: 1 } } as never);

    await expect(caller.session.create({})).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringContaining("disabled"),
    });
  });
});
