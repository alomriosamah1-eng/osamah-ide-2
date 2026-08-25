export type PresentationResource = "decks" | "slides" | "presenton";
export type PresentationLanguage = "ar" | "en";

const labels: Record<PresentationLanguage, Record<PresentationResource, string>> = {
  ar: { decks: "العروض", slides: "الشرائح", presenton: "حالة Presenton" },
  en: { decks: "presentations", slides: "slides", presenton: "Presenton status" },
};

export function getPresentationLoadErrorMessage(resource: PresentationResource, language: PresentationLanguage, error: unknown) {
  const detail = error instanceof Error && error.message.trim() ? ` — ${error.message.trim()}` : "";
  return language === "ar"
    ? `تعذر تحميل ${labels[language][resource]} من الخادم${detail}`
    : `Could not load ${labels[language][resource]} from the server${detail}`;
}
