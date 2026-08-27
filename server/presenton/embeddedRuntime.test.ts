import { describe, expect, it, vi } from "vitest";
import { embeddedPresentonStatus } from "./embeddedRuntime";

describe("embeddedPresentonStatus", () => {
  it("probes the configured FastAPI endpoint without enabling generation", async () => {
    const origEndpoint = process.env.PRESENTON_EMBEDDED_ENDPOINT;
    process.env.PRESENTON_EMBEDDED_ENDPOINT = "http://127.0.0.1:8787";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    try {
      const status = await embeddedPresentonStatus();

      expect(status.endpoint).toBe("http://127.0.0.1:8787");
      expect(status.sourceAvailable).toBe(true);
      expect(status.fastApiSourceAvailable).toBe(true);
      expect(status.health).toBe("healthy");
      expect(status.phase).toBe("running");
      expect(status.generationEnabled).toBe(false);
    } finally {
      fetchSpy.mockRestore();
      if (origEndpoint === undefined) delete process.env.PRESENTON_EMBEDDED_ENDPOINT;
      else process.env.PRESENTON_EMBEDDED_ENDPOINT = origEndpoint;
    }
  });
});
