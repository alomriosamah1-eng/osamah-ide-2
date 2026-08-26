import { describe, expect, it } from "vitest";
import { isTemporaryPreview, temporaryPreviewBoundary } from "./preview-mode";

describe("temporary UI preview", () => {
  it("لا يفعّل المعاينة إلا عبر العلامة الصريحة في الرابط", () => {
    expect(isTemporaryPreview("?preview=ui")).toBe(true);
    expect(isTemporaryPreview("?preview=anything-else")).toBe(false);
    expect(isTemporaryPreview("")).toBe(false);
  });

  it("يعرّف حدود معاينة لا تكشف بيانات حساب ولا تسمح بالكتابة أو تنفيذ الوكيل", () => {
    expect(temporaryPreviewBoundary).toEqual({
      hasAccountData: false,
      allowsWrites: false,
      allowsAgentExecution: false,
    });
  });
});
