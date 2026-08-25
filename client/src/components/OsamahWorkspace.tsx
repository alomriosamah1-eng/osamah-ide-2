/**
 * Design philosophy — Quiet Intelligence Observatory:
 * A calm, premium desktop command room with blue-orbit context cues, smoked-glass panels,
 * and the AI layer integrated into each workspace rather than isolated as a generic chat.
 */
import { useEffect, useMemo, useState } from "react";
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
  PanelRightClose,
  Play,
  Plus,
  Presentation,
  Search,
  Send,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  TerminalSquare,
  WandSparkles,
  X,
} from "lucide-react";

type Language = "ar" | "en";
type Workspace = "dashboard" | "programming" | "presentations" | "mind" | "settings";

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

      <div className="ai-composer">
        <textarea rows={2} placeholder={isAr ? "اطلب من ذكاء أسامة…" : "Ask Osamah AI…"} aria-label={isAr ? "رسالة للمساعد" : "Message the assistant"} />
        <div className="composer-foot">
          <span><Command size={12} /> {isAr ? "أمر" : "Command"}</span>
          <button aria-label={isAr ? "إرسال" : "Send"}><Send size={15} /></button>
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
  const slides = isAr ? ["الغلاف", "المشكلة", "الحل", "السوق", "نموذج العمل", "الاستراتيجية", "الخلاصة"] : ["Cover", "Problem", "Solution", "Market", "Business model", "Strategy", "Conclusion"];
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
            {slides.map((title, index) => <button className={`slide-thumb ${index === 3 ? "slide-selected" : ""}`} key={title}><span className="slide-number">{String(index + 1).padStart(2, "0")}</span><span className={`mini-slide mini-${index}`}><i /><i /><i /></span><strong>{title}</strong></button>)}
          </div>
        </aside>
        <section className="slide-workbench">
          <div className="canvas-tools"><button><Plus size={14} /> {isAr ? "شريحة" : "Slide"}</button><button><Grid2X2 size={14} /> {isAr ? "تخطيط" : "Layout"}</button><button><SlidersHorizontal size={14} /> {isAr ? "خصائص" : "Properties"}</button><span>75%</span><button><Plus size={13} /></button></div>
          <div className="slide-canvas-wrap">
            <div className="slide-canvas">
              <div className="slide-canvas-decoration"><span /><span /><span /></div>
              <p className="canvas-kicker">COFFEE EXPORTS / 2026</p>
              <h2>{isAr ? "فرصة القهوة اليمنية" : "Yemen’s Coffee Opportunity"}</h2>
              <p>{isAr ? "بناء حضور مميز في سوق القهوة المتخصصة العالمي." : "Building a distinctive position in the global specialty market."}</p>
              <div className="canvas-stats"><span><b>$24M</b><small>{isAr ? "قيمة تصدير محتملة" : "Export potential"}</small></span><span><b>+18%</b><small>{isAr ? "نمو سنوي" : "Annual growth"}</small></span></div>
              <div className="canvas-curve" />
            </div>
          </div>
          <div className="speaker-notes"><button><ChevronDown size={15} /> {isAr ? "ملاحظات المتحدث" : "Speaker notes"}</button><span>{isAr ? "أضف قصة تقدم هذه الفرصة بوضوح…" : "Add a story that frames this opportunity…"}</span></div>
        </section>
      </div>
    </div>
  );
}

