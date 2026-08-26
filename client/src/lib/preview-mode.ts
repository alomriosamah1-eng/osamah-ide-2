export function isTemporaryPreview(search: string) {
  return new URLSearchParams(search).get("preview") === "ui";
}

export const temporaryPreviewBoundary = {
  hasAccountData: false,
  allowsWrites: false,
  allowsAgentExecution: false,
} as const;
