import { describe, expect, it } from "vitest";
import {
  buildEmbeddedOpenCodeServeCommand,
  embeddedOpenCodeRoot,
  hasEmbeddedOpenCodeSource,
  readEmbeddedOpenCodePackage,
} from "./embeddedRuntime";

describe("embedded OpenCode runtime", () => {
  it("keeps the original OpenCode CLI entry point and loopback-only serve command", () => {
    const command = buildEmbeddedOpenCodeServeCommand();

    expect(command.cwd).toBe(embeddedOpenCodeRoot());
    expect(command.binary).toMatch(/bun$/);
    expect(command.args).toEqual([
      "packages/opencode/src/index.ts",
      "serve",
      "--hostname",
      "127.0.0.1",
      "--port",
      "4096",
    ]);
  });

  it("honors an explicit runtime location without changing the original CLI command", () => {
    const previous = process.env.OPENCODE_BUN_PATH;
    process.env.OPENCODE_BUN_PATH = "/runtime/bun";

    try {
      const command = buildEmbeddedOpenCodeServeCommand();
      expect(command.binary).toBe("/runtime/bun");
      expect(command.args.slice(0, 2)).toEqual(["packages/opencode/src/index.ts", "serve"]);
      expect(command.args).toContain("127.0.0.1");
    } finally {
      if (previous === undefined) delete process.env.OPENCODE_BUN_PATH;
      else process.env.OPENCODE_BUN_PATH = previous;
    }
  });

  it("detects the vendored source and reads its original package identity", async () => {
    await expect(hasEmbeddedOpenCodeSource()).resolves.toBe(true);
    await expect(readEmbeddedOpenCodePackage()).resolves.toMatchObject({ name: "opencode" });
  });
});
