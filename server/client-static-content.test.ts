import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workspaceSource = readFileSync(
  resolve(process.cwd(), "client/src/components/OsamahWorkspace.tsx"),
  "utf8",
);
const authSource = readFileSync(
  resolve(process.cwd(), "client/src/components/AuthGate.tsx"),
  "utf8",
);

function readTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "ui" ? [] : readTsxFiles(path);
    return entry.name.endsWith(".tsx") ? [readFileSync(path, "utf8")] : [];
  });
}

const liveClientSources = [
  ...readTsxFiles(resolve(process.cwd(), "client/src/components")),
  ...readTsxFiles(resolve(process.cwd(), "client/src/pages")),
];

describe("الواجهة الخادمية الصادقة", () => {
  it("لا تعيد عبارات وكيل أو مشروع أو جاهزية مصطنعة إلى مساحة العمل", () => {
    const prohibitedWorkspacePhrases = [
      "Coffee Export",
      "8 connected files",
      "agent plan",
      "AI: Ready",
      "الذكاء الاصطناعي: جاهز",
      "Live context",
      "سياق حي",
      "All systems in sync",
      "جميع الأنظمة متزامنة",
      "يريد الوكيل تعديل 7 ملفات",
    ];

    for (const phrase of prohibitedWorkspacePhrases) {
      expect(workspaceSource).not.toContain(phrase);
    }
  });

  it("يصف مؤشرات بوابة الحساب بأنها محلية ولا يعلن جاهزية تشغيلية", () => {
    expect(authSource).toContain("واجهة حساب محلية");
    expect(authSource).toContain("Local account interface");
    expect(authSource).not.toContain("NODES: 03 READY");
    expect(authSource).not.toContain("المحطات: 03 جاهزة");
  });

  it("يستبعد الاسم والبريد من نموذج إنشاء الحساب المحلي", () => {
    expect(authSource).not.toContain('autoComplete="name"');
    expect(authSource).not.toContain('autoComplete="email"');
    expect(authSource).toContain("LOCAL_ACCOUNT_KEY_STORAGE");
  });

  it("يفحص كل مكونات وصفحات العميل الحية لعبارات الحالة المصطنعة المعروفة", () => {
    const prohibitedPhrases = [
      "Coffee Export",
      "8 connected files",
      "agent plan",
      "AI: Ready",
      "الذكاء الاصطناعي: جاهز",
      "Live context",
      "سياق حي",
      "All systems in sync",
      "جميع الأنظمة متزامنة",
      "يريد الوكيل تعديل 7 ملفات",
      "NODES: 03 READY",
      "المحطات: 03 جاهزة",
    ];

    for (const source of liveClientSources) {
      for (const phrase of prohibitedPhrases) expect(source).not.toContain(phrase);
    }
  });

  it("يبقي الأزرار التي كانت غير موصولة مرتبطة بتصرف واضح", () => {
    expect(workspaceSource).toContain('onClick={() => onNavigate("programming")}');
    const presentationSource = readFileSync(resolve(process.cwd(), "client/src/components/PresentationStudio.tsx"), "utf8");
    expect(presentationSource).toContain("onClick={() => setNotesExpanded(expanded => !expanded)}");
    expect(presentationSource).toContain("aria-expanded={notesExpanded}");
  });
});
