import { useEffect, useState } from "react";
import {
  Bell,
  Bot,
  Braces,
  Folder,
  LayoutDashboard,
  Moon,
  PlugZap,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  UserRound,
} from "lucide-react";

type Language = "ar" | "en";
type SettingsSection = "general" | "appearance" | "workspace" | "agents" | "notifications" | "integrations" | "security";

export type SavedPreferences = {
  language: Language;
  theme: "light" | "dark";
  emailNotifications: number;
  desktopNotifications: number;
  agentMode: "guided" | "review" | "manual";
};

export type AccountProfile = { name: string | null; email: string | null } | null | undefined;
export type ProfilePatch = { name?: string; email?: string };
export type PreferencePatch = Partial<{
  language: Language;
  theme: "light" | "dark";
  emailNotifications: boolean;
  desktopNotifications: boolean;
  agentMode: "guided" | "review" | "manual";
}>;

export function buildProfilePatch(name: string, email: string): ProfilePatch | null {
  const nextName = name.trim();
  const nextEmail = email.trim();
  const patch: ProfilePatch = {};
  if (nextName) patch.name = nextName;
  if (nextEmail) patch.email = nextEmail;
  return Object.keys(patch).length ? patch : null;
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className="toggle"><input aria-label={label} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span /></label>;
}

