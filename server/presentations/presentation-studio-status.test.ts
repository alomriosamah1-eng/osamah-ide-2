import { describe, expect, it } from "vitest";
import { getPresentationLoadErrorMessage } from "../../client/src/components/presentation-studio-status";

describe("presentation studio load error messages", () => {
  it("labels each failed server resource honestly in Arabic and English", () => {
    expect(getPresentationLoadErrorMessage("decks", "ar", new Error("timeout"))).toBe("تعذر تحميل العروض من الخادم — timeout");
    expect(getPresentationLoadErrorMessage("slides", "en", undefined)).toBe("Could not load slides from the server");
    expect(getPresentationLoadErrorMessage("presenton", "en", new Error("unavailable"))).toBe("Could not load Presenton status from the server — unavailable");
  });
});
