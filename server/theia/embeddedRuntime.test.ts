import { describe, expect, it } from "vitest";
import {
  buildEmbeddedTheiaServeCommand,
  embeddedTheiaApplicationRoot,
  hasBuiltEmbeddedTheiaApplication,
  hasEmbeddedTheiaSource,
  readEmbeddedTheiaPackage,
} from "./embeddedRuntime";

describe("embedded Theia runtime", () => {
  it("recognises the unmodified source snapshot and uses the browser-only application path", async () => {
    expect(await hasEmbeddedTheiaSource()).toBe(true);
    expect(embeddedTheiaApplicationRoot()).toContain("third_party/theia/examples/browser-only");
    expect(await hasBuiltEmbeddedTheiaApplication()).toBe(false);
  });

  it("builds a loopback-only command for a previously generated application", () => {
    const command = buildEmbeddedTheiaServeCommand();
    expect(command.cwd).toContain("third_party/theia/examples/browser-only");
    expect(command.args[0]).toContain("src-gen/backend/main.js");
    expect(command.args).toContain("--hostname=127.0.0.1");
  });

  it("reports the actual Theia core package rather than the monorepo placeholder version", async () => {
    await expect(readEmbeddedTheiaPackage()).resolves.toEqual({
      name: "@theia/core",
      version: "1.74.0",
      license: "EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0",
    });
  });
});
