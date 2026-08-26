import { describe, expect, it } from "vitest";
import { embeddedPresentonStatus } from "./embeddedRuntime";

describe("embeddedPresentonStatus", () => {
  it("probes the configured FastAPI endpoint without enabling generation", async () => {
    const status = await embeddedPresentonStatus();

    expect(status.endpoint).toBe("http://127.0.0.1:8787");
    expect(status.sourceAvailable).toBe(true);
    expect(status.fastApiSourceAvailable).toBe(true);
    expect(status.health).toBe("healthy");
    expect(status.phase).toBe("running");
    expect(status.generationEnabled).toBe(false);
  });
});
