import { describe, expect, it } from "vitest";
import type { OpenCodeModel } from "./api";
import { buildAgentProviderRegistry, findAgentModel, toAgentModelRecord } from "./registry";

const discoveredModel = (overrides: Partial<OpenCodeModel> = {}): OpenCodeModel => ({
  id: "model-a",
  providerID: "provider-a",
  name: "Model A",
  supportsTools: true,
  reasoning: true,
  temperature: false,
  attachment: true,
  contextLimit: 128000,
  outputLimit: 8192,
  modalities: { input: ["text", "image", "text"], output: ["text"] },
  ...overrides,
});

describe("OpenCode agent provider registry", () => {
  it("preserves discovered capabilities and normalizes modality lists", () => {
    expect(toAgentModelRecord(discoveredModel())).toEqual({
      id: "model-a",
      providerID: "provider-a",
      name: "Model A",
      capabilities: {
        tools: true,
        reasoning: true,
        temperature: false,
        attachments: true,
        contextLimit: 128000,
        outputLimit: 8192,
        inputModalities: ["image", "text"],
        outputModalities: ["text"],
      },
    });
  });

  it("groups only discovered models and keeps an empty discovery empty", () => {
    expect(buildAgentProviderRegistry([])).toEqual([]);

    const registry = buildAgentProviderRegistry([
      discoveredModel({ id: "z-model", name: "Z Model", providerID: "z-provider" }),
      discoveredModel({ id: "b-model", name: "B Model", providerID: "a-provider" }),
      discoveredModel({ id: "a-model", name: "A Model", providerID: "a-provider" }),
      discoveredModel({ id: "ignored", name: "", providerID: "a-provider" }),
    ]);

    expect(registry.map(provider => provider.id)).toEqual(["a-provider", "z-provider"]);
    expect(registry[0]?.models.map(model => model.id)).toEqual(["a-model", "b-model"]);
    expect(registry[0]?.modelCount).toBe(2);
  });

  it("rejects a selection that is not present in the discovered registry", () => {
    const registry = buildAgentProviderRegistry([discoveredModel({ variant: "fast" })]);

    expect(findAgentModel(registry, { providerID: "provider-a", id: "model-a", variant: "fast" })?.id).toBe("model-a");
    expect(findAgentModel(registry, { providerID: "provider-a", id: "model-a", variant: undefined })).toBeUndefined();
    expect(findAgentModel(registry, { providerID: "other", id: "model-a", variant: "fast" })).toBeUndefined();
  });
});
