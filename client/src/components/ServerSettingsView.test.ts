import { describe, expect, it } from "vitest";
import { buildProfilePatch } from "./ServerSettingsView";

describe("buildProfilePatch", () => {
  it("يحفظ الاسم الظاهر وحده بوصفه بيانات حساب اختيارية", () => {
    expect(buildProfilePatch("  أسامة  ", "")).toEqual({ name: "أسامة" });
  });

  it("يحفظ البريد وحده بوصفه بيانات حساب اختيارية", () => {
    expect(buildProfilePatch("", "  osamah@example.test  ")).toEqual({ email: "osamah@example.test" });
  });

  it("لا ينشئ طلب تحديث عندما تكون حقول البيانات الاختيارية فارغة", () => {
    expect(buildProfilePatch("   ", "  ")).toBeNull();
  });
});