function SecondMind({ lang }: { lang: Language }) {
  const isAr = lang === "ar";
  const sources = isAr ? ["المشاريع", "الأبحاث", "المستندات", "الأفكار", "التعلّم"] : ["Projects", "Research", "Documents", "Ideas", "Learning"];
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
          <div className="knowledge-stage-head"><div><span>{isAr ? "خريطة العلاقة" : "Relationship map"}</span><strong>{isAr ? "مجال البحث: القهوة اليمنية" : "Research domain: Yemeni coffee"}</strong></div><button><MoreHorizontal size={17} /></button></div>
          <div className="graph-field">
            <svg viewBox="0 0 760 430" preserveAspectRatio="none" aria-hidden="true"><path d="M125 130 C230 70 340 170 400 202 S590 120 654 185" /><path d="M160 320 C280 240 332 270 400 202 S535 280 610 320" /><path d="M125 130 C175 206 125 254 160 320" /><path d="M654 185 C580 236 610 270 610 320" /><path d="M400 202 C340 148 312 127 270 111" /></svg>
            <button className="graph-node node-research"><BookOpen size={16} /><span>{isAr ? "بحث التصدير" : "Export research"}</span></button>
            <button className="graph-node node-coffee"><Sparkles size={17} /><span>{isAr ? "القهوة اليمنية" : "Yemeni coffee"}</span></button>
            <button className="graph-node node-market"><Globe2 size={15} /><span>{isAr ? "السوق العالمي" : "Global market"}</span></button>
            <button className="graph-node node-deck"><Presentation size={15} /><span>{isAr ? "عرض المستثمرين" : "Investor deck"}</span></button>
            <button className="graph-node node-plan"><FileText size={15} /><span>{isAr ? "خطة العمل" : "Business plan"}</span></button>
            <button className="graph-node node-task"><Clock3 size={15} /><span>{isAr ? "مهام التحقق" : "Validation tasks"}</span></button>
          </div>
          <div className="graph-legend"><span><i className="legend-cyan" />{isAr ? "وثيقة" : "Document"}</span><span><i className="legend-blue" />{isAr ? "فكرة مركزية" : "Core idea"}</span><span><i className="legend-violet" />{isAr ? "مشروع" : "Project"}</span></div>
        </section>
        <aside className="insight-panel glass-panel">
          <SectionLabel>{isAr ? "رؤية الذكاء الاصطناعي" : "AI insight"}</SectionLabel>
          <p>{isAr ? "تظهر ثلاثة مصادر متصلة حول نمو الطلب على القهوة المتخصصة." : "Three connected sources point to specialty coffee demand growth."}</p>
          <button className="insight-source"><span><FileText size={15} /></span><div><strong>{isAr ? "ملخص السوق 2026" : "Market summary 2026"}</strong><small>{isAr ? "مستند · مرتبط الآن" : "Document · linked now"}</small></div><ChevronRight size={14} /></button>
          <button className="insight-action"><Sparkles size={14} /> {isAr ? "استكشف الروابط" : "Explore connections"}</button>
          <div className="mind-visual"><img src="/manus-storage/osamah-knowledge-constellation_c14372aa.png" alt="" /></div>
        </aside>
      </div>
    </div>
  );
}