export default function ServerSettingsView({ lang, theme, onThemeChange, onLanguageChange, preferences, profile, isSaving, errorMessage, onPreferenceChange, onProfileSave }: {
  lang: Language;
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  onLanguageChange: (language: Language) => void;
  preferences?: SavedPreferences;
  profile: AccountProfile;
  isSaving: boolean;
  errorMessage?: string;
  onPreferenceChange: (input: PreferencePatch) => void;
  onProfileSave: (input: ProfilePatch) => void;
}) {
  const isAr = lang === "ar";
  const [active, setActive] = useState<SettingsSection>("general");
  const [name, setName] = useState(profile?.name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  useEffect(() => {
    setName(profile?.name ?? "");
    setEmail(profile?.email ?? "");
  }, [profile?.email, profile?.name]);

  const sections = isAr
    ? [{ id: "general" as const, label: "عام", icon: UserRound }, { id: "appearance" as const, label: "المظهر", icon: SlidersHorizontal }, { id: "workspace" as const, label: "مساحة العمل", icon: LayoutDashboard }, { id: "agents" as const, label: "الوكلاء والذكاء", icon: Bot }, { id: "notifications" as const, label: "الإشعارات", icon: Bell }, { id: "integrations" as const, label: "التكاملات", icon: PlugZap }, { id: "security" as const, label: "الأمان والخصوصية", icon: ShieldCheck }]
    : [{ id: "general" as const, label: "General", icon: UserRound }, { id: "appearance" as const, label: "Appearance", icon: SlidersHorizontal }, { id: "workspace" as const, label: "Workspace", icon: LayoutDashboard }, { id: "agents" as const, label: "Agents & AI", icon: Bot }, { id: "notifications" as const, label: "Notifications", icon: Bell }, { id: "integrations" as const, label: "Integrations", icon: PlugZap }, { id: "security" as const, label: "Security & privacy", icon: ShieldCheck }];
  const settingRow = (title: string, detail: string, control: React.ReactNode) => <div className="setting-row"><div><strong>{title}</strong><span>{detail}</span></div>{control}</div>;
  const selected = sections.find((section) => section.id === active)!;
  const profilePatch = buildProfilePatch(name, email);
  const header = isAr
    ? { general: ["ملفك الشخصي", "الإعدادات العامة", "بيانات الحساب واللغة محفوظة على الخادم."], appearance: ["التخصيص", "المظهر", "المظهر المختار محفوظ للحساب."], workspace: ["بيئة العمل", "مساحة العمل", "حدود الملكية والتعاون الحالية."], agents: ["OpenCode", "سياسة الوكيل", "الأسلوب المحفوظ قبل توفر التنفيذ."], notifications: ["الانتباه", "الإشعارات", "تفضيلات قابلة للحفظ بلا قناة تسليم حالياً."], integrations: ["التدفق المتصل", "التكاملات", "حالات الموصلات الفعلية فقط."], security: ["الثقة", "الأمان والخصوصية", "حدود حماية الحساب المحلي."] }
    : { general: ["Your profile", "General settings", "Account data and language are server-saved."], appearance: ["Customization", "Appearance", "The selected appearance is saved per account."], workspace: ["Work environment", "Workspace", "Current ownership and collaboration boundaries."], agents: ["OpenCode", "Agent policy", "The saved mode before execution is available."], notifications: ["Attention", "Notifications", "Saved preferences with no delivery channel yet."], integrations: ["Connected flow", "Integrations", "Only real connector states are shown."], security: ["Trust", "Security & privacy", "Protection boundaries of the local account."] };

  const panel = () => {
    if (active === "general") return <div className="settings-stack"><div className="profile-summary"><span>{(name || "OS").slice(0, 2).toUpperCase()}</span><div><strong>{name || (isAr ? "الحساب المحلي" : "Local account")}</strong><small>{isAr ? "الاسم والبريد بيانات اختيارية محفوظة خادمياً." : "Display name and email are optional server-saved metadata."}</small></div></div><div className="settings-form-grid"><label>{isAr ? "الاسم الظاهر (اختياري)" : "Display name (optional)"}<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>{isAr ? "البريد الإلكتروني (اختياري)" : "Email address (optional)"}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div><button disabled={isSaving || !profilePatch} onClick={() => { if (profilePatch) onProfileSave(profilePatch); }} className="secondary-settings-button">{isSaving ? (isAr ? "جارٍ الحفظ…" : "Saving…") : (isAr ? "حفظ الملف" : "Save profile")}</button>{settingRow(isAr ? "لغة التطبيق" : "Application language", isAr ? "تُحفظ لغة الواجهة واتجاهها للحساب الحالي." : "The interface language and direction are saved for this account.", <div className="segmented"><button onClick={() => onLanguageChange("en")} className={lang === "en" ? "selected" : ""}>English</button><button onClick={() => onLanguageChange("ar")} className={lang === "ar" ? "selected" : ""}>العربية</button></div>)}</div>;
    if (active === "appearance") return <div className="settings-stack">{settingRow(isAr ? "سمة التطبيق" : "Application theme", isAr ? "يُحفظ المظهر المختار للحساب الحالي." : "The selected appearance is saved for this account.", <div className="theme-options"><button onClick={() => onThemeChange("light")} className={`theme-option ${theme === "light" ? "selected" : ""}`}><Sun size={12} /> {isAr ? "فاتح" : "Light"}</button><button onClick={() => onThemeChange("dark")} className={`theme-option ${theme === "dark" ? "selected" : ""}`}><Moon size={12} /> {isAr ? "داكن" : "Dark"}</button></div>)}<div className="settings-note"><p>{isAr ? "الحركة غير الضرورية تحترم تفضيل تقليل الحركة في نظام التشغيل. لا توجد تفضيلات كثافة أو ألوان مخصصة محفوظة بعد." : "Non-essential motion respects the operating system’s reduced-motion preference. Density and custom accent preferences are not stored yet."}</p></div></div>;
    if (active === "workspace") return <div className="settings-stack">{settingRow(isAr ? "ملكية البيانات" : "Data ownership", isAr ? "المشاريع والملفات والمهام تخص الحساب الحالي فقط." : "Projects, files, and tasks belong only to the current account.", <div className="setting-value"><ShieldCheck size={14} /> {isAr ? "محمي" : "Protected"}</div>)}<div className="settings-note"><p>{isAr ? "دعوات المتعاونين ومشاركة مساحة العمل غير مهيأة بعد؛ لا يظهر مفتاح مشاركة شكلي." : "Collaborator invitations and workspace sharing are not configured; no cosmetic sharing toggle is shown."}</p></div></div>;
    if (active === "agents") return <div className="settings-stack"><div className="agent-config-card"><div><span className="eyebrow">OpenCode</span><strong>OpenCode</strong><p>{isAr ? "التنفيذ يتطلب خدمة OpenCode ومزوّد نماذج مهيأين على الخادم. لا يوجد نموذج نشط حالياً." : "Execution requires server-side OpenCode and a configured model provider. No active model is available currently."}</p></div><span className="agent-config-orbit"><Bot size={24} /></span></div>{settingRow(isAr ? "أسلوب الإشراف" : "Supervision mode", isAr ? "موجّه: يحفظ السياق. مراجعة: لا تغييرات قبل المراجعة. يدوي: لا تنفيذ تلقائي." : "Guided keeps context. Review requires review before changes. Manual performs no automatic action.", <div className="segmented"><button onClick={() => onPreferenceChange({ agentMode: "guided" })} className={preferences?.agentMode === "guided" ? "selected" : ""}>{isAr ? "موجّه" : "Guided"}</button><button onClick={() => onPreferenceChange({ agentMode: "review" })} className={preferences?.agentMode === "review" ? "selected" : ""}>{isAr ? "مراجعة" : "Review"}</button><button onClick={() => onPreferenceChange({ agentMode: "manual" })} className={preferences?.agentMode === "manual" ? "selected" : ""}>{isAr ? "يدوي" : "Manual"}</button></div>)}</div>;
    if (active === "notifications") return <div className="settings-stack"><div className="notification-preview"><Bell size={17} /><div><strong>{isAr ? "لا توجد قناة تسليم مهيأة" : "No delivery channel configured"}</strong><small>{isAr ? "التفضيلات التالية تُحفظ فقط؛ لا يرسل التطبيق حالياً بريداً أو إشعارات سطح مكتب." : "The preferences below are stored only; the application currently sends neither email nor desktop notifications."}</small></div></div>{settingRow(isAr ? "تفضيل إشعارات البريد" : "Email notification preference", isAr ? "يُحفظ لإتاحة قناة بريد مستقبلية." : "Stored for a future email delivery channel.", <Toggle checked={Boolean(preferences?.emailNotifications)} onChange={(emailNotifications) => onPreferenceChange({ emailNotifications })} label={isAr ? "تفضيل إشعارات البريد" : "Email notification preference"} />)}{settingRow(isAr ? "تفضيل إشعارات سطح المكتب" : "Desktop notification preference", isAr ? "يُحفظ دون طلب إذن المتصفح أو إرسال إشعارات حالياً." : "Stored without requesting browser permission or sending notifications yet.", <Toggle checked={Boolean(preferences?.desktopNotifications)} onChange={(desktopNotifications) => onPreferenceChange({ desktopNotifications })} label={isAr ? "تفضيل إشعارات سطح المكتب" : "Desktop notification preference"} />)}</div>;
    if (active === "integrations") return <div className="integration-grid">{[{ name: "GitHub", detail: isAr ? "لم يُربط من إعدادات هذا التطبيق." : "Not connected in this application.", icon: Braces }, { name: "Google Drive", detail: isAr ? "لا يوجد موصل مهيأ." : "No connector is configured.", icon: Folder }, { name: "Slack", detail: isAr ? "لا يوجد موصل مهيأ." : "No connector is configured.", icon: PlugZap }].map((integration) => { const Icon = integration.icon; return <article className="integration-card" key={integration.name}><span className="integration-icon"><Icon size={18} /></span><div><strong>{integration.name}</strong><p>{integration.detail}</p></div><span className="setting-value">{isAr ? "غير مهيأ" : "Not configured"}</span></article>; })}</div>;
    return <div className="settings-stack">{settingRow(isAr ? "الحساب المحلي" : "Local account", isAr ? "كلمة المرور وإجابة الاسترداد تُخزنان كتجزئات خادمية ولا تحفظان في المتصفح." : "The password and recovery answer are server-side hashes and are never stored in the browser.", <div className="setting-value"><ShieldCheck size={14} /> {isAr ? "مفعّل" : "Enabled"}</div>)}{settingRow(isAr ? "المصادقة الثنائية" : "Two-factor authentication", isAr ? "غير مهيأة للحسابات المحلية بعد." : "Not configured for local accounts yet.", <div className="setting-value">{isAr ? "غير متاح" : "Unavailable"}</div>)}<div className="settings-note"><p>{isAr ? "إدارة الجلسات ومفاتيح API ليست متاحة للحساب المحلي الحالي، ولذلك لا تُعرض كإجراءات شكلية." : "Session management and API keys are not available for the current local account, so they are not presented as cosmetic actions."}</p></div></div>;
  };

  return <div className="settings-view workspace-view"><aside className="settings-sidebar glass-panel"><div className="section-label-row"><span>{isAr ? "إعدادات التطبيق" : "Application settings"}</span></div>{sections.map((section) => { const Icon = section.icon; return <button onClick={() => setActive(section.id)} className={active === section.id ? "settings-active" : ""} key={section.id}><Icon size={15} />{section.label}</button>; })}</aside><section className="settings-main glass-panel"><div className="settings-title"><div><span className="eyebrow">{header[active][0]}</span><h2>{header[active][1]}</h2><p>{header[active][2]}</p></div></div><div className="settings-section-indicator"><selected.icon size={13} /><span>{selected.label}</span></div>{errorMessage && <div className="settings-note" role="alert"><p>{errorMessage}</p></div>}{panel()}</section></div>;
}
