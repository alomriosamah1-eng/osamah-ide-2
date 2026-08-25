/**
 * Design philosophy — Quiet Intelligence Observatory:
 * This contract keeps runtime truth separate from visual preference. OpenCode is the
 * primary free runtime tool; Cloud Computer is not part of this integration and no model
 * is shown until OpenCode itself reports a configured provider/model pair.
 */

export type OpenCodeRuntimeState = "unconfigured" | "checking" | "ready" | "degraded" | "offline";

export type OpenCodeModelPreference = {
  value: string;
  providerId: string;
  modelId: string;
  label: { ar: string; en: string };
  detail: { ar: string; en: string };
  source: "runtime";
};

export type OpenCodeModelCatalog = {
  runtime: OpenCodeRuntimeState;
  discoveredAt?: string;
  models: OpenCodeModelPreference[];
};

export type OpenCodeChatEnvelope = {
  message: string;
  context: {
    workspace: "dashboard" | "programming" | "presentations" | "mind" | "settings";
    language: "ar" | "en";
  };
  model?: Pick<OpenCodeModelPreference, "providerId" | "modelId">;
};

export const initialOpenCodeCatalog: OpenCodeModelCatalog = {
  runtime: "unconfigured",
  models: [],
};

export function getOpenCodeModel(catalog: OpenCodeModelCatalog, value: string): OpenCodeModelPreference | undefined {
  return catalog.models.find((model) => model.value === value);
}

export function createOpenCodeChatEnvelope(input: {
  message: string;
  workspace: OpenCodeChatEnvelope["context"]["workspace"];
  language: OpenCodeChatEnvelope["context"]["language"];
  model?: OpenCodeModelPreference;
}): OpenCodeChatEnvelope {
  return {
    message: input.message,
    context: { workspace: input.workspace, language: input.language },
    model: input.model ? { providerId: input.model.providerId, modelId: input.model.modelId } : undefined,
  };
}
