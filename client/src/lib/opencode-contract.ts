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
  variant?: string;
  label: { ar: string; en: string };
  detail: { ar: string; en: string };
  source: "runtime";
};

export type OpenCodeModelCatalog = {
  runtime: OpenCodeRuntimeState;
  discoveredAt?: string;
  models: OpenCodeModelPreference[];
};

export type EmbeddedOpenCodeModel = {
  id: string;
  providerID: string;
  name: string;
  variant?: string;
  supportsTools: boolean;
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

/**
 * Labels the picker honestly: a discovered catalog still needs an explicit user
 * choice, while an empty catalog is the only state that is actually waiting.
 */
export function getOpenCodeModelPlaceholder(input: { hasDiscoveredModels: boolean; language: "ar" | "en" }): string {
  if (input.hasDiscoveredModels) {
    return input.language === "ar" ? "اختر نموذج OpenCode" : "Choose an OpenCode model";
  }

  return input.language === "ar" ? "بانتظار نماذج OpenCode" : "Waiting for OpenCode models";
}

/**
 * Converts only the model records returned by Osamah's server-side OpenCode
 * gateway. There is deliberately no fallback provider or model list.
 */
export function catalogFromEmbeddedOpenCode(models: EmbeddedOpenCodeModel[]): OpenCodeModelCatalog {
  const catalogModels = models.map((model) => {
    const suffix = model.variant ? `:${model.variant}` : "";
    const reference = `${model.providerID}/${model.id}${suffix}`;
    return {
      value: reference,
      providerId: model.providerID,
      modelId: model.id,
      variant: model.variant,
      label: { ar: model.name, en: model.name },
      detail: {
        ar: model.supportsTools ? "نموذج OpenCode يدعم الأدوات" : "نموذج OpenCode المكتشف",
        en: model.supportsTools ? "OpenCode model with tool support" : "Discovered OpenCode model",
      },
      source: "runtime" as const,
    };
  });

  return {
    runtime: catalogModels.length > 0 ? "ready" : "unconfigured",
    discoveredAt: new Date().toISOString(),
    models: catalogModels,
  };
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
