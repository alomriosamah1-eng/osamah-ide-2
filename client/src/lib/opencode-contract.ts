/**
 * Design philosophy — Quiet Intelligence Observatory:
 * This contract keeps runtime truth separate from visual preference. The chat may present
 * a calm model control, but it never claims runtime availability before local discovery.
 */

export type OpenCodeRuntimeState = "unconfigured" | "checking" | "ready" | "degraded" | "offline";

export type OpenCodeModelPreference = {
  value: string;
  providerId: string;
  modelId: string;
  label: { ar: string; en: string };
  detail: { ar: string; en: string };
  source: "fallback" | "runtime";
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
  model: Pick<OpenCodeModelPreference, "providerId" | "modelId">;
};

/**
 * This fallback catalog exists only until the local Gateway reports a real V2ModelList result.
 * It is intentionally labelled as a preference, never as a discovered or connected runtime model.
 */
export const fallbackOpenCodeModels: OpenCodeModelPreference[] = [
  { value: "local/default", providerId: "local", modelId: "default", label: { ar: "تلقائي من OpenCode", en: "OpenCode automatic" }, detail: { ar: "استخدم إعداد OpenCode المحلي عند تهيئته", en: "Use local OpenCode configuration when ready" }, source: "fallback" },
  { value: "anthropic/claude", providerId: "anthropic", modelId: "claude", label: { ar: "Anthropic · Claude", en: "Anthropic · Claude" }, detail: { ar: "تفضيل للمهام التحليلية المعقدة", en: "Preference for complex reasoning" }, source: "fallback" },
  { value: "openai/gpt", providerId: "openai", modelId: "gpt", label: { ar: "OpenAI · GPT", en: "OpenAI · GPT" }, detail: { ar: "تفضيل للتنفيذ والمراجعة", en: "Preference for execution and review" }, source: "fallback" },
  { value: "google/gemini", providerId: "google", modelId: "gemini", label: { ar: "Google · Gemini", en: "Google · Gemini" }, detail: { ar: "تفضيل للسياق والوسائط", en: "Preference for context and media" }, source: "fallback" },
  { value: "openrouter/auto", providerId: "openrouter", modelId: "auto", label: { ar: "OpenRouter · تلقائي", en: "OpenRouter · automatic" }, detail: { ar: "تفضيل يمر عبر المزود المهيأ محلياً", en: "Preference routed through the local provider" }, source: "fallback" },
];

export const initialOpenCodeCatalog: OpenCodeModelCatalog = {
  runtime: "unconfigured",
  models: fallbackOpenCodeModels,
};

export function getOpenCodeModel(catalog: OpenCodeModelCatalog, value: string): OpenCodeModelPreference {
  return catalog.models.find((model) => model.value === value) ?? catalog.models[0];
}

export function createOpenCodeChatEnvelope(input: {
  message: string;
  workspace: OpenCodeChatEnvelope["context"]["workspace"];
  language: OpenCodeChatEnvelope["context"]["language"];
  model: OpenCodeModelPreference;
}): OpenCodeChatEnvelope {
  return {
    message: input.message,
    context: { workspace: input.workspace, language: input.language },
    model: { providerId: input.model.providerId, modelId: input.model.modelId },
  };
}
