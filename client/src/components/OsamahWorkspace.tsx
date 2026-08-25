/**
 * Design philosophy — Quiet Intelligence Observatory:
 * A calm, premium desktop command room with blue-orbit context cues, smoked-glass panels,
 * and the AI layer integrated into each workspace rather than isolated as a generic chat.
 */
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOpenCodeChatEnvelope, getOpenCodeModel, initialOpenCodeCatalog } from "@/lib/opencode-contract";
import "./opencode-model.css";
import {
  Bell,
  BookOpen,
  Bot,
  Braces,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Command,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  Globe2,
  Grid2X2,
  LayoutDashboard,
  Maximize2,
  MoreHorizontal,
  Moon,
  PanelRightClose,
  Play,
  Plus,
  Presentation,
  PlugZap,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TerminalSquare,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";

type Language = "ar" | "en";
type Workspace = "dashboard" | "programming" | "presentations" | "mind" | "settings";
type SettingsSection = "general" | "appearance" | "workspace" | "agents" | "notifications" | "integrations" | "security";

const content = {
  en: {
    brandTag: "ONE AI CORE · THREE WORKSPACES",
    search: "Search or run a command…",
    dashboard: "Dashboard",
    programming: "Programming",
    presentations: "Presentations",
    mind: "Second Mind",
    settings: "Settings",
    workspace: "Workspace",
    aiReady: "AI: Ready",
    notifications: "Notifications",
    quickActions: "Quick actions",
    recentWork: "Recent work",
    aiActivity: "AI activity",
    welcome: "Research context is ready.",
    welcomeDetail: "Export research, 8 connected files, and an agent plan are ready to become your investor presentation.",
    viewAll: "View all",
    open: "Open",
    askAI: "Ask Osamah AI…",
    send: "Send",
    context: "Context",
    activeTasks: "Active tasks",
    allClear: "All systems in sync",
    project: "Coffee Export",
    newProject: "New project",
    draftPresentation: "Draft presentation",
    reviewPlan: "Review agent plan",
    newPresentation: "New presentation",
    askMind: "Ask Second Mind",
    openWorkspace: "Open workspace",
    startTask: "Start AI task",
    language: "عربي",
    overview: "Overview",
    status: "Ready",
  },
  ar: {
    brandTag: "نواة ذكاء واحدة · ثلاث مساحات عمل",
    search: "ابحث أو شغّل أمراً…",
    dashboard: "لوحة التحكم",
    programming: "البرمجة",
    presentations: "العروض التقديمية",
    mind: "العقل الثاني",
    settings: "الإعدادات",
    workspace: "مساحة العمل",
    aiReady: "الذكاء الاصطناعي: جاهز",
    notifications: "الإشعارات",
    quickActions: "إجراءات سريعة",
    recentWork: "العمل الأخير",
    aiActivity: "نشاط الذكاء الاصطناعي",
    welcome: "سياق البحث جاهز للتحويل.",
    welcomeDetail: "بحث التصدير و8 ملفات مترابطة وخطة الوكيل جاهزة الآن لمسودة عرض المستثمرين.",
    viewAll: "عرض الكل",
    open: "فتح",
    askAI: "اسأل ذكاء أسامة…",
    send: "إرسال",
    context: "السياق",
    activeTasks: "المهام النشطة",
    allClear: "جميع الأنظمة متزامنة",
    project: "تصدير القهوة",
    newProject: "مشروع جديد",
    draftPresentation: "صياغة العرض",
    reviewPlan: "مراجعة خطة الوكيل",
    newPresentation: "عرض تقديمي جديد",
    askMind: "اسأل العقل الثاني",
    openWorkspace: "افتح مساحة عمل",
    startTask: "ابدأ مهمة ذكية",
    language: "English",
    overview: "نظرة عامة",
    status: "جاهز",
  },
} as const;

const workspaceMeta: Record<Workspace, { icon: typeof LayoutDashboard; accent: string }> = {
  dashboard: { icon: LayoutDashboard, accent: "blue" },
  programming: { icon: Code2, accent: "violet" },
  presentations: { icon: Presentation, accent: "coral" },
  mind: { icon: BookOpen, accent: "cyan" },
  settings: { icon: Settings2, accent: "slate" },
};

function Signal({ tone = "blue", pulse = false }: { tone?: "blue" | "green" | "amber" | "coral" | "cyan" | "slate"; pulse?: boolean }) {
  return <span className={`signal signal-${tone} ${pulse ? "signal-pulse" : ""}`} aria-hidden="true" />;
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="section-label-row">
      <span>{children}</span>
      {action}
    </div>
  );
}

function GlassButton({
  children,
  onClick,
  className = "",
  icon,
  ariaLabel,
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button className={`glass-button ${className}`} onClick={onClick} aria-label={ariaLabel}>
      {icon}
      {children}
    </button>
  );
}

