import type { OpenCodeModel } from "./api";

export type AgentModelCapabilities = {
  tools: boolean;
  reasoning: boolean;
  temperature: boolean;
  attachments: boolean;
  contextLimit?: number;
  outputLimit?: number;
  inputModalities: string[];
  outputModalities: string[];
};

export type AgentModelRecord = {
  id: string;
  providerID: string;
  name: string;
  variant?: string;
  status?: OpenCodeModel["status"];
  capabilities: AgentModelCapabilities;
};

export type AgentProviderRecord = {
  id: string;
  modelCount: number;
  models: AgentModelRecord[];
};

const finitePositive = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;

const uniqueStrings = (values: string[] | undefined) =>
  Array.from(new Set((values ?? []).filter(value => value.trim().length > 0))).sort();

export function toAgentModelRecord(model: OpenCodeModel): AgentModelRecord {
  return {
    id: model.id,
    providerID: model.providerID,
    name: model.name,
    ...(model.variant ? { variant: model.variant } : {}),
    ...(model.status ? { status: model.status } : {}),
    capabilities: {
      tools: model.supportsTools,
      reasoning: model.reasoning === true,
      temperature: model.temperature === true,
      attachments: model.attachment === true,
      ...(finitePositive(model.contextLimit) ? { contextLimit: model.contextLimit } : {}),
      ...(finitePositive(model.outputLimit) ? { outputLimit: model.outputLimit } : {}),
      inputModalities: uniqueStrings(model.modalities?.input),
      outputModalities: uniqueStrings(model.modalities?.output),
    },
  };
}

/** Groups only server-discovered models. Empty discovery remains an explicit empty registry. */
export function buildAgentProviderRegistry(models: readonly OpenCodeModel[]): AgentProviderRecord[] {
  const providers = new Map<string, AgentModelRecord[]>();
  for (const model of models) {
    if (!model.providerID || !model.id || !model.name) continue;
    const list = providers.get(model.providerID) ?? [];
    list.push(toAgentModelRecord(model));
    providers.set(model.providerID, list);
  }

  return Array.from(providers.entries())
    .map(([id, providerModels]: [string, AgentModelRecord[]]) => ({
      id,
      modelCount: providerModels.length,
      models: providerModels.sort((a, b) => `${a.name}\u0000${a.id}`.localeCompare(`${b.name}\u0000${b.id}`)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function findAgentModel(
  registry: readonly AgentProviderRecord[],
  selection: Pick<OpenCodeModel, "id" | "providerID" | "variant">,
) {
  return registry
    .find(provider => provider.id === selection.providerID)
    ?.models.find(model => model.id === selection.id && model.variant === selection.variant);
}