function SettingsView({ lang }: { lang: Language }) {
  const isAr = lang === "ar";
  const groups = isAr ? ["عام", "المظهر", "الذكاء الاصطناعي", "النماذج", "الوكلاء", "البرمجة", "العروض", "العقل الثاني", "لوحة المفاتيح", "الأمان والخصوصية"] : ["General", "Appearance", "AI", "Models", "Agents", "Programming", "Presentations", "Second Mind", "Keyboard", "Security & privacy"];
  return (
    <div className="settings-view workspace-view">
      <aside className="settings-sidebar glass-panel"><SectionLabel>{isAr ? "إعدادات التطبيق" : "Application settings"}</SectionLabel>{groups.map((group, index) => <button className={index === 1 ? "settings-active" : ""} key={group}>{index === 1 ? <SlidersHorizontal size={15} /> : <CircleHelp size={15} />}{group}</button>)}</aside>
      <section className="settings-main glass-panel"><div className="settings-title"><div><span className="eyebrow"><Signal tone="blue" /> {isAr ? "التخصيص" : "Customization"}</span><h2>{isAr ? "المظهر" : "Appearance"}</h2><p>{isAr ? "اضبط بيئة العمل لتناسب أسلوب تركيزك." : "Tune the workspace to suit how you focus."}</p></div><button className="reset-button">{isAr ? "استعادة الافتراضي" : "Reset default"}</button></div><div className="settings-stack"><div className="setting-row"><div><strong>{isAr ? "سمة التطبيق" : "Application theme"}</strong><span>{isAr ? "الواجهة الداكنة الهادئة هي السمة النشطة." : "Quiet dark is active across your workspaces."}</span></div><div className="theme-options"><button className="theme-option"><i /> {isAr ? "فاتح" : "Light"}</button><button className="theme-option selected"><i /> {isAr ? "داكن" : "Dark"}</button><button className="theme-option"><i /> {isAr ? "النظام" : "System"}</button></div></div><div className="setting-row"><div><strong>{isAr ? "لون المدار" : "Orbit accent"}</strong><span>{isAr ? "يستخدم للسياق النشط ومؤشرات الذكاء." : "Used for active context and AI signals."}</span></div><div className="accent-picker"><button className="accent-picked" /><button className="accent-cyan" /><button className="accent-violet" /><button className="accent-coral" /></div></div><div className="setting-row"><div><strong>{isAr ? "كثافة الواجهة" : "Interface density"}</strong><span>{isAr ? "اتساع متوازن لمراجعة العمل المعقد." : "Balanced breathing room for complex work."}</span></div><div className="segmented"><button>{isAr ? "مكثف" : "Compact"}</button><button className="selected">{isAr ? "مريح" : "Comfortable"}</button></div></div><div className="setting-row"><div><strong>{isAr ? "حركة الواجهة" : "Interface motion"}</strong><span>{isAr ? "انتقالات هادئة وسريعة بين الألواح." : "Quiet, quick transitions between panels."}</span></div><label className="toggle"><input type="checkbox" defaultChecked /><span /></label></div></div></section>
    </div>
  );
}

function CommandPalette({ lang, onClose, onNavigate }: { lang: Language; onClose: () => void; onNavigate: (workspace: Workspace) => void }) {
  const isAr = lang === "ar";
  const commands: Array<[string, string, Workspace | null, React.ReactNode]> = isAr
    ? [["اسأل ذكاء أسامة", "ابدأ محادثة مع السياق الحالي", null, <Bot size={16} />], ["إنشاء مشروع", "مساحة برمجة جديدة", "programming", <Code2 size={16} />], ["إنشاء عرض", "استوديو عروض جديد", "presentations", <Presentation size={16} />], ["البحث في العقل الثاني", "استكشف المعرفة المتصلة", "mind", <BookOpen size={16} />]]
    : [["Ask Osamah AI", "Start a conversation with the current context", null, <Bot size={16} />], ["Create project", "Start a new programming workspace", "programming", <Code2 size={16} />], ["Create presentation", "Start a new presentation studio", "presentations", <Presentation size={16} />], ["Search Second Mind", "Explore connected knowledge", "mind", <BookOpen size={16} />]];
  return <div className="command-overlay" role="dialog" aria-modal="true" aria-label={isAr ? "لوحة الأوامر" : "Command palette"} onMouseDown={onClose}><div className="command-palette glass-panel" onMouseDown={(event) => event.stopPropagation()}><div className="command-input"><Search size={18} /><input autoFocus placeholder={isAr ? "اكتب أمراً أو ابحث…" : "Type a command or search…"} /><kbd>ESC</kbd></div><div className="command-section"><span>{isAr ? "اقتراحات" : "Suggestions"}</span>{commands.map(([title, detail, target, icon]) => <button key={title} onClick={() => { if (target) onNavigate(target); onClose(); }}><span className="command-icon">{icon}</span><div><strong>{title}</strong><small>{detail}</small></div>{target && <ChevronRight size={16} />}</button>)}</div><div className="command-footer"><span><kbd>↵</kbd> {isAr ? "للاختيار" : "to select"}</span><span><kbd>↑↓</kbd> {isAr ? "للتنقل" : "to navigate"}</span></div></div></div>;
}

export default function OsamahWorkspace() {
  const [language, setLanguage] = useState<Language>("en");
  const [workspace, setWorkspace] = useState<Workspace>("dashboard");
  const [isAICollapsed, setAIcollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
    settings: <SettingsView lang={language} />,
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