function WorkMetric({ value, label, accent }: { value: string; label: string; accent: "blue" | "violet" | "coral" }) {
  return (
    <div className="work-metric">
      <span className={`metric-bar metric-${accent}`} />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function TaskRow({
  title,
  detail,
  state = "active",
  progress,
}: {
  title: string;
  detail: string;
  state?: "active" | "done" | "queued";
  progress?: number;
}) {
  return (
    <div className="task-row">
      <Signal tone={state === "done" ? "green" : state === "queued" ? "slate" : "blue"} pulse={state === "active"} />
      <div className="task-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
        {progress !== undefined && (
          <span className="progress-track" aria-label={`${progress}%`}>
            <i style={{ width: `${progress}%` }} />
          </span>
        )}
      </div>
      <MoreHorizontal size={16} />
    </div>
  );
}

function AgentPanel({ workspace, lang, collapsed, onCollapse }: { workspace: Workspace; lang: Language; collapsed: boolean; onCollapse: () => void }) {
  const isAr = lang === "ar";
  const [draft, setDraft] = useState("");
  const [modelCatalog] = useState(initialOpenCodeCatalog);
  const [selectedModelValue, setSelectedModelValue] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "agent" | "user"; text: string; model?: string }>>([]);
  const selectedModel = useMemo(
    () => getOpenCodeModel(modelCatalog, selectedModelValue),
    [modelCatalog, selectedModelValue],
  );
  const runtimeState = {
    unconfigured: {
      label: isAr ? "OpenCode غير مهيأ" : "OpenCode not configured",
      detail: isAr ? "لم تُكتشف أي نماذج حتى الآن. شغّل OpenCode وهيّئ مزوداً فيه لعرض القائمة." : "No models have been discovered. Start OpenCode and configure a provider there to populate this list.",
      tone: "amber" as const,
    },
    checking: {
      label: isAr ? "يتم فحص OpenCode" : "Checking OpenCode",
      detail: isAr ? "بانتظار نتيجة صحة موثقة من OpenCode." : "Awaiting a verified health result from OpenCode.",
      tone: "blue" as const,
    },
    ready: {
      label: isAr ? "OpenCode جاهز" : "OpenCode ready",
      detail: isAr ? "تم اكتشاف نماذج مهيأة من OpenCode. تُفعّل الرسائل عند توصيل بوابة التنفيذ." : "Configured models were discovered from OpenCode. Messages activate when the execution gateway is connected.",
      tone: "green" as const,
    },
    degraded: {
      label: isAr ? "المحرك يحتاج مراجعة" : "Runtime needs attention",
      detail: isAr ? "لا يُرسل أي طلب حتى تعود الصحة والنماذج الفعلية." : "No request is sent until health and real models recover.",
      tone: "coral" as const,
    },
    offline: {
      label: isAr ? "OpenCode غير متاح" : "OpenCode offline",
      detail: isAr ? "احتفظت الواجهة بتفضيلك محلياً ولم تُرسل الرسالة." : "The interface retained your preference locally and did not send the message.",
      tone: "slate" as const,
    },
  }[modelCatalog.runtime];
  const labels = {
    dashboard: isAr ? "ملخص المهام الموحدة" : "Unified task brief",
    programming: isAr ? "تنفيذ نظام المصادقة" : "Implement authentication system",
    presentations: isAr ? "إنشاء عرض عن تصدير القهوة اليمنية" : "Create a deck on Yemeni coffee exports",
    mind: isAr ? "تحليل سياق البحث" : "Analyze research context",
    settings: isAr ? "تكوين بيئة العمل" : "Configure your workspace",
  };
  const activity = {
    dashboard: isAr ? ["اكتمل مخطط العرض", "يجري بناء نظام المصادقة", "تحليل مستندات البحث"] : ["Presentation outline completed", "Building authentication system", "Analyzing research documents"],
    programming: isAr ? ["تم فحص المشروع", "تم تحليل البنية", "يجري تعديل auth.service.ts"] : ["Scanned project", "Analyzed architecture", "Editing auth.service.ts"],
    presentations: isAr ? ["تم فهم الموضوع", "تم إنشاء الهيكل", "يجري تصميم الشريحة 4"] : ["Understanding topic", "Built presentation structure", "Designing slide 4"],
    mind: isAr ? ["تمت فهرسة 12 مستنداً", "تم ربط 4 مفاهيم", "يجري تحليل البحث"] : ["Indexed 12 documents", "Connected 4 related concepts", "Analyzing research"],
    settings: isAr ? ["تمت مراجعة النماذج", "الصلاحيات آمنة", "اقتراح تحسينات"] : ["Models reviewed", "Permissions secure", "Suggesting refinements"],
  };
  const chatSeed = {
    dashboard: isAr ? "لديّ سياق متصل عبر مساحات عملك. ما الخطوة التي تريد تشغيلها أولاً؟" : "I have connected context across your workspaces. What would you like to move forward first?",
    programming: isAr ? "تحققت من auth.service.ts. يمكنني الآن معالجة انتهاء الجلسة أو كتابة اختبارات التكامل." : "I reviewed auth.service.ts. I can handle session expiry or write the integration tests next.",
    presentations: isAr ? "تستند الشريحة 4 إلى سياق البحث الحالي. يمكنني صياغة القصة أو تحسين المقاييس." : "Slide 4 is grounded in the current research context. I can refine its story or strengthen the metrics.",
    mind: isAr ? "ربطت مصادر البحث الرئيسية. هل أستخرج الرؤى القابلة للاستخدام في عرض المستثمرين؟" : "I connected the key research sources. Should I extract insights ready for the investor deck?",
    settings: isAr ? "إعدادات مساحة العمل مستقرة. أستطيع اقتراح تهيئة أنسب لنمط عملك." : "Your workspace settings are stable. I can suggest a configuration that better fits how you work.",
  };
  const chatPrompts = {
    dashboard: isAr ? ["رتّب أولوياتي", "أنشئ خطة اليوم"] : ["Prioritize my work", "Create today’s plan"],
    programming: isAr ? ["اشرح التعديل", "أضف الاختبارات"] : ["Explain this change", "Add the tests"],
    presentations: isAr ? ["حسّن القصة", "اقترح شريحة"] : ["Strengthen the story", "Suggest a slide"],
    mind: isAr ? ["استخرج الرؤى", "اربط المصادر"] : ["Extract insights", "Connect sources"],
    settings: isAr ? ["اقترح تهيئة", "راجع الإعدادات"] : ["Suggest a setup", "Review settings"],
  };
  const chatReply = {
    dashboard: isAr ? "سأرتب العمل حسب أثره على عرض المستثمرين وأضع الخطوة التالية في الطابور." : "I’ll prioritize the work by its impact on the investor deck and queue the next action.",
    programming: isAr ? "سأجهز تعديلاً قابلاً للمراجعة وأعرض الاختبارات المتأثرة قبل تطبيقه." : "I’ll prepare a reviewable change and show the affected tests before applying it.",
    presentations: isAr ? "سأستخدم البحث المتصل لتحويل هذه النقطة إلى قصة أوضح قابلة للعرض." : "I’ll use the connected research to turn this into a clearer, presentation-ready story.",
    mind: isAr ? "سأجمع الأدلة ذات الصلة في ملخص قصير مع الروابط التي تدعمه." : "I’ll collect the relevant evidence into a concise synthesis with the links that support it.",
    settings: isAr ? "سأقارن الإعداد الحالي بنمط عملك وأقترح التعديل الأقل إزعاجاً." : "I’ll compare the current setup against your workflow and suggest the least disruptive adjustment.",
  };

  useEffect(() => {
    setDraft("");
    setMessages([{ role: "agent", text: chatSeed[workspace] }]);
  }, [workspace, lang]);

  const sendMessage = (text = draft) => {
    const message = text.trim();
    if (!message) return;
    const envelope = createOpenCodeChatEnvelope({ message, workspace, language: lang, model: selectedModel });
    const modelNotice = isAr
      ? selectedModel
        ? `لم تُرسل رسالتك بعد. حُفظت مع نموذج OpenCode المكتشف ${selectedModel.label.ar} (${envelope.model?.providerId}/${envelope.model?.modelId}) بانتظار بوابة التنفيذ.`
        : "لم تُرسل رسالتك لأن OpenCode لم يكتشف نموذجاً مهيأً بعد. شغّل OpenCode وهيّئ مزوداً أولاً."
      : selectedModel
        ? `Your message was not sent yet. It was retained with the discovered OpenCode model ${selectedModel.label.en} (${envelope.model?.providerId}/${envelope.model?.modelId}) while the execution gateway is pending.`
        : "Your message was not sent because OpenCode has not discovered a configured model yet. Start OpenCode and configure a provider first.";
    setMessages((current) => [
      ...current,
      { role: "user", text: message, model: selectedModel?.label[lang] },
      { role: "agent", text: modelNotice, model: runtimeState.label },
    ]);
    setDraft("");
  };

  if (collapsed) {
    return (
      <aside className="ai-rail">
        <button className="ai-rail-mark" onClick={onCollapse} aria-label={isAr ? "فتح مساعد الذكاء الاصطناعي" : "Open AI assistant"}>
          <img src="/manus-storage/osamah-orbit-mark_bc7fec06.png" alt="" />
          <Signal tone="blue" pulse />
        </button>
      </aside>
    );
  }

  return (
    <aside className="ai-panel glass-panel">
      <div className="ai-panel-head">
        <div className="ai-identity">
          <span className="ai-mark"><img src="/manus-storage/osamah-orbit-mark_bc7fec06.png" alt="" /></span>
          <div>
            <strong>OSAMAH AI</strong>
            <span><Signal tone="blue" pulse /> {isAr ? "متصل بالسياق" : "Context connected"}</span>
          </div>
        </div>
        <GlassButton className="icon-control" onClick={onCollapse} icon={<PanelRightClose size={16} />} ariaLabel={isAr ? "طي المساعد" : "Collapse assistant"} />
      </div>

      <div className="ai-context-card">
        <span>{isAr ? "المهمة الحالية" : "Current task"}</span>
        <strong>{labels[workspace]}</strong>
        <div className="context-chip"><Sparkles size={13} /> {isAr ? "وضع الوكيل" : "Agent mode"}</div>
      </div>

      <div className="agent-steps">
        <SectionLabel>{isAr ? "نشاط الوكيل" : "Agent activity"}</SectionLabel>
        {activity[workspace].map((item, index) => (
          <div className="agent-step" key={item}>
            <span className={index < 2 ? "step-done" : "step-working"}>{index < 2 ? "✓" : ""}</span>
            <span>{item}</span>
          </div>
        ))}
        <div className="agent-step agent-step-muted"><span className="step-empty" /> <span>{isAr ? "انتظار اعتمادك" : "Waiting for your approval"}</span></div>
      </div>

      <div className="agent-task-list">
        <SectionLabel>{isAr ? "طابور المهام" : "Task queue"}</SectionLabel>
        <TaskRow title={isAr ? "إضافة اختبارات" : "Add tests"} detail={isAr ? "بعد المهمة الحالية" : "After current task"} state="queued" />
        <TaskRow title={isAr ? "تحديث التبعيات" : "Update dependencies"} detail={isAr ? "تمت بنجاح" : "Completed"} state="done" />
      </div>

      <div className="agent-conversation" aria-label={isAr ? "دردشة وكيل مساحة العمل" : "Workspace agent chat"}>
        <SectionLabel action={<span className="agent-context-status"><Signal tone="blue" pulse /> {isAr ? "سياق حي" : "Live context"}</span>}>{isAr ? "دردشة الوكيل" : "Agent chat"}</SectionLabel>
        <div className="agent-messages">
          {messages.slice(-3).map((message, index) => <div className={`agent-message message-${message.role}`} key={`${message.role}-${index}-${message.text}`}><span>{message.role === "agent" ? "OS" : isAr ? "أنت" : "You"}</span>{message.model && <small className="message-model-tag">{message.model}</small>}<p>{message.text}</p></div>)}
        </div>
        <div className="agent-prompt-row">{chatPrompts[workspace].map((prompt) => <button key={prompt} onClick={() => sendMessage(prompt)}>{prompt}</button>)}</div>
      </div>

      <div className="ai-composer">
        <textarea rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder={isAr ? "اطلب من ذكاء أسامة…" : "Ask Osamah AI…"} aria-label={isAr ? "رسالة للمساعد" : "Message the assistant"} />
        <div className={`opencode-runtime-card runtime-${modelCatalog.runtime}`} role="status" aria-live="polite">
          <span><Signal tone={runtimeState.tone} pulse={modelCatalog.runtime === "checking"} /> OpenCode runtime</span>
          <strong>{runtimeState.label}</strong>
          <small>{runtimeState.detail}</small>
        </div>
        <div className="opencode-model-row">
          <div className="opencode-model-copy">
            <span><Signal tone="blue" pulse /> OpenCode</span>
            <small>{isAr ? "نماذج OpenCode المكتشفة" : "Discovered OpenCode models"}</small>
          </div>
          <Select value={selectedModelValue} onValueChange={setSelectedModelValue} disabled={modelCatalog.models.length === 0}>
            <SelectTrigger className="opencode-model-trigger" size="sm" aria-label={isAr ? "اختيار نموذج OpenCode" : "Choose an OpenCode model"}>
              <SelectValue placeholder={isAr ? "بانتظار نماذج OpenCode" : "Waiting for OpenCode models"} />
            </SelectTrigger>
            <SelectContent className="opencode-model-content" align={isAr ? "start" : "end"} dir={isAr ? "rtl" : "ltr"}>
              {modelCatalog.models.map((model) => (
                <SelectItem key={model.value} value={model.value} className="opencode-model-option">
                  <span className="opencode-model-option-copy"><strong>{model.label[lang]}</strong><small>{model.detail[lang]} · {model.providerId}/{model.modelId}</small></span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="composer-foot">
          <span><Command size={12} /> {isAr ? "مرتبط بـ" : "Grounded in"} {labels[workspace]}</span>
          <button onClick={() => sendMessage()} aria-label={isAr ? "إرسال" : "Send"}><Send size={15} /></button>
        </div>
      </div>
    </aside>
  );
}

function Dashboard({ lang, onNavigate, onCommand }: { lang: Language; onNavigate: (workspace: Workspace) => void; onCommand: () => void }) {
  const t = content[lang];
  const isAr = lang === "ar";
  const workspaces = [
    { key: "programming" as const, title: t.programming, subtitle: isAr ? "بيئة تطوير مدعومة بالوكيل" : "AI-powered development environment", asset: "code", metrics: [["12", isAr ? "مشروعاً" : "Projects"], ["3", isAr ? "مهام نشطة" : "Active tasks"], ["2", isAr ? "مشكلتان" : "Problems"]] },
    { key: "presentations" as const, title: t.presentations, subtitle: isAr ? "استوديو لإنشاء وتحرير العروض" : "Presentation creation & editing studio", asset: "slides", metrics: [["5", isAr ? "عروض" : "Presentations"], ["1", isAr ? "عرض نشط" : "Active deck"], ["AI", isAr ? "جاهز" : "Ready"]] },
    { key: "mind" as const, title: t.mind, subtitle: isAr ? "مساحة المعرفة والسياق المتصل" : "Connected knowledge & context workspace", asset: "mind", metrics: [["42", isAr ? "عنصر معرفة" : "Knowledge items"], ["6", isAr ? "وكلاء" : "Agents"], ["8", isAr ? "روابط جديدة" : "New links"]] },
  ];
  const recents = isAr
    ? [["مشروع ألفا", "برمجة", "منذ 18 دقيقة", "68%"], ["خطة عمل القهوة", "عرض تقديمي", "أمس", "42%"], ["بحث التصدير الإقليمي", "العقل الثاني", "قبل 3 أيام", "81%"]]
    : [["Project Alpha", "Programming", "18 min ago", "68%"], ["Coffee Business Plan", "Presentation", "Yesterday", "42%"], ["Regional Export Research", "Second Mind", "3 days ago", "81%"]];

  return (
    <div className="dashboard-view">
      <section className="dashboard-welcome glass-panel">
        <div className="welcome-copy">
          <div className="eyebrow"><Signal tone="blue" pulse /> {t.overview}</div>
          <h1>{t.welcome}</h1>
          <p>{t.welcomeDetail}</p>
          <div className="welcome-actions">
            <GlassButton className="primary-action orbit-cta" onClick={() => onNavigate("presentations")} icon={<Presentation size={16} />}>{t.draftPresentation}</GlassButton>
            <GlassButton className="subtle-action" onClick={onCommand} icon={<Bot size={15} />}>{t.reviewPlan}</GlassButton>
          </div>
        </div>
        <img className="dashboard-orbit" src="/manus-storage/osamah-dashboard-orbit_3b3fcfc5.png" alt="" />
        <div className="orbital-stats" aria-label={isAr ? "حالة منصة الذكاء الاصطناعي" : "AI platform status"}>
          <div><span>{isAr ? "مهام الذكاء اليوم" : "AI tasks today"}</span><strong>14</strong></div>
          <div><span>{isAr ? "مؤشر السياق" : "Context health"}</span><strong className="healthy"><Signal tone="green" /> 98%</strong></div>
        </div>
      </section>

      <section className="quick-section">
        <SectionLabel action={<button className="text-action" onClick={onCommand}>{t.viewAll} <ChevronRight size={14} /></button>}>{t.quickActions}</SectionLabel>
        <div className="quick-actions">
          <button onClick={() => onNavigate("programming")}><span className="quick-icon quick-blue"><Braces size={19} /></span><span>{t.newProject}</span><kbd>⌘ N</kbd></button>
          <button onClick={() => onNavigate("presentations")}><span className="quick-icon quick-blue quick-blue-soft"><Presentation size={19} /></span><span>{t.newPresentation}</span><kbd>⌘ P</kbd></button>
          <button onClick={() => onNavigate("mind")}><span className="quick-icon quick-blue quick-blue-pale"><Sparkles size={18} /></span><span>{t.askMind}</span><kbd>⌘ M</kbd></button>
          <button onClick={onCommand}><span className="quick-icon quick-blue quick-blue-deep"><WandSparkles size={18} /></span><span>{t.startTask}</span><kbd>⌘ K</kbd></button>
        </div>
      </section>

      <section className="workspace-catalog">
        <SectionLabel>{isAr ? "مساحات العمل" : "Workspaces"}</SectionLabel>
        <div className="workspace-rows">
          {workspaces.map((space, index) => {
            const Icon = workspaceMeta[space.key].icon;
            return (
              <button className="workspace-row" onClick={() => onNavigate(space.key)} key={space.key}>
                <span className={`workspace-index index-${space.key}`}>0{index + 1}</span>
                <span className={`workspace-symbol symbol-${space.key}`}><Icon size={22} /></span>
                <span className="workspace-copy"><strong>{space.title}</strong><small>{space.subtitle}</small></span>
                <span className="workspace-metrics">{space.metrics.map(([value, label], metricIndex) => <WorkMetric key={label} value={value} label={label} accent={metricIndex === 0 ? "blue" : metricIndex === 1 ? "violet" : "coral"} />)}</span>
                <span className="open-arrow"><ChevronRight size={18} /></span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="dashboard-lower-grid">
        <section className="recent-panel glass-panel">
          <SectionLabel action={<button className="text-action">{t.viewAll} <ChevronRight size={14} /></button>}>{t.recentWork}</SectionLabel>
          <div className="recent-list">
            {recents.map(([name, type, when, progress], index) => (
              <div className="recent-row" key={name}>
                <span className={`recent-doc doc-${index}`}><FileText size={17} /></span>
                <div><strong>{name}</strong><span>{type} · {when}</span></div>
                <span className="recent-progress"><i style={{ width: progress }} />{progress}</span>
                <button aria-label={`${t.open} ${name}`}><ChevronRight size={16} /></button>
              </div>
            ))}
          </div>
        </section>
        <section className="activity-panel glass-panel">
          <SectionLabel>{t.aiActivity}</SectionLabel>
          <TaskRow title={isAr ? "اكتمل مخطط العرض" : "Presentation outline complete"} detail={isAr ? "استوديو العروض · الآن" : "Presentation Studio · now"} state="done" />
          <TaskRow title={isAr ? "يجري بناء نظام المصادقة" : "Building authentication system"} detail={isAr ? "البرمجة · دقيقتان متبقيتان" : "Programming · 2 min remaining"} state="active" progress={68} />
          <TaskRow title={isAr ? "تحليل مستندات البحث" : "Analyzing research documents"} detail={isAr ? "العقل الثاني · يعمل في الخلفية" : "Second Mind · background"} state="active" progress={81} />
        </section>
      </div>
    </div>
  );
}

function ExplorerItem({ icon, label, active, depth = 0, badge }: { icon: React.ReactNode; label: string; active?: boolean; depth?: number; badge?: string }) {
  return <button className={`explorer-item ${active ? "explorer-active" : ""}`} style={{ paddingInlineStart: `${12 + depth * 16}px` }}>{icon}<span>{label}</span>{badge && <small>{badge}</small>}</button>;
}

function Programming({ lang }: { lang: Language }) {
  const isAr = lang === "ar";
  const lines = [
    ["import", " { createClient } ", "from", " './client';"],
    ["import", " { sessionStore } ", "from", " '../stores/session';"],
    ["", ""],
    ["export", " async ", "function", " authenticateUser(credentials: LoginPayload) {"],
    ["  ", "const", " client = createClient();"],
    ["", ""],
    ["  ", "try", " {"],
    ["    ", "const", " response = ", "await", " client.post('/auth/login', credentials);"],
    ["    sessionStore.set(response.data.session);"],
    ["    ", "return", " response.data;"],
    ["  } ", "catch", " (error) {"],
    ["    ", "throw", " new AuthenticationError(error);"],
    ["  }"],
    ["}"],
  ];
  return (
    <div className="programming-view workspace-view">
      <div className="workspace-toolbar">
        <div className="toolbar-tabs"><button className="active-tab"><FileCode2 size={15} /> auth.service.ts <X size={13} /></button><button><FileCode2 size={15} /> routes.ts <X size={13} /></button><button className="toolbar-add"><Plus size={15} /></button></div>
        <div className="toolbar-controls"><button><Play size={14} /> {isAr ? "تشغيل" : "Run"}</button><button><MoreHorizontal size={17} /></button></div>
      </div>
      <div className="programming-grid">
        <aside className="project-explorer glass-panel">
          <SectionLabel action={<button aria-label="Project options"><MoreHorizontal size={15} /></button>}>{isAr ? "المستكشف" : "Explorer"}</SectionLabel>
          <div className="project-title"><ChevronDown size={14} /> COFFEE-EXPORT-WEB <MoreHorizontal size={14} /></div>
          <div className="file-tree">
            <ExplorerItem icon={<ChevronDown size={14} />} label="src" />
            <ExplorerItem icon={<ChevronDown size={14} />} label="components" depth={1} />
            <ExplorerItem icon={<FileCode2 size={14} />} label="AuthForm.tsx" depth={2} />
            <ExplorerItem icon={<ChevronDown size={14} />} label="services" depth={1} />
            <ExplorerItem icon={<FileCode2 size={14} />} label="auth.service.ts" depth={2} active badge="M" />
            <ExplorerItem icon={<FileCode2 size={14} />} label="api.ts" depth={2} />
            <ExplorerItem icon={<Folder size={14} />} label="hooks" depth={1} />
            <ExplorerItem icon={<Folder size={14} />} label="pages" depth={1} />
            <ExplorerItem icon={<FolderOpen size={14} />} label="public" />
            <ExplorerItem icon={<FileText size={14} />} label="package.json" />
            <ExplorerItem icon={<FileText size={14} />} label="README.md" />
          </div>
          <div className="explorer-footer"><button><Search size={14} /> {isAr ? "بحث في الملفات" : "Search files"}</button><button><Bot size={14} /> {isAr ? "سياق الوكيل" : "Agent context"}</button></div>
        </aside>
        <section className="code-stage glass-panel">
          <div className="breadcrumb"><Folder size={13} /> src <ChevronRight size={12} /> services <ChevronRight size={12} /> <span>auth.service.ts</span><span className="modified-indicator">M</span></div>
          <div className="code-editor" dir="ltr">
            {lines.map((parts, index) => <div className="code-line" key={index}><span className="line-number">{index + 1}</span><code>{parts.map((part, partIndex) => <span key={partIndex} className={part === "import" || part === "from" || part === "export" || part === "function" || part === "const" || part === "try" || part === "catch" || part === "throw" || part === "await" || part === "return" ? "token-keyword" : part.includes("Authentication") ? "token-type" : part.includes("'") ? "token-string" : ""}>{part}</span>)}</code></div>)}
          </div>
          <div className="editor-hint"><Sparkles size={13} /> {isAr ? "اقتراح الوكيل: أضف معالجة حالة انتهاء الجلسة" : "Agent suggestion: add session-expiry handling"}<button>{isAr ? "عرض التعديل" : "Preview change"}</button></div>
        </section>
      </div>
      <section className="terminal-panel glass-panel" dir="ltr">
        <div className="terminal-tabs"><button className="active-terminal">TERMINAL</button><button>OUTPUT</button><button>PROBLEMS <span>2</span></button><button>AGENT LOG</button><button>TASKS</button><button className="terminal-expand"><Maximize2 size={14} /></button></div>
        <div className="terminal-content"><p><span>osamah@workspace</span>:~$ pnpm test auth</p><p className="terminal-muted"> RUNS  src/services/auth.service.test.ts</p><p className="terminal-ok"> ✓ validates invalid credentials <em>18ms</em></p><p className="terminal-live"><Signal tone="blue" pulse /> Agent is running integration checks…</p></div>
      </section>
    </div>
  );
}

function Presentations({ lang }: { lang: Language }) {
  const isAr = lang === "ar";
  const [selectedSlide, setSelectedSlide] = useState(3);
  const slides = isAr
    ? [
      { title: "الغلاف", kicker: "COFFEE EXPORTS / 2026", headline: "قهوة يمنية، فرصة عالمية", detail: "عرض استثماري يرتكز على التاريخ والندرة والنمو المتسارع في القهوة المتخصصة.", metric: "$24M", metricLabel: "قيمة تصدير محتملة", signal: "+18%", signalLabel: "نمو سنوي", note: "ابدأ بالقصة: أصل نادر، طلب متزايد، وفرصة لبناء علامة ذات قيمة." },
      { title: "المشكلة", kicker: "MARKET GAP / 01", headline: "قصة مميزة لم تُترجم إلى قيمة", detail: "يفتقد المنتج مساراً متسقاً من المنشأ إلى السوق المتخصصة العالمي.", metric: "3×", metricLabel: "فرق القيمة", signal: "41%", signalLabel: "فجوة الجودة", note: "اربط التحدي بتأثيره على المزارع والمشتري النهائي دون الإطالة." },
      { title: "الحل", kicker: "VALUE SYSTEM / 02", headline: "سلسلة قيمة يمكن تتبعها", detail: "نموذج يربط المنتجين والفرز والقصص والبيع المباشر في سياق واحد.", metric: "12", metricLabel: "شريكاً محلياً", signal: "100%", signalLabel: "قابل للتتبع", note: "أبرز كيف يحول النظام المصدر إلى ميزة تنافسية قابلة للقياس." },
      { title: "السوق", kicker: "COFFEE EXPORTS / 2026", headline: "فرصة القهوة اليمنية", detail: "بناء حضور مميز في سوق القهوة المتخصصة العالمي.", metric: "$24M", metricLabel: "قيمة تصدير محتملة", signal: "+18%", signalLabel: "نمو سنوي", note: "أضف قصة تقدم هذه الفرصة بوضوح وتربطها ببيانات البحث الحالية." },
      { title: "نموذج العمل", kicker: "BUSINESS MODEL / 04", headline: "هوامش محسّنة عبر الجودة", detail: "خليط من التوريد المباشر والبيع بالجملة والشراكات مع المحامص المتخصصة.", metric: "42%", metricLabel: "هامش مستهدف", signal: "3", signalLabel: "قنوات دخل", note: "استخدم أرقاماً قليلة ومقروءة؛ اترك التفاصيل للملحق." },
      { title: "الاستراتيجية", kicker: "GO-TO-MARKET / 05", headline: "ابدأ بالأسواق التي تقدّر المنشأ", detail: "مرحلة تجريبية مركزة مع محامص مرجعية ثم توسع محسوب حسب الطلب.", metric: "18", metricLabel: "شهراً للتوسع", signal: "2", signalLabel: "أسواق أولية", note: "بيّن تسلسل التنفيذ بوضوح: إثبات، شراكات، ثم تكرار." },
      { title: "الخلاصة", kicker: "INVESTMENT CASE / 06", headline: "وقت مناسب لبناء الفئة", detail: "فرصة واضحة لتحويل قيمة المنشأ إلى عمل قابل للنمو.", metric: "$1.8M", metricLabel: "جولة مستهدفة", signal: "2026", signalLabel: "بداية التنفيذ", note: "اختم بطلب محدد وخطوة تالية يمكن اتخاذها اليوم." },
    ]
    : [
      { title: "Cover", kicker: "COFFEE EXPORTS / 2026", headline: "Yemeni coffee, global opportunity", detail: "An investment case built on heritage, scarcity, and specialty coffee growth.", metric: "$24M", metricLabel: "Export potential", signal: "+18%", signalLabel: "Annual growth", note: "Open with the story: scarce origin, rising demand, and a value-led brand opportunity." },
      { title: "Problem", kicker: "MARKET GAP / 01", headline: "A distinctive story not yet priced", detail: "The product lacks a consistent path from origin to the global specialty market.", metric: "3×", metricLabel: "Value gap", signal: "41%", signalLabel: "Quality gap", note: "Connect the challenge to its impact on growers and the eventual buyer without over-explaining." },
      { title: "Solution", kicker: "VALUE SYSTEM / 02", headline: "A traceable value chain", detail: "A system that connects producers, sorting, stories, and direct selling in one context.", metric: "12", metricLabel: "Local partners", signal: "100%", signalLabel: "Traceable", note: "Show how the system turns origin into a measurable competitive advantage." },
      { title: "Market", kicker: "COFFEE EXPORTS / 2026", headline: "Yemen’s Coffee Opportunity", detail: "Building a distinctive position in the global specialty market.", metric: "$24M", metricLabel: "Export potential", signal: "+18%", signalLabel: "Annual growth", note: "Add a narrative that frames this opportunity clearly and ties it to the current research." },
      { title: "Business model", kicker: "BUSINESS MODEL / 04", headline: "Better margins through quality", detail: "A blend of direct sourcing, wholesale, and specialty-roaster partnerships.", metric: "42%", metricLabel: "Target margin", signal: "3", signalLabel: "Revenue channels", note: "Use a small number of legible metrics and leave detailed assumptions for the appendix." },
      { title: "Strategy", kicker: "GO-TO-MARKET / 05", headline: "Start where origin is valued", detail: "A focused pilot with reference roasters, then measured expansion with demand.", metric: "18", metricLabel: "Months to scale", signal: "2", signalLabel: "Initial markets", note: "Make the execution sequence explicit: prove, partner, repeat." },
      { title: "Conclusion", kicker: "INVESTMENT CASE / 06", headline: "The right time to build the category", detail: "A clear opportunity to turn origin value into a scalable business.", metric: "$1.8M", metricLabel: "Target round", signal: "2026", signalLabel: "Execution start", note: "Close with a specific ask and a next step that can happen today." },
    ];
  const activeSlide = slides[selectedSlide];
  return (
    <div className="presentations-view workspace-view">
      <div className="presentation-ribbon">
        <div className="deck-name"><Presentation size={17} /><span>{isAr ? "تصدير القهوة اليمنية" : "Yemeni Coffee Exports"}</span><span className="saved-state"><Signal tone="green" /> {isAr ? "محفوظ" : "Saved"}</span></div>
        <div className="ribbon-menu">{(isAr ? ["ملف", "الرئيسية", "إدراج", "تصميم", "تخطيط", "حركة", "انتقالات", "عرض", "ذكاء اصطناعي"] : ["File", "Home", "Insert", "Design", "Layout", "Animate", "Transition", "View", "AI"]).map((item, index) => <button className={index === 1 ? "ribbon-active" : ""} key={item}>{item}</button>)}</div>
        <div className="ribbon-actions"><button><Play size={14} /> {isAr ? "تقديم" : "Present"}</button><button><MoreHorizontal size={17} /></button></div>
      </div>
      <div className="presentation-grid">
        <aside className="slide-navigator glass-panel">
          <SectionLabel action={<button><Plus size={14} /></button>}>{isAr ? "الشرائح" : "Slides"}</SectionLabel>
          <div className="slides-list">
            {slides.map((slide, index) => <button onClick={() => setSelectedSlide(index)} className={`slide-thumb ${index === selectedSlide ? "slide-selected" : ""}`} key={slide.title}><span className="slide-number">{String(index + 1).padStart(2, "0")}</span><span className={`mini-slide mini-${index}`}><i /><i /><i /></span><strong>{slide.title}</strong></button>)}
          </div>
        </aside>
        <section className="slide-workbench">
          <div className="canvas-tools"><button><Plus size={14} /> {isAr ? "شريحة" : "Slide"}</button><button><Grid2X2 size={14} /> {isAr ? "تخطيط" : "Layout"}</button><button><SlidersHorizontal size={14} /> {isAr ? "خصائص" : "Properties"}</button><span>75%</span><button><Plus size={13} /></button></div>
          <div className="slide-canvas-wrap">
            <div className="slide-canvas">
              <div className="slide-canvas-decoration"><span /><span /><span /></div>
              <p className="canvas-kicker">{activeSlide.kicker}</p>
              <h2>{activeSlide.headline}</h2>
              <p>{activeSlide.detail}</p>
              <div className="canvas-stats"><span><b>{activeSlide.metric}</b><small>{activeSlide.metricLabel}</small></span><span><b>{activeSlide.signal}</b><small>{activeSlide.signalLabel}</small></span></div>
              <div className="canvas-curve" />
            </div>
          </div>
          <div className="speaker-notes"><button><ChevronDown size={15} /> {isAr ? "ملاحظات المتحدث" : "Speaker notes"}</button><span>{activeSlide.note}</span></div>
        </section>
      </div>
    </div>
  );
}

function SecondMind({ lang }: { lang: Language }) {
  const isAr = lang === "ar";
  const [focusedNode, setFocusedNode] = useState("coffee");
  const sources = isAr ? ["المشاريع", "الأبحاث", "المستندات", "الأفكار", "التعلّم"] : ["Projects", "Research", "Documents", "Ideas", "Learning"];
  const nodes = isAr
    ? {
      research: { label: "بحث التصدير", domain: "نتائج بحث التصدير", insight: "يربط البحث بين عودة الاهتمام بالقهوة ذات المنشأ الواضح وطلب المشترين على التتبع.", source: "بحث التصدير 2026", type: "بحث · 12 رابطاً" },
      coffee: { label: "القهوة اليمنية", domain: "مجال البحث: القهوة اليمنية", insight: "تظهر ثلاثة مصادر متصلة أن ندرة المنشأ وسرد القصة يمكن أن يرفعا القيمة في السوق المتخصصة.", source: "ملخص السوق 2026", type: "مستند · مرتبط الآن" },
      market: { label: "السوق العالمي", domain: "إشارات السوق العالمي", insight: "تشير مؤشرات الطلب إلى مساحة أولية مناسبة مع المحامص المتخصصة في أوروبا والخليج.", source: "خريطة الطلب العالمي", type: "تحليل · 8 روابط" },
      deck: { label: "عرض المستثمرين", domain: "سياق عرض المستثمرين", insight: "يمكن تحويل الأدلة الحالية إلى ثلاث رسائل: المنشأ، نظام القيمة، وخطة التوسع.", source: "هيكل العرض الحالي", type: "عرض · 6 شرائح" },
      plan: { label: "خطة العمل", domain: "سياق خطة العمل", insight: "تتصل افتراضات النمو بثلاثة شركاء محليين وبنموذج التوريد المباشر المقترح.", source: "خطة التشغيل الأولية", type: "خطة · 9 روابط" },
      task: { label: "مهام التحقق", domain: "سياق مهام التحقق", insight: "تحتاج فرضيتان فقط إلى مصدر إضافي قبل أن تصبح مسودة الاستثمار جاهزة للمراجعة.", source: "قائمة التحقق", type: "مهام · 4 عناصر" },
    }
    : {
      research: { label: "Export research", domain: "Export research findings", insight: "The research connects renewed interest in traceable origin coffee with buyer demand for provenance.", source: "Export research 2026", type: "Research · 12 links" },
      coffee: { label: "Yemeni coffee", domain: "Research domain: Yemeni coffee", insight: "Three connected sources show how origin scarcity and a clear narrative can command value in specialty markets.", source: "Market summary 2026", type: "Document · linked now" },
      market: { label: "Global market", domain: "Global market signals", insight: "Demand signals point to a strong initial opening with specialty roasters in Europe and the Gulf.", source: "Global demand map", type: "Analysis · 8 links" },
      deck: { label: "Investor deck", domain: "Investor deck context", insight: "The current evidence can become three messages: origin, value system, and expansion plan.", source: "Current deck structure", type: "Presentation · 6 slides" },
      plan: { label: "Business plan", domain: "Business plan context", insight: "Growth assumptions connect to three local partners and the proposed direct-sourcing model.", source: "Initial operating plan", type: "Plan · 9 links" },
      task: { label: "Validation tasks", domain: "Validation task context", insight: "Only two hypotheses need another source before the investment draft is ready for review.", source: "Validation checklist", type: "Tasks · 4 items" },
    };
  const focused = nodes[focusedNode as keyof typeof nodes];
  return (
    <div className="mind-view workspace-view">
      <div className="mind-toolbar"><div><span className="eyebrow"><Signal tone="cyan" pulse /> {isAr ? "ذاكرة متصلة" : "Connected memory"}</span><h2>{isAr ? "قاعدة معرفة تصدير القهوة" : "Coffee Export Knowledge Base"}</h2></div><div className="mind-toolbar-actions"><button><Search size={15} /> {isAr ? "بحث ذكي" : "Smart search"}</button><button><Plus size={15} /> {isAr ? "إضافة سياق" : "Add context"}</button></div></div>
      <div className="mind-grid">
        <aside className="knowledge-sidebar glass-panel">
          <SectionLabel>{isAr ? "المعرفة" : "Knowledge"}</SectionLabel>
          <div className="knowledge-nav">{sources.map((source, index) => <button key={source} className={index === 1 ? "knowledge-active" : ""}><span><Folder size={15} /> {source}</span><small>{[8, 14, 23, 6, 11][index]}</small></button>)}</div>
          <div className="knowledge-side-bottom"><span>{isAr ? "مساحة التخزين" : "Storage"}</span><strong>4.8 GB <em>/ 20 GB</em></strong><div><i /></div></div>
        </aside>
        <section className="knowledge-stage glass-panel">
          <div className="knowledge-stage-head"><div><span>{isAr ? "خريطة العلاقة" : "Relationship map"}</span><strong>{focused.domain}</strong></div><button><MoreHorizontal size={17} /></button></div>
          <div className="graph-field">
            <svg viewBox="0 0 760 430" preserveAspectRatio="none" aria-hidden="true"><path d="M125 130 C230 70 340 170 400 202 S590 120 654 185" /><path d="M160 320 C280 240 332 270 400 202 S535 280 610 320" /><path d="M125 130 C175 206 125 254 160 320" /><path d="M654 185 C580 236 610 270 610 320" /><path d="M400 202 C340 148 312 127 270 111" /></svg>
            <button onClick={() => setFocusedNode("research")} className={`graph-node node-research ${focusedNode === "research" ? "graph-node-active" : ""}`}><BookOpen size={16} /><span>{nodes.research.label}</span></button>
            <button onClick={() => setFocusedNode("coffee")} className={`graph-node node-coffee ${focusedNode === "coffee" ? "graph-node-active" : ""}`}><Sparkles size={17} /><span>{nodes.coffee.label}</span></button>
            <button onClick={() => setFocusedNode("market")} className={`graph-node node-market ${focusedNode === "market" ? "graph-node-active" : ""}`}><Globe2 size={15} /><span>{nodes.market.label}</span></button>
            <button onClick={() => setFocusedNode("deck")} className={`graph-node node-deck ${focusedNode === "deck" ? "graph-node-active" : ""}`}><Presentation size={15} /><span>{nodes.deck.label}</span></button>
            <button onClick={() => setFocusedNode("plan")} className={`graph-node node-plan ${focusedNode === "plan" ? "graph-node-active" : ""}`}><FileText size={15} /><span>{nodes.plan.label}</span></button>
            <button onClick={() => setFocusedNode("task")} className={`graph-node node-task ${focusedNode === "task" ? "graph-node-active" : ""}`}><Clock3 size={15} /><span>{nodes.task.label}</span></button>
          </div>
          <div className="graph-legend"><span><i className="legend-cyan" />{isAr ? "وثيقة" : "Document"}</span><span><i className="legend-blue" />{isAr ? "فكرة مركزية" : "Core idea"}</span><span><i className="legend-violet" />{isAr ? "مشروع" : "Project"}</span></div>
        </section>
        <aside className="insight-panel glass-panel">
          <SectionLabel>{isAr ? "رؤية الذكاء الاصطناعي" : "AI insight"}</SectionLabel>
          <p>{focused.insight}</p>
          <button className="insight-source"><span><FileText size={15} /></span><div><strong>{focused.source}</strong><small>{focused.type}</small></div><ChevronRight size={14} /></button>
          <button className="insight-action"><Sparkles size={14} /> {isAr ? "استكشف الروابط" : "Explore connections"}</button>
          <div className="mind-visual"><img src="/manus-storage/osamah-knowledge-constellation_c14372aa.png" alt="" /></div>
        </aside>
      </div>
    </div>
  );
}

function SettingsToggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="toggle"><input aria-label={label} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span /></label>;
}

function SettingsView({ lang, theme, onThemeChange, onLanguageChange }: { lang: Language; theme: "light" | "dark"; onThemeChange: (theme: "light" | "dark") => void; onLanguageChange: (language: Language) => void }) {
  const isAr = lang === "ar";
  const [active, setActive] = useState<SettingsSection>("general");
  const [motion, setMotion] = useState(true);
  const [agentMemory, setAgentMemory] = useState(true);
  const [agentApproval, setAgentApproval] = useState(true);
  const [desktopAlerts, setDesktopAlerts] = useState(true);
  const [digest, setDigest] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);
  const [workspaceSharing, setWorkspaceSharing] = useState(false);
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({ github: true, drive: false, slack: false });
  const sections: Array<{ id: SettingsSection; label: string; icon: typeof Settings2 }> = isAr
    ? [{ id: "general", label: "عام", icon: UserRound }, { id: "appearance", label: "المظهر", icon: SlidersHorizontal }, { id: "workspace", label: "مساحة العمل", icon: LayoutDashboard }, { id: "agents", label: "الوكلاء والذكاء", icon: Bot }, { id: "notifications", label: "الإشعارات", icon: Bell }, { id: "integrations", label: "التكاملات", icon: PlugZap }, { id: "security", label: "الأمان والخصوصية", icon: ShieldCheck }]
    : [{ id: "general", label: "General", icon: UserRound }, { id: "appearance", label: "Appearance", icon: SlidersHorizontal }, { id: "workspace", label: "Workspace", icon: LayoutDashboard }, { id: "agents", label: "Agents & AI", icon: Bot }, { id: "notifications", label: "Notifications", icon: Bell }, { id: "integrations", label: "Integrations", icon: PlugZap }, { id: "security", label: "Security & privacy", icon: ShieldCheck }];
  const sectionMeta = sections.find((section) => section.id === active)!;
  const details: Record<SettingsSection, { eyebrow: string; title: string; subtitle: string }> = isAr
    ? { general: { eyebrow: "ملفك الشخصي", title: "الإعدادات العامة", subtitle: "هوية حسابك ولغة التطبيق وطريقة بداية العمل." }, appearance: { eyebrow: "التخصيص", title: "المظهر", subtitle: "اضبط بيئة العمل لتناسب أسلوب تركيزك." }, workspace: { eyebrow: "بيئة العمل", title: "مساحة العمل", subtitle: "نظّم مشروعك الافتراضي وتفضيلات التعاون." }, agents: { eyebrow: "ذكاء أسامة", title: "الوكلاء والذكاء", subtitle: "تحكم في ذاكرة الوكيل وحدود التنفيذ والمراجعة." }, notifications: { eyebrow: "الانتباه", title: "الإشعارات", subtitle: "اختر اللحظات التي تستحق أن تقاطع تركيزك." }, integrations: { eyebrow: "التدفق المتصل", title: "التكاملات", subtitle: "اربط أدواتك كي يعمل الوكيل في السياق الصحيح." }, security: { eyebrow: "الثقة", title: "الأمان والخصوصية", subtitle: "أدِر الوصول، المفاتيح، والجلسات النشطة." } }
    : { general: { eyebrow: "Your profile", title: "General settings", subtitle: "Your account identity, language, and starting context." }, appearance: { eyebrow: "Customization", title: "Appearance", subtitle: "Tune the workspace to suit how you focus." }, workspace: { eyebrow: "Work environment", title: "Workspace", subtitle: "Organize the default project and collaboration preferences." }, agents: { eyebrow: "Osamah AI", title: "Agents & AI", subtitle: "Control agent memory, execution boundaries, and review." }, notifications: { eyebrow: "Attention", title: "Notifications", subtitle: "Choose the moments that deserve to interrupt your focus." }, integrations: { eyebrow: "Connected flow", title: "Integrations", subtitle: "Connect your tools so the agent can work in the right context." }, security: { eyebrow: "Trust", title: "Security & privacy", subtitle: "Manage access, keys, and active sessions." } };
  const settingRow = (title: string, detail: string, control: React.ReactNode) => <div className="setting-row"><div><strong>{title}</strong><span>{detail}</span></div>{control}</div>;
  const panel = () => {
    if (active === "general") return <div className="settings-stack"><div className="profile-summary"><span>OS</span><div><strong>Osamah Al-Harbi</strong><small>{isAr ? "مالك مساحة عمل Osamah IDE" : "Owner of the Osamah IDE workspace"}</small></div><button className="secondary-settings-button">{isAr ? "تغيير الصورة" : "Change photo"}</button></div><div className="settings-form-grid"><label>{isAr ? "الاسم الظاهر" : "Display name"}<input defaultValue="Osamah Al-Harbi" /></label><label>{isAr ? "البريد الإلكتروني" : "Email address"}<input defaultValue="osamah@example.com" /></label></div>{settingRow(isAr ? "لغة التطبيق" : "Application language", isAr ? "تتغير لغة الواجهة والاتجاه فوراً." : "The interface language and direction update immediately.", <div className="segmented"><button onClick={() => onLanguageChange("en")} className={lang === "en" ? "selected" : ""}>English</button><button onClick={() => onLanguageChange("ar")} className={lang === "ar" ? "selected" : ""}>العربية</button></div>)}{settingRow(isAr ? "المساحة عند البدء" : "Start in workspace", isAr ? "افتح لوحة التحكم في بداية كل جلسة." : "Open the command dashboard at the start of each session.", <div className="setting-value"><LayoutDashboard size={14} /> {isAr ? "لوحة التحكم" : "Dashboard"}</div>)}</div>;
    if (active === "appearance") return <div className="settings-stack">{settingRow(isAr ? "سمة التطبيق" : "Application theme", theme === "dark" ? (isAr ? "الواجهة الداكنة الهادئة نشطة عبر مساحات عملك." : "Quiet dark is active across your workspaces.") : (isAr ? "واجهة فاتحة وواضحة نشطة الآن." : "A clear light workspace is active."), <div className="theme-options"><button onClick={() => onThemeChange("light")} className={`theme-option ${theme === "light" ? "selected" : ""}`}><Sun size={12} /> {isAr ? "فاتح" : "Light"}</button><button onClick={() => onThemeChange("dark")} className={`theme-option ${theme === "dark" ? "selected" : ""}`}><Moon size={12} /> {isAr ? "داكن" : "Dark"}</button></div>)}{settingRow(isAr ? "لون المدار" : "Orbit accent", isAr ? "يستخدم للسياق النشط ومؤشرات الذكاء." : "Used for active context and AI signals.", <div className="accent-picker"><button className="accent-picked" /><button className="accent-cyan" /><button className="accent-violet" /><button className="accent-coral" /></div>)}{settingRow(isAr ? "كثافة الواجهة" : "Interface density", isAr ? "اتساع متوازن لمراجعة العمل المعقد." : "Balanced breathing room for complex work.", <div className="segmented"><button>{isAr ? "مكثف" : "Compact"}</button><button className="selected">{isAr ? "مريح" : "Comfortable"}</button></div>)}{settingRow(isAr ? "حركة الواجهة" : "Interface motion", isAr ? "انتقالات هادئة وسريعة بين الألواح." : "Quiet, quick transitions between panels.", <SettingsToggle checked={motion} onChange={setMotion} label={isAr ? "حركة الواجهة" : "Interface motion"} />)}</div>;
    if (active === "workspace") return <div className="settings-stack"><div className="settings-form-grid"><label>{isAr ? "اسم مساحة العمل" : "Workspace name"}<input defaultValue="Osamah IDE" /></label><label>{isAr ? "الفرع الافتراضي" : "Default branch"}<input defaultValue="main" /></label></div>{settingRow(isAr ? "مشاركة مساحة العمل" : "Workspace sharing", isAr ? "اسمح بدعوة متعاونين ومشاركة سياق المشروع." : "Allow collaborators to be invited and share project context.", <SettingsToggle checked={workspaceSharing} onChange={setWorkspaceSharing} label={isAr ? "مشاركة مساحة العمل" : "Workspace sharing"} />)}{settingRow(isAr ? "السياق النشط" : "Active context", isAr ? "8 ملفات وبحث التصدير متصلان حالياً." : "8 files and export research are currently connected.", <div className="setting-value"><Signal tone="green" /> {isAr ? "متصل" : "Connected"}</div>)}<div className="settings-note"><Sparkles size={15} /><p>{isAr ? "يبقى السياق المشترك متاحاً للوكلاء في البرمجة والعروض والعقل الثاني." : "Shared context remains available to agents in Programming, Presentations, and Second Mind."}</p></div></div>;
    if (active === "agents") return <div className="settings-stack"><div className="agent-config-card"><div><span className="eyebrow"><Signal tone="blue" /> {isAr ? "الوكيل الافتراضي" : "Default agent"}</span><strong>OSAMAH AI</strong><p>{isAr ? "مساعد سياقي لتخطيط وتحويل العمل بين مساحاتك." : "A contextual assistant that moves work across your spaces."}</p></div><span className="agent-config-orbit"><Bot size={24} /></span></div>{settingRow(isAr ? "ذاكرة مساحة العمل" : "Workspace memory", isAr ? "اسمح للوكيل باستخدام السجل والسياق المتصل." : "Let the agent use workspace history and connected context.", <SettingsToggle checked={agentMemory} onChange={setAgentMemory} label={isAr ? "ذاكرة مساحة العمل" : "Workspace memory"} />)}{settingRow(isAr ? "موافقة قبل التعديل" : "Review before changes", isAr ? "اطلب موافقة قبل تعديل الملفات أو المهام." : "Request approval before modifying files or tasks.", <SettingsToggle checked={agentApproval} onChange={setAgentApproval} label={isAr ? "الموافقة قبل التعديل" : "Review before changes"} />)}{settingRow(isAr ? "النموذج النشط" : "Active model", isAr ? "نموذج متوازن للتخطيط والتنفيذ." : "Balanced model for planning and execution.", <button className="secondary-settings-button">{isAr ? "متوازن" : "Balanced"} <ChevronDown size={13} /></button>)}</div>;
    if (active === "notifications") return <div className="settings-stack"><div className="notification-preview"><Bell size={17} /><div><strong>{isAr ? "مراجعة بانتظارك" : "Review waiting"}</strong><small>{isAr ? "يريد الوكيل تعديل 7 ملفات" : "The agent wants to modify 7 files"}</small></div><span>{isAr ? "الآن" : "Now"}</span></div>{settingRow(isAr ? "إشعارات سطح المكتب" : "Desktop notifications", isAr ? "تنبيه للموافقات والمهام المكتملة." : "Alert for approvals and completed tasks.", <SettingsToggle checked={desktopAlerts} onChange={setDesktopAlerts} label={isAr ? "إشعارات سطح المكتب" : "Desktop notifications"} />)}{settingRow(isAr ? "ملخص يومي" : "Daily digest", isAr ? "موجز هادئ لنشاط المساحات مرة يومياً." : "A quiet workspace activity summary once a day.", <SettingsToggle checked={digest} onChange={setDigest} label={isAr ? "ملخص يومي" : "Daily digest"} />)}{settingRow(isAr ? "قناة الملخص" : "Digest channel", isAr ? "يُرسل إلى مركز الإشعارات داخل التطبيق." : "Delivered to the in-app notification center.", <div className="setting-value"><Bell size={14} /> {isAr ? "داخل التطبيق" : "In app"}</div>)}</div>;
    if (active === "integrations") return <div className="integration-grid">{[{ key: "github", name: "GitHub", detail: isAr ? "المشاريع والفروع وطلبات الدمج" : "Projects, branches, and pull requests", icon: Braces }, { key: "drive", name: "Google Drive", detail: isAr ? "المستندات والبحث المتصل" : "Documents and connected research", icon: Folder }, { key: "slack", name: "Slack", detail: isAr ? "التحديثات والموافقة من الفريق" : "Team updates and approvals", icon: Command }].map((integration) => { const Icon = integration.icon; const connected = integrations[integration.key]; return <article className="integration-card" key={integration.key}><span className="integration-icon"><Icon size={18} /></span><div><strong>{integration.name}</strong><p>{integration.detail}</p></div><button onClick={() => setIntegrations((current) => ({ ...current, [integration.key]: !current[integration.key] }))} className={connected ? "integration-connected" : "secondary-settings-button"}>{connected ? (isAr ? "متصل" : "Connected") : (isAr ? "ربط" : "Connect")}</button></article>; })}</div>;
    return <div className="settings-stack"><div className="security-score"><span><ShieldCheck size={20} /></span><div><strong>{isAr ? "أمان مساحة العمل قوي" : "Workspace security is strong"}</strong><p>{isAr ? "لا توجد توصيات عاجلة تحتاج إلى إجراء." : "No urgent recommendations need action."}</p></div><b>92</b></div>{settingRow(isAr ? "المصادقة الثنائية" : "Two-factor authentication", isAr ? "طبقة تحقق إضافية عند تسجيل الدخول." : "An additional verification step at sign-in.", <SettingsToggle checked={twoFactor} onChange={setTwoFactor} label={isAr ? "المصادقة الثنائية" : "Two-factor authentication"} />)}{settingRow(isAr ? "الجلسات النشطة" : "Active sessions", isAr ? "جلسة واحدة نشطة على هذا الجهاز." : "One session is active on this device.", <button className="secondary-settings-button">{isAr ? "إدارة" : "Manage"}</button>)}{settingRow(isAr ? "مفاتيح API" : "API keys", isAr ? "لا مفاتيح مخصصة محفوظة في مساحة العمل." : "No custom keys are stored in this workspace.", <button className="secondary-settings-button">{isAr ? "عرض المفاتيح" : "View keys"}</button>)}</div>;
  };
  return <div className="settings-view workspace-view"><aside className="settings-sidebar glass-panel"><SectionLabel>{isAr ? "إعدادات التطبيق" : "Application settings"}</SectionLabel>{sections.map((section) => { const Icon = section.icon; return <button onClick={() => setActive(section.id)} className={active === section.id ? "settings-active" : ""} key={section.id}><Icon size={15} />{section.label}</button>; })}</aside><section className="settings-main glass-panel"><div className="settings-title"><div><span className="eyebrow"><Signal tone="blue" /> {details[active].eyebrow}</span><h2>{details[active].title}</h2><p>{details[active].subtitle}</p></div><button onClick={() => { setActive("general"); onThemeChange("dark"); }} className="reset-button">{isAr ? "استعادة الافتراضي" : "Reset default"}</button></div><div className="settings-section-indicator"><sectionMeta.icon size={13} /><span>{sectionMeta.label}</span></div>{panel()}</section></div>;
}

function CommandPalette({ lang, onClose, onNavigate }: { lang: Language; onClose: () => void; onNavigate: (workspace: Workspace) => void }) {
  const isAr = lang === "ar";
  const commands: Array<[string, string, Workspace | null, React.ReactNode]> = isAr
    ? [["اسأل ذكاء أسامة", "ابدأ محادثة مع السياق الحالي", null, <Bot size={16} />], ["إنشاء مشروع", "مساحة برمجة جديدة", "programming", <Code2 size={16} />], ["إنشاء عرض", "استوديو عروض جديد", "presentations", <Presentation size={16} />], ["البحث في العقل الثاني", "استكشف المعرفة المتصلة", "mind", <BookOpen size={16} />]]
    : [["Ask Osamah AI", "Start a conversation with the current context", null, <Bot size={16} />], ["Create project", "Start a new programming workspace", "programming", <Code2 size={16} />], ["Create presentation", "Start a new presentation studio", "presentations", <Presentation size={16} />], ["Search Second Mind", "Explore connected knowledge", "mind", <BookOpen size={16} />]];
  return <div className="command-overlay" role="dialog" aria-modal="true" aria-label={isAr ? "لوحة الأوامر" : "Command palette"} onMouseDown={onClose}><div className="command-palette glass-panel" onMouseDown={(event) => event.stopPropagation()}><div className="command-input"><Search size={18} /><input autoFocus placeholder={isAr ? "اكتب أمراً أو ابحث…" : "Type a command or search…"} /><kbd>ESC</kbd></div><div className="command-section"><span>{isAr ? "اقتراحات" : "Suggestions"}</span>{commands.map(([title, detail, target, icon]) => <button key={title} onClick={() => { if (target) onNavigate(target); onClose(); }}><span className="command-icon">{icon}</span><div><strong>{title}</strong><small>{detail}</small></div>{target && <ChevronRight size={16} />}</button>)}</div><div className="command-footer"><span><kbd>↵</kbd> {isAr ? "للاختيار" : "to select"}</span><span><kbd>↑↓</kbd> {isAr ? "للتنقل" : "to navigate"}</span></div></div></div>;
}

export default function OsamahWorkspace() {
  const [language, setLanguage] = useState<Language>("ar");
  const [workspace, setWorkspace] = useState<Workspace>("dashboard");
  const [isAICollapsed, setAIcollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { theme, toggleTheme, setTheme } = useTheme();
  const t = content[language];
  const isAr = language === "ar";
  const meta = workspaceMeta[workspace];
  const WorkspaceIcon = meta.icon;

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    document.body.classList.toggle("lang-ar", isAr);
    document.body.classList.toggle("lang-en", !isAr);
  }, [isAr, language]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigation = useMemo(() => ([
    { key: "dashboard" as const, label: t.dashboard },
    { key: "programming" as const, label: t.programming },
    { key: "presentations" as const, label: t.presentations },
    { key: "mind" as const, label: t.mind },
    { key: "settings" as const, label: t.settings },
  ]), [t.dashboard, t.programming, t.presentations, t.mind, t.settings]);

  const navigate = (next: Workspace) => {
    setWorkspace(next);
    setNotificationsOpen(false);
  };

  const activeContent = {
    dashboard: <Dashboard lang={language} onNavigate={navigate} onCommand={() => setCommandOpen(true)} />,
    programming: <Programming lang={language} />,
    presentations: <Presentations lang={language} />,
    mind: <SecondMind lang={language} />,
    settings: <SettingsView lang={language} theme={theme} onThemeChange={(nextTheme) => setTheme?.(nextTheme)} onLanguageChange={setLanguage} />,
  }[workspace];

  return (
    <div className="osamah-app">
      <header className="app-topbar">
        <div className="brand-block">
          <img className="brand-mark" src="/manus-storage/osamah-orbit-mark_bc7fec06.png" alt="Osamah IDE" />
          <div className="brand-name"><strong><b>OSAMAH</b><i aria-hidden="true" /><em>IDE</em></strong><span>{t.brandTag}</span></div>
        </div>
        <button className="command-trigger" onClick={() => setCommandOpen(true)}><Search size={16} /><span>{t.search}</span><kbd>{isAr ? "Ctrl" : "⌘"} K</kbd></button>
        <div className="topbar-actions">
          <button className="language-toggle" onClick={() => setLanguage(isAr ? "en" : "ar")}><Globe2 size={15} /><span>{t.language}</span></button>
          <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? (isAr ? "تفعيل العرض الفاتح" : "Enable light mode") : (isAr ? "تفعيل العرض الداكن" : "Enable dark mode")}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}<span>{theme === "dark" ? (isAr ? "فاتح" : "Light") : (isAr ? "داكن" : "Dark")}</span></button>
          <div className="notification-wrap"><button className={`top-icon-button ${notificationsOpen ? "top-icon-active" : ""}`} onClick={() => setNotificationsOpen((visible) => !visible)} aria-label={t.notifications}><Bell size={17} /><i>3</i></button>{notificationsOpen && <div className="notifications-popover glass-panel"><SectionLabel>{t.notifications}</SectionLabel><TaskRow title={isAr ? "اكتمل مخطط العرض" : "Presentation outline completed"} detail={isAr ? "الآن" : "Just now"} state="done" /><TaskRow title={isAr ? "موافقة مطلوبة" : "Approval required"} detail={isAr ? "يريد الوكيل تعديل 7 ملفات" : "Agent wants to modify 7 files"} state="active" /><button className="view-notifications">{isAr ? "عرض مركز المهام" : "Open task center"}</button></div>}</div>
          <button className="profile-button"><span>OS</span><ChevronDown size={14} /></button>
        </div>
      </header>
      <div className="app-shell">
        <aside className="main-nav">
          <div className="nav-items">{navigation.map((item) => { const Icon = workspaceMeta[item.key].icon; return <button className={`nav-item ${workspace === item.key ? "nav-active" : ""}`} onClick={() => navigate(item.key)} key={item.key}><Icon size={18} /><span>{item.label}</span>{workspace === item.key && <i />}</button>; })}</div>
          <div className="nav-bottom"><button className="nav-item"><CircleHelp size={18} /><span>{isAr ? "المساعدة" : "Help center"}</span></button><div className="connection-state"><Signal tone="green" /><span>{isAr ? "متصل" : "Synced"}</span></div></div>
        </aside>
        <main className="main-workspace">
          <div className="context-bar"><div className="context-label"><WorkspaceIcon size={15} /><span>{t.workspace}</span><ChevronRight size={14} /><strong>{workspace === "dashboard" ? t.overview : workspace === "programming" ? "Coffee Export Web" : workspace === "presentations" ? (isAr ? "عرض المستثمرين" : "Investor Deck") : workspace === "mind" ? (isAr ? "بحث التصدير" : "Export Research") : t.settings}</strong></div><div className="context-states"><span><Folder size={13} /> {isAr ? "8 ملفات" : "8 files"}</span><span><Signal tone="blue" pulse /> {t.aiReady}</span></div></div>
          <div className={`workspace-content workspace-${workspace}`}>{activeContent}</div>
        </main>
        <AgentPanel workspace={workspace} lang={language} collapsed={isAICollapsed} onCollapse={() => setAIcollapsed((collapsed) => !collapsed)} />
      </div>
      <footer className="status-bar"><div><Signal tone="green" /> {t.allClear}</div><div><span>{isAr ? "المشروع" : "Project"}: {t.project}</span><span>main</span><span><Bot size={12} /> 3 {isAr ? "مهام" : "tasks"}</span></div></footer>
      {commandOpen && <CommandPalette lang={language} onClose={() => setCommandOpen(false)} onNavigate={navigate} />}
    </div>
  );
}
