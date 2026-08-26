import { useEffect, useMemo, useState } from "react";
import { BookOpen, Bot, Code2, Globe2, LayoutDashboard, Moon, Presentation, ShieldCheck, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import "./temporary-preview.css";

type Language = "ar" | "en";
type Section = "dashboard" | "programming" | "presentations" | "mind";

const copy = {
  ar: {
    title: "معاينة واجهة مقيدة",
    detail: "لا يوجد حساب أو بيانات محفوظة في هذه المعاينة. تبقى كل عمليات القراءة والكتابة والتنفيذ خلف تسجيل الدخول.",
    dashboard: "لوحة التحكم",
    programming: "البرمجة",
    presentations: "العروض التقديمية",
    mind: "العقل الثاني",
    language: "English",
    preview: "وضع معاينة مؤقت",
    access: "افتح الحساب للوصول إلى البيانات والعمليات المحفوظة.",
    agent: "دردشة الوكيل مقيدة",
    agentDetail: "لن تُرسل الرسائل أو السياق في وضع المعاينة. يتطلب التنفيذ حساباً ومزوّداً ونموذج OpenCode فعليين.",
    engineHeading: "حالة المصادر الحالية",
    return: "العودة إلى الحساب",
    light: "فاتح",
    dark: "داكن",
  },
  en: {
    title: "Restricted interface preview",
    detail: "This preview has no account or saved data. All reads, writes, and execution remain behind sign-in.",
    dashboard: "Dashboard",
    programming: "Programming",
    presentations: "Presentations",
    mind: "Second Mind",
    language: "عربي",
    preview: "Temporary preview mode",
    access: "Open an account to access saved data and operations.",
    agent: "Agent chat is restricted",
    agentDetail: "No messages or context are sent in preview mode. Execution requires an account and a real OpenCode provider and model.",
    engineHeading: "Current source status",
    return: "Return to account",
    light: "Light",
    dark: "Dark",
  },
} as const;

const sectionMeta = {
  dashboard: LayoutDashboard,
  programming: Code2,
  presentations: Presentation,
  mind: BookOpen,
} as const;

export default function TemporaryPreviewWorkspace() {
  const [language, setLanguage] = useState<Language>("ar");
  const [section, setSection] = useState<Section>("dashboard");
  const { theme, setTheme } = useTheme();
  const isAr = language === "ar";
  const t = copy[language];
  const SectionIcon = sectionMeta[section];
  const navigation = useMemo(() => ([
    ["dashboard", t.dashboard],
    ["programming", t.programming],
    ["presentations", t.presentations],
    ["mind", t.mind],
  ] as const), [t.dashboard, t.mind, t.presentations, t.programming]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    document.body.classList.toggle("lang-ar", isAr);
    document.body.classList.toggle("lang-en", !isAr);
  }, [isAr, language]);

  const returnToAccount = () => {
    window.location.assign(window.location.pathname);
  };

  return (
    <div className="osamah-app preview-workspace">
      <header className="app-topbar">
        <div className="brand-block">
          <img className="brand-mark" src="/manus-storage/osamah-orbit-mark_bc7fec06.png" alt="Osamah IDE" />
          <div className="brand-name"><strong><b>OSAMAH</b><i aria-hidden="true" /><em>IDE</em></strong><span>{t.preview}</span></div>
        </div>
        <div className="topbar-actions">
          <button className="language-toggle" onClick={() => setLanguage(isAr ? "en" : "ar")}><Globe2 size={15} /><span>{t.language}</span></button>
          <button className="theme-toggle" onClick={() => setTheme?.(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}<span>{theme === "dark" ? t.light : t.dark}</span></button>
          <button className="profile-button" onClick={returnToAccount}><span><ShieldCheck size={15} /></span><span>{t.return}</span></button>
        </div>
      </header>
      <div className="preview-banner" role="status"><ShieldCheck size={17} /><span>{t.preview}: {t.detail}</span></div>
      <div className="app-shell">
        <aside className="main-nav">
          <div className="nav-items">{navigation.map(([key, label]) => { const Icon = sectionMeta[key]; return <button key={key} onClick={() => setSection(key)} className={`nav-item ${section === key ? "nav-active" : ""}`}><Icon size={18} /><span>{label}</span>{section === key && <i />}</button>; })}</div>
          <div className="nav-bottom"><div className="connection-state"><span className="signal signal-amber" /><span>{t.preview}</span></div></div>
        </aside>
        <main className="main-workspace">
          <div className="context-bar"><div className="context-label"><SectionIcon size={15} /><strong>{navigation.find(([key]) => key === section)?.[1]}</strong></div><div className="context-states"><span><ShieldCheck size={13} /> {t.access}</span></div></div>
          <div className="workspace-content preview-content">
            <section className="preview-stage glass-panel">
              <span className="eyebrow"><ShieldCheck size={14} /> {t.preview}</span>
              <h1>{t.title}</h1>
              <p>{t.detail}</p>
              <div className="preview-empty-state"><SectionIcon size={28} /><strong>{t.access}</strong><small>{isAr ? "لا تُجرى استعلامات حساب أو عمليات CRUD هنا." : "No account queries or CRUD operations run here."}</small></div>
            </section>
            <section className="preview-engines glass-panel">
              <h2>{t.engineHeading}</h2>
              <div><span>OpenCode</span><strong>{isAr ? "غير مهيأ: لا مزوّد أو نموذج مكتشف" : "Unconfigured: no provider or model discovered"}</strong></div>
              <div><span>Eclipse Theia</span><strong>{isAr ? "بيئة المتصفح غير مبنية" : "Browser runtime is not built"}</strong></div>
              <div><span>Presenton</span><strong>{isAr ? "صحي محلياً؛ لا توليد أو تصدير" : "Locally healthy; no generation or export"}</strong></div>
              <div><span>Second Brain</span><strong>{isAr ? "المستخرج فقط هو النشط" : "Only the extractor is active"}</strong></div>
            </section>
          </div>
        </main>
        <aside className="ai-panel glass-panel preview-agent">
          <div className="ai-panel-head"><div className="ai-identity"><span className="ai-mark"><Bot size={18} /></span><div><strong>OSAMAH AI</strong><span>{t.agent}</span></div></div></div>
          <div className="ai-context-card"><span>{t.agent}</span><strong>{t.agentDetail}</strong></div>
          <textarea rows={4} disabled aria-label={t.agent} placeholder={isAr ? "يتطلب الإرسال حساباً ومزوّداً حقيقياً" : "Sending requires an account and a real provider"} />
          <button className="composer-send" disabled><Bot size={16} /><span>{isAr ? "غير متاح" : "Unavailable"}</span></button>
        </aside>
      </div>
      <footer className="status-bar"><div><span className="signal signal-amber" /> {t.preview}</div><div><span>{isAr ? "لا بيانات حساب" : "No account data"}</span><span>{isAr ? "لا عمليات كتابة" : "No write operations"}</span></div></footer>
    </div>
  );
}
