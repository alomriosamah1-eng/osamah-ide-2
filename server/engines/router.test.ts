import { describe, expect, it } from "vitest";
import { buildEngineStatus } from "./router";

describe("embedded engine status contract", () => {
  it("reports the four approved embedded sources without claiming unavailable engines are agent-ready", async () => {
    const engines = await buildEngineStatus();

    expect(engines.map(engine => engine.id)).toEqual(["opencode", "theia", "presenton", "second-brain"]);
    expect(engines.every(engine => engine.sourceAvailable)).toBe(true);

    const openCode = engines.find(engine => engine.id === "opencode");
    const theia = engines.find(engine => engine.id === "theia");
    const presenton = engines.find(engine => engine.id === "presenton");
    const secondBrain = engines.find(engine => engine.id === "second-brain");

    expect(openCode).toMatchObject({ id: "opencode", sourceAvailable: true });
    expect(openCode?.agentReady).toBe(openCode?.status === "ready");
    expect(openCode?.modelCount).toBeGreaterThanOrEqual(0);
    expect(theia).toMatchObject({ id: "theia", status: "build-required", agentReady: false });
    expect(presenton).toMatchObject({ id: "presenton", agentReady: false });
    expect(secondBrain).toMatchObject({ id: "second-brain", status: "available", agentReady: true });
  });
});
