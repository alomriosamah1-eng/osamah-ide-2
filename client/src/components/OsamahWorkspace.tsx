/**
 * Design philosophy — Quiet Intelligence Observatory:
 * A calm, premium desktop command room with blue-orbit context cues, smoked-glass panels,
 * and the AI layer integrated into each workspace rather than isolated as a generic chat.
 */
import { skipToken } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filterWorkspaceCommands, getWorkspaceCommands } from "@/lib/command-palette";
import { catalogFromEmbeddedOpenCode, getOpenCodeModel, getOpenCodeModelPlaceholder, initialOpenCodeCatalog } from "@/lib/opencode-contract";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { getOrCreateOpenCodeSession, isOpenCodeSessionCleanupBlocked, reconcileOpenCodePendingPermissions, removeResolvedOpenCodePermission, shouldPollOpenCodeSessionPermissions, type OpenCodePendingPermission } from "@/lib/opencode-session";
import { shouldConfirmUnsavedFileTransition, type UnsavedFileTransition } from "@/lib/unsaved-file-guard";
import { getWorkspaceHelpEnginePhase } from "@/lib/workspace-help";
import ServerSettingsView, { type PreferencePatch, type SavedPreferences } from "@/components/ServerSettingsView";
import PresentationStudio from "@/components/PresentationStudio";
import "./opencode-model.css";
import "./theia-runtime.css";
import "./workspace-data.css";
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
  Link2,
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
  Trash2,
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
    aiReady: "OpenCode status",
    notifications: "Notifications",
    quickActions: "Quick actions",
    recentWork: "Recent work",
    aiActivity: "Activity log",
    welcome: "Saved workspace overview.",
    welcomeDetail: "Create or open server-saved projects, presentations, and knowledge items from their workspace.",
    viewAll: "View all",
    open: "Open",
    askAI: "Ask Osamah AI…",
    send: "Send",
    context: "Context",
    activeTasks: "Active tasks",
    allClear: "Workspace status",
    project: "Saved project",
    newProject: "Open programming",
    draftPresentation: "Open presentation studio",
    reviewPlan: "Check assistant status",
    newPresentation: "Open presentations",
    askMind: "Open Second Mind",
    openWorkspace: "Open workspace",
    startTask: "Open assistant",
    language: "عربي",
    overview: "Overview",
    status: "Status",
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
    aiReady: "حالة OpenCode",
    notifications: "الإشعارات",
    quickActions: "إجراءات سريعة",
    recentWork: "العمل الأخير",
    aiActivity: "سجل النشاط",
    welcome: "نظرة عامة على مساحة العمل المحفوظة.",
    welcomeDetail: "أنشئ أو افتح مشاريع وعروضاً وعناصر معرفة محفوظة خادمياً من مساحة كل قسم.",
    viewAll: "عرض الكل",
    open: "فتح",
    askAI: "اسأل ذكاء أسامة…",
    send: "إرسال",
    context: "السياق",
    activeTasks: "المهام النشطة",
    allClear: "حالة مساحة العمل",
    project: "مشروع محفوظ",
    newProject: "فتح البرمجة",
    draftPresentation: "فتح استوديو العروض",
    reviewPlan: "فحص حالة الوكيل",
    newPresentation: "فتح العروض",
    askMind: "فتح العقل الثاني",
    openWorkspace: "افتح مساحة عمل",
    startTask: "فتح الوكيل",
    language: "English",
    overview: "نظرة عامة",
    status: "الحالة",
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
  state?: "active" | "done" | "queued" | "recorded";
  progress?: number;
}) {
  return (
    <div className="task-row">
      <Signal tone={state === "done" ? "green" : state === "active" ? "blue" : "slate"} pulse={state === "active"} />
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

function activitySummary(action: string, entityType: string, lang: Language) {
  const isAr = lang === "ar";
  const actions: Record<string, string> = isAr
    ? { created: "أُنشئ", updated: "حُدّث", deleted: "حُذف", saved: "حُفظ", renamed: "أُعيدت تسميته", archived: "أُرشف", linked: "رُبط" }
    : { created: "Created", updated: "Updated", deleted: "Deleted", saved: "Saved", renamed: "Renamed", archived: "Archived", linked: "Linked" };
  const entities: Record<string, string> = isAr
    ? { project: "مشروع", file: "ملف", directory: "مجلد", task: "مهمة", knowledge: "عنصر معرفة", link: "رابط معرفة", presentation: "عرض", slide: "شريحة" }
    : { project: "project", file: "file", directory: "folder", task: "task", knowledge: "knowledge item", link: "knowledge link", presentation: "presentation", slide: "slide" };
  return `${actions[action] ?? action} ${entities[entityType] ?? entityType}`;
}

function localizeEngineHelp(engineId: string, status: string, isAr: boolean) {
  const names: Record<string, [string, string]> = {
    opencode: ["OpenCode", "OpenCode"],
    theia: ["Eclipse Theia", "Eclipse Theia"],
    presenton: ["Presenton", "Presenton"],
    "second-brain": ["العقل الثاني", "Second Brain"],
  };
  const labels: Record<string, [string, string]> = {
    ready: ["جاهز", "Ready"],
    available: ["متاح", "Available"],
    "needs-configuration": ["يتطلب إعداداً", "Needs configuration"],
    "build-required": ["يتطلب بناء التطبيق", "Application build required"],
    unavailable: ["غير متاح", "Unavailable"],
    stopped: ["متوقف", "Stopped"],
  };
  const descriptions: Record<string, Record<string, [string, string]>> = {
    opencode: {
      ready: ["المزود والنموذج المكتشفان متاحان لجلسة وكيل مصادَق عليها.", "A discovered provider and model are available for an authenticated agent session."],
      "needs-configuration": ["المحرك سليم لكن يلزم نموذج مفعّل أو تمكين خادمي.", "The runtime is healthy but needs an enabled model or server-side enablement."],
      unavailable: ["لم تتوفر واجهة OpenCode الحية.", "The live OpenCode endpoint is unavailable."],
    },
    theia: {
      "build-required": ["المصدر موجود، لكن تطبيق المتصفح لم يُبنَ بعد.", "The source is present, but the browser application has not been built yet."],
      stopped: ["تطبيق المتصفح مبني لكنه غير مشغّل حالياً.", "The browser application is built but is not currently running."],
      ready: ["بيئة التطوير في المتصفح جاهزة.", "The browser IDE environment is ready."],
    },
    presenton: {
      "needs-configuration": ["واجهة الصحة متاحة، لكن التوليد والتصدير يحتاجان إعداد مزود معتمد.", "The health endpoint is available, but generation and export need an approved provider configuration."],
      ready: ["خدمة العروض والتوليد مهيأة.", "Presentation generation is configured and ready."],
      unavailable: ["خدمة العروض غير متاحة حالياً.", "The presentation service is currently unavailable."],
    },
    "second-brain": {
      available: ["مستخرج المهام وعمليات المعرفة الخادمية متاحان.", "The task extractor and server-backed knowledge operations are available."],
      unavailable: ["مصدر العقل الثاني أو مهايئه الخادمي غير متاح.", "The Second Brain source or server adapter is unavailable."],
    },
  };
  const localeIndex = isAr ? 0 : 1;
  return {
    name: (names[engineId] ?? [engineId, engineId])[localeIndex],
    status: (labels[status] ?? [status, status])[localeIndex],
    detail: (descriptions[engineId]?.[status] ?? ["تتوفر الحالة الخادمية الحالية فقط.", "Only the current server status is available."])[localeIndex],
  };
}

function activityTime(value: Date | string, lang: Language) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar" : "en", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function AgentPanel({ workspace, lang, collapsed, onCollapse }: { workspace: Workspace; lang: Language; collapsed: boolean; onCollapse: () => void }) {
  const isAr = lang === "ar";
  const t = content[lang];
  const [draft, setDraft] = useState("");
  const [selectedModelValue, setSelectedModelValue] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "agent" | "user"; text: string; model?: string }>>([]);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [pendingPermissions, setPendingPermissions] = useState<OpenCodePendingPermission[]>([]);
  const [trackedSessionID, setTrackedSessionID] = useState<string | null>(null);
  const [awaitingAssistantResponse, setAwaitingAssistantResponse] = useState(false);
  const [sessionCleanupFailed, setSessionCleanupFailed] = useState(false);
  const receivedAssistantMessageIDs = useRef(new Set<string>());
  const activeSessionId = useRef<string | null>(null);
  const runtimeQuery = trpc.opencode.status.useQuery();
  const engineContextQuery = trpc.engines.context.useQuery({ section: workspace }, { retry: false });
  const modelsQuery = trpc.opencode.models.useQuery(undefined, {
    enabled: runtimeQuery.data?.health === "healthy",
    retry: false,
  });
  const createSession = trpc.opencode.session.create.useMutation();
  const sendToSession = trpc.opencode.session.send.useMutation();
  const replyPermission = trpc.opencode.session.replyPermission.useMutation();
  const removeSession = trpc.opencode.session.remove.useMutation();
  const sessionMessagesQuery = trpc.opencode.session.messages.useQuery(
    trackedSessionID ? { sessionID: trackedSessionID } : skipToken,
    { enabled: Boolean(trackedSessionID && awaitingAssistantResponse), refetchInterval: awaitingAssistantResponse ? 4_000 : false, retry: false },
  );
  const shouldPollPermissions = shouldPollOpenCodeSessionPermissions(trackedSessionID, awaitingAssistantResponse);
  const sessionPermissionsQuery = trpc.opencode.session.permissions.useQuery(
    trackedSessionID ? { sessionID: trackedSessionID } : skipToken,
    { enabled: shouldPollPermissions, refetchInterval: shouldPollPermissions ? 4_000 : false, retry: false },
  );
  const modelCatalog = useMemo(() => {
    if (runtimeQuery.isLoading || modelsQuery.isFetching) return { runtime: "checking" as const, models: [] };
    if (runtimeQuery.data?.health !== "healthy") {
      return { runtime: runtimeQuery.data?.phase === "unreachable" ? "offline" as const : "degraded" as const, models: [] };
    }
    return modelsQuery.data ? catalogFromEmbeddedOpenCode(modelsQuery.data) : initialOpenCodeCatalog;
  }, [modelsQuery.data, modelsQuery.isFetching, runtimeQuery.data, runtimeQuery.isLoading]);
  const selectedModel = useMemo(
    () => getOpenCodeModel(modelCatalog, selectedModelValue),
    [modelCatalog, selectedModelValue],
  );
  const isSessionCleanupBlocked = isOpenCodeSessionCleanupBlocked(activeSessionId.current, sessionCleanupFailed);
  const isChatBusy = createSession.isPending || sendToSession.isPending || awaitingAssistantResponse || removeSession.isPending || replyPermission.isPending || pendingPermissions.length > 0;
  const canSendMessage = Boolean(draft.trim() && selectedModel && modelCatalog.runtime === "ready" && !isChatBusy && !isSessionCleanupBlocked);
  const sendAvailabilityMessage = isSessionCleanupBlocked
    ? (isAr ? "تعذر تنظيف جلسة القسم السابق. أعد محاولة إنهاء الجلسة قبل إرسال سياق جديد." : "The previous workspace session could not be cleaned up. Retry ending it before sending new context.")
    : !draft.trim()
    ? (isAr ? "اكتب رسالة أولاً." : "Write a message first.")
    : !selectedModel
      ? (isAr ? "اختر نموذج OpenCode مكتشفاً أولاً." : "Choose a discovered OpenCode model first.")
      : modelCatalog.runtime !== "ready"
        ? (isAr ? "الإرسال متوقف إلى أن يصبح OpenCode جاهزاً." : "Sending is unavailable until OpenCode is ready.")
        : isAr ? "إرسال الرسالة إلى جلسة OpenCode." : "Send the message to the OpenCode session.";
  const runtimeState = {
    unconfigured: {
      label: isAr ? "OpenCode غير مهيأ" : "OpenCode not configured",
      detail: isAr ? "لم تُكتشف نماذج مفعّلة من المحرك المضمّن بعد." : "No enabled models have been discovered from the embedded runtime yet.",
      tone: "amber" as const,
    },
    checking: {
      label: isAr ? "يتم فحص OpenCode" : "Checking OpenCode",
      detail: isAr ? "يتم التحقق من الصحة ثم قراءة المزوّدات والنماذج من OpenCode." : "Verifying health, then reading providers and models from OpenCode.",
      tone: "blue" as const,
    },
    ready: {
      label: isAr ? "OpenCode جاهز" : "OpenCode ready",
      detail: isAr ? "المحرك المضمّن صحي؛ يرسل المستخدم المصادَق عليه إلى جلسة OpenCode حقيقية بعد التحقق من النموذج المختار." : "The embedded runtime is healthy; an authenticated user can use a real OpenCode session after the selected model is verified.",
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
  const chatPrompts = {
    dashboard: isAr ? ["رتّب أولوياتي", "أنشئ خطة اليوم"] : ["Prioritize my work", "Create today’s plan"],
    programming: isAr ? ["اشرح التعديل", "أضف الاختبارات"] : ["Explain this change", "Add the tests"],
    presentations: isAr ? ["حسّن القصة", "اقترح شريحة"] : ["Strengthen the story", "Suggest a slide"],
    mind: isAr ? ["استخرج الرؤى", "اربط المصادر"] : ["Extract insights", "Connect sources"],
    settings: isAr ? ["اقترح تهيئة", "راجع الإعدادات"] : ["Suggest a setup", "Review settings"],
  };
  const clearLocalSession = () => {
    setDraft("");
    setMessages([]);
    setPendingPermissions([]);
    setTrackedSessionID(null);
    setAwaitingAssistantResponse(false);
    setSessionCleanupFailed(false);
    receivedAssistantMessageIDs.current.clear();
    activeSessionId.current = null;
  };

  const discardSession = async (sessionID: string, reason: "manual" | "workspace" | "model") => {
    try {
      const result = await removeSession.mutateAsync({ sessionID });
      clearLocalSession();
      const details = {
        manual: isAr ? "أُغلقت جلسة OpenCode وحُذفت من المحرك." : "The OpenCode session was closed and removed from the runtime.",
        workspace: isAr ? "أُغلقت جلسة القسم السابق عند الانتقال إلى مساحة عمل جديدة." : "The previous workspace session was closed when switching workspaces.",
        model: isAr ? "أُغلقت الجلسة السابقة قبل تغيير نموذج OpenCode." : "The previous session was closed before changing the OpenCode model.",
      };
      setConnectionMessage(result.alreadyAbsent
        ? (isAr ? "كانت جلسة OpenCode السابقة منتهية بالفعل؛ جرى تنظيفها محلياً." : "The previous OpenCode session was already absent and was cleared locally.")
        : details[reason]);
      return true;
    } catch (error) {
      setSessionCleanupFailed(true);
      const detail = error instanceof Error ? error.message : isAr ? "حدث تعذر غير معروف." : "An unknown failure occurred.";
      setConnectionMessage(isAr ? `تعذر إنهاء جلسة OpenCode: ${detail}` : `The OpenCode session could not be closed: ${detail}`);
      return false;
    }
  };

  const selectOpenCodeModel = async (value: string) => {
    if (value === selectedModelValue) return;
    const previousSessionID = activeSessionId.current;
    if (previousSessionID && !(await discardSession(previousSessionID, "model"))) return;
    setSelectedModelValue(value);
  };

  const inspectOpenCode = async () => {
    const previousSessionID = activeSessionId.current;
    if (previousSessionID && !(await discardSession(previousSessionID, "model"))) return;
    setConnectionMessage(isAr ? "يجري فحص محرك OpenCode المضمّن…" : "Checking the embedded OpenCode runtime…");
    const runtime = await runtimeQuery.refetch();
    if (runtime.data?.health !== "healthy") {
      setSelectedModelValue("");
      setConnectionMessage(isAr ? "المحرك المضمّن غير صحي بعد؛ لن تُرسل أي رسالة." : "The embedded runtime is not healthy yet; no message will be sent.");
      return;
    }
    const models = await modelsQuery.refetch();
    setSelectedModelValue("");
    setConnectionMessage(
      isAr
        ? `المحرك المضمّن صحي واكتشف ${models.data?.length ?? 0} نموذجاً مفعّلاً.`
        : `The embedded runtime is healthy and discovered ${models.data?.length ?? 0} enabled model(s).`,
    );
  };

  useEffect(() => {
    const previousSessionID = activeSessionId.current;
    if (!previousSessionID) {
      clearLocalSession();
      return;
    }
    void discardSession(previousSessionID, "workspace");
  }, [workspace]);

  useEffect(() => {
    if (!awaitingAssistantResponse || !sessionMessagesQuery.data) return;
    const unseenReplies = sessionMessagesQuery.data.filter(message => (
      message.role === "assistant" && !receivedAssistantMessageIDs.current.has(message.id)
    ));
    if (unseenReplies.length === 0) return;
    unseenReplies.forEach(message => receivedAssistantMessageIDs.current.add(message.id));
    setMessages(current => [
      ...current,
      ...unseenReplies.map(reply => ({ role: "agent" as const, text: reply.text, model: selectedModel?.label[lang] })),
    ]);
    setAwaitingAssistantResponse(false);
    setConnectionMessage("");
  }, [awaitingAssistantResponse, lang, selectedModel, sessionMessagesQuery.data]);

  useEffect(() => {
    setPendingPermissions(current => reconcileOpenCodePendingPermissions(current, sessionPermissionsQuery.data));
  }, [sessionPermissionsQuery.data]);

  const sendMessage = async (text = draft) => {
    const message = text.trim();
    if (!message) return;
    if (isSessionCleanupBlocked) {
      setConnectionMessage(isAr ? "لا يمكن إرسال سياق جديد قبل تنظيف جلسة القسم السابق." : "New context cannot be sent before the previous workspace session is cleaned up.");
      return;
    }
    if (!selectedModel || modelCatalog.runtime !== "ready") {
      setConnectionMessage(isAr ? "لا يمكن الإرسال قبل أن يصبح المحرك المضمّن صحياً ويكتشف نموذجاً فعلياً." : "Sending requires a healthy embedded runtime and a discovered model.");
      return;
    }
    try {
      const sessionID = await getOrCreateOpenCodeSession(
        activeSessionId.current,
        () => createSession.mutateAsync({ model: { id: selectedModel.modelId, providerID: selectedModel.providerId, variant: selectedModel.variant } }),
      );
      activeSessionId.current = sessionID;
      setTrackedSessionID(sessionID);
      const result = await sendToSession.mutateAsync({ sessionID, text: message, section: workspace }) as {
        messages: Array<{ id: string; role: "user" | "assistant"; text: string }>;
        permissions: Array<{ id: string; label: string }>;
        pending: boolean;
      };
      const replies = result.messages.filter(entry => entry.role === "assistant");
      replies.forEach(reply => receivedAssistantMessageIDs.current.add(reply.id));
      setMessages(current => [...current, { role: "user", text: message, model: selectedModel.label[lang] }, ...replies.map(reply => ({ role: "agent" as const, text: reply.text, model: selectedModel.label[lang] }))]);
      setDraft("");
      setAwaitingAssistantResponse(result.pending);
      setConnectionMessage(result.pending
        ? (isAr ? "استقبل OpenCode الرسالة وما زال ينتظر رد المزوّد؛ ستتابع الجلسة الرد تلقائياً." : "OpenCode accepted the message and is waiting for the provider; this session will continue checking automatically.")
        : replies.length === 0
          ? (isAr ? "اكتملت جلسة OpenCode من دون نص مساعد بعد." : "The OpenCode session completed without assistant text yet.")
          : "");
      setPendingPermissions(result.permissions);
    } catch (error) {
      const detail = error instanceof Error ? error.message : isAr ? "حدث تعذر غير معروف." : "An unknown failure occurred.";
      setConnectionMessage(isAr ? `لم تُنفّذ الرسالة: ${detail}` : `The message was not executed: ${detail}`);
    }
  };

  const decidePermission = async (requestID: string, reply: "once" | "always" | "reject") => {
    if (!activeSessionId.current) return;
    try {
      await replyPermission.mutateAsync({ sessionID: activeSessionId.current, requestID, reply });
      setPendingPermissions(current => removeResolvedOpenCodePermission(current, requestID));
      void sessionPermissionsQuery.refetch();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      setConnectionMessage(isAr ? `تعذر تسجيل الموافقة: ${detail}` : `Permission response failed: ${detail}`);
    }
  };

  if (collapsed) {
    return (
      <aside className="ai-rail">
        <button className="ai-rail-mark" onClick={onCollapse} aria-label={isAr ? "فتح مساعد الذكاء الاصطناعي" : "Open AI assistant"}>
          <img src="/manus-storage/osamah-orbit-mark_bc7fec06.png" alt="" />
          <Signal tone={runtimeState.tone} pulse={modelCatalog.runtime === "checking"} />
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
            <span><Signal tone={runtimeState.tone} pulse={modelCatalog.runtime === "checking"} /> {runtimeState.label}</span>
          </div>
        </div>
        <GlassButton className="icon-control" onClick={onCollapse} icon={<PanelRightClose size={16} />} ariaLabel={isAr ? "طي المساعد" : "Collapse assistant"} />
      </div>

      <div className="ai-context-card">
        <span>{isAr ? "سياق مساحة العمل" : "Workspace context"}</span>
        <strong>{t[workspace]}</strong>
        <div className="context-chip"><Sparkles size={13} /> {isAr ? "جلسات OpenCode الفعلية فقط" : "Real OpenCode sessions only"}</div>
        <div className="engine-context-summary" aria-live="polite">
          <span>{isAr ? "محركات القسم" : "Section engines"}</span>
          <div>
            {engineContextQuery.isLoading && <small>{isAr ? "يتم فحص المحركات…" : "Checking engines…"}</small>}
            {engineContextQuery.isError && <small>{isAr ? "تعذر قراءة حالة المحركات." : "Engine status could not be read."}</small>}
            {(engineContextQuery.data?.engines ?? []).map(engine => (
              <span className={`engine-context-chip engine-${engine.status}`} key={engine.id} title={engine.detail}>
                {engine.name}: {engine.agentReady ? (isAr ? "جاهز" : "ready") : (isAr ? "غير جاهز" : "not ready")}
              </span>
            ))}
          </div>
          {engineContextQuery.data && <small>{isAr
            ? `${engineContextQuery.data.workspace.projectCount} مشاريع · ${engineContextQuery.data.workspace.taskCount} مهام · يُضاف هذا السياق خادمياً عند إرسال رسالة.`
            : `${engineContextQuery.data.workspace.projectCount} projects · ${engineContextQuery.data.workspace.taskCount} tasks · This context is added server-side when a message is sent.`}</small>}
        </div>
      </div>

      <div className="agent-steps">
        <SectionLabel>{isAr ? "حالة التنفيذ" : "Execution status"}</SectionLabel>
        <div className="agent-step">
          <span className={modelCatalog.runtime === "ready" ? "step-done" : "step-working"}>{modelCatalog.runtime === "ready" ? "✓" : ""}</span>
          <span>{runtimeState.label}</span>
        </div>
        <div className="agent-step agent-step-muted"><span className="step-empty" /> <span>{connectionMessage || runtimeState.detail}</span></div>
      </div>

      <div className="agent-conversation" aria-label={isAr ? "دردشة وكيل مساحة العمل" : "Workspace agent chat"}>
        <SectionLabel action={<span className="agent-context-status"><Signal tone={runtimeState.tone} pulse={modelCatalog.runtime === "checking"} /> {runtimeState.label}</span>}>{isAr ? "دردشة الوكيل" : "Agent chat"}</SectionLabel>
          <div className="agent-messages">
            {messages.slice(-3).map((message, index) => <div className={`agent-message message-${message.role}`} key={`${message.role}-${index}-${message.text}`}><span>{message.role === "agent" ? "OS" : isAr ? "أنت" : "You"}</span>{message.model && <small className="message-model-tag">{message.model}</small>}<p>{message.text}</p></div>)}
            {pendingPermissions.map((permission) => (
              <div className="opencode-permission" key={permission.id}>
                <strong>{isAr ? "موافقة OpenCode مطلوبة" : "OpenCode permission required"}</strong>
                <p>{permission.label}</p>
                <div>
                  <button disabled={replyPermission.isPending} onClick={() => void decidePermission(permission.id, "once")}>{isAr ? "سماح مرة" : "Allow once"}</button>
                  <button disabled={replyPermission.isPending} onClick={() => void decidePermission(permission.id, "always")}>{isAr ? "السماح دائماً" : "Always allow"}</button>
                  <button disabled={replyPermission.isPending} onClick={() => void decidePermission(permission.id, "reject")}>{isAr ? "رفض" : "Reject"}</button>
                </div>
              </div>
            ))}
          </div>
        <div className="agent-prompt-row">{chatPrompts[workspace].map((prompt) => <button key={prompt} disabled={createSession.isPending || sendToSession.isPending || isSessionCleanupBlocked} onClick={() => void sendMessage(prompt)}>{prompt}</button>)}</div>
      </div>

      <form className="ai-composer" onSubmit={(event) => { event.preventDefault(); if (canSendMessage) void sendMessage(); }}>
        <div className="composer-input-row">
          <textarea rows={3} value={draft} disabled={isChatBusy} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (canSendMessage) void sendMessage(); } }} placeholder={isAr ? "اكتب رسالة إلى جلسة OpenCode…" : "Write a message for the OpenCode session…"} aria-label={isAr ? "رسالة للمساعد" : "Message the assistant"} aria-describedby="composer-send-hint" />
          <button className="composer-send" type="submit" disabled={!canSendMessage} title={sendAvailabilityMessage} aria-label={isAr ? "إرسال الرسالة" : "Send message"}>
            <Send size={16} aria-hidden="true" />
            <span>{isChatBusy ? (isAr ? "جارٍ الإرسال" : "Sending") : !canSendMessage ? (isAr ? "غير متاح" : "Unavailable") : isAr ? "إرسال" : "Send"}</span>
          </button>
        </div>
        <p className="composer-send-hint" id="composer-send-hint" role="status">{sendAvailabilityMessage}</p>
        <div className="composer-support">
          <div className={`opencode-runtime-card runtime-${modelCatalog.runtime}`} role="status" aria-live="polite">
            <span><Signal tone={runtimeState.tone} pulse={modelCatalog.runtime === "checking"} /> OpenCode runtime</span>
            <strong>{runtimeState.label}</strong>
            <small>{runtimeState.detail}</small>
          </div>
          <div className="opencode-connection-row">
            <div className="opencode-connection-copy">
              <span><PlugZap size={11} /> {isAr ? "محرك مضمّن" : "Embedded runtime"}</span>
              <small>{isAr ? "مصدر OpenCode الحقيقي داخل Osamah — لا مفاتيح ولا نماذج ثابتة" : "Real OpenCode source inside Osamah — no keys or fixed models"}</small>
            </div>
            <div className="opencode-connection-controls">
              <button type="button" onClick={() => void inspectOpenCode()} disabled={modelCatalog.runtime === "checking" || removeSession.isPending || isSessionCleanupBlocked}>{isAr ? "فحص المحرك" : "Check runtime"}</button>
              {activeSessionId.current && <button className="opencode-session-end" type="button" onClick={() => void discardSession(activeSessionId.current!, "manual")} disabled={createSession.isPending || sendToSession.isPending || removeSession.isPending}>{isAr ? "إنهاء الجلسة" : "End session"}</button>}
            </div>
            {connectionMessage && <small className="opencode-connection-feedback">{connectionMessage}</small>}
          </div>
          <div className="opencode-model-row">
            <div className="opencode-model-copy">
              <span><Signal tone="blue" pulse /> OpenCode</span>
              <small>{isAr ? "نماذج OpenCode المكتشفة" : "Discovered OpenCode models"}</small>
            </div>
            <Select value={selectedModelValue} onValueChange={(value) => void selectOpenCodeModel(value)} disabled={modelCatalog.models.length === 0 || isChatBusy || isSessionCleanupBlocked}>
              <SelectTrigger className="opencode-model-trigger" size="sm" aria-label={isAr ? "اختيار نموذج OpenCode" : "Choose an OpenCode model"}>
                <SelectValue placeholder={getOpenCodeModelPlaceholder({ hasDiscoveredModels: modelCatalog.models.length > 0, language: lang })} />
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
        </div>
        <div className="composer-foot">
          <span><Command size={12} /> {isAr ? "سياق" : "Context"}: {t[workspace]}</span>
          <span>{isAr ? "Enter للإرسال · Shift+Enter لسطر جديد" : "Enter to send · Shift+Enter for a new line"}</span>
        </div>
      </form>
    </aside>
  );
}

function Dashboard({ lang, onNavigate, onCommand }: { lang: Language; onNavigate: (workspace: Workspace) => void; onCommand: () => void }) {
  const t = content[lang];
  const isAr = lang === "ar";
  const projectsQuery = trpc.workspace.project.list.useQuery();
  const tasksQuery = trpc.workspace.task.list.useQuery();
  const activityQuery = trpc.workspace.activity.list.useQuery({ limit: 5 });
  const theiaQuery = trpc.theia.status.useQuery(undefined, { retry: false });
  const mindItemsQuery = trpc.secondBrain.item.list.useQuery();
  const presentationsQuery = trpc.presentations.list.useQuery();
  const presentonQuery = trpc.presenton.status.useQuery();
  const projects = projectsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const activity = activityQuery.data ?? [];
  const mindItems = mindItemsQuery.data ?? [];
  const presentations = presentationsQuery.data ?? [];
  const activeTasks = tasks.filter(task => task.status !== "done").length;
  const completedTasks = tasks.filter(task => task.status === "done").length;
  const theiaState = theiaQuery.data?.phase === "running" ? (isAr ? "يعمل" : "Running") : theiaQuery.data?.phase === "build-required" ? (isAr ? "يتطلب بناء" : "Build required") : (isAr ? "غير متاح" : "Unavailable");
  const workspaces = [
    { key: "programming" as const, title: t.programming, subtitle: isAr ? "مشاريع وملفات ومهام محفوظة بخادم Osamah" : "Osamah-server projects, files, and tasks", asset: "code", metrics: [[String(projects.length), isAr ? "مشروع" : "Projects"], [String(activeTasks), isAr ? "مهام نشطة" : "Active tasks"], [theiaState, "Theia"]] },
    { key: "presentations" as const, title: t.presentations, subtitle: isAr ? "عروض وشرائح محفوظة بخادم Osamah؛ التوليد مقيد بحالة Presenton الفعلية." : "Decks and slides are stored by Osamah; generation follows the real Presenton status.", asset: "slides", metrics: [[String(presentations.length), isAr ? "عروض" : "Decks"], [String(presentations.filter(item => item.status === "draft").length), isAr ? "مسودات" : "Drafts"], [presentonQuery.data?.generationEnabled ? (isAr ? "مهيأ" : "Configured") : (isAr ? "غير مهيأ" : "Not configured"), "Presenton"]] },
    { key: "mind" as const, title: t.mind, subtitle: isAr ? "ملاحظات ومهام مستخرجة من Second Brain محفوظة بخادم Osamah" : "Second Brain notes and extracted tasks stored by Osamah", asset: "mind", metrics: [[String(mindItems.length), isAr ? "عناصر" : "Items"], [String(mindItems.filter(item => item.kind === "source").length), isAr ? "مصادر" : "Sources"], [isAr ? "جسر مضمّن" : "Embedded bridge", "Second Brain"]] },
  ];
  const recents = projects.slice(0, 5);

  return (
    <div className="dashboard-view">
      <section className="dashboard-welcome glass-panel">
        <div className="welcome-copy">
          <div className="eyebrow"><Signal tone="blue" pulse /> {t.overview}</div>
          <h1>{projects.length > 0 ? (isAr ? "مساحة العمل جاهزة للمتابعة" : "Your workspace is ready to continue") : (isAr ? "ابدأ بمشروعك الأول" : "Start your first project")}</h1>
          <p>{projects.length > 0 ? (isAr ? "تظهر هنا بيانات المشاريع والمهام التي تحفظها في مساحة Osamah." : "This view reflects projects and tasks stored in your Osamah workspace.") : (isAr ? "لا توجد بيانات عمل محفوظة بعد. أنشئ مشروعاً من قسم البرمجة للبدء." : "No workspace data is saved yet. Create a project in Programming to begin.")}</p>
          <div className="welcome-actions">
            <GlassButton className="primary-action orbit-cta" onClick={() => onNavigate("presentations")} icon={<Presentation size={16} />}>{t.draftPresentation}</GlassButton>
            <GlassButton className="subtle-action" onClick={onCommand} icon={<Bot size={15} />}>{t.reviewPlan}</GlassButton>
          </div>
        </div>
        <img className="dashboard-orbit" src="/manus-storage/osamah-dashboard-orbit_3b3fcfc5.png" alt="" />
          <div className="orbital-stats" aria-label={isAr ? "حالة مساحة العمل" : "Workspace status"}>
            <div><span>{isAr ? "المهام النشطة" : "Active tasks"}</span><strong>{activeTasks}</strong></div>
            <div><span>{isAr ? "المهام المكتملة" : "Completed tasks"}</span><strong className="healthy"><Signal tone="green" /> {completedTasks}</strong></div>
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
          <SectionLabel action={<button type="button" className="text-action" onClick={() => onNavigate("programming")}>{t.viewAll} <ChevronRight size={14} /></button>}>{t.recentWork}</SectionLabel>
          <div className="recent-list">
            {recents.length === 0 ? <p className="workspace-data-muted dashboard-empty-state">{isAr ? "لا توجد مشاريع محفوظة حتى الآن." : "No saved projects yet."}</p> : null}
            {recents.map((project, index) => (
              <button type="button" className="recent-row" key={project.id} onClick={() => onNavigate("programming")}>
                <span className={`recent-doc doc-${index}`}><FileText size={17} /></span>
                <div><strong>{project.name}</strong><span>{project.language ?? (isAr ? "مشروع" : "Project")} · {new Date(project.updatedAt).toLocaleDateString(isAr ? "ar" : "en")}</span></div>
                <span className="recent-progress">{project.status === "active" ? (isAr ? "نشط" : "Active") : (isAr ? "مؤرشف" : "Archived")}</span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </section>
        <section className="activity-panel glass-panel">
          <SectionLabel>{isAr ? "سجل النشاط" : "Activity log"}</SectionLabel>
          {activityQuery.isLoading ? <p className="workspace-data-muted dashboard-empty-state">{isAr ? "يُحمّل النشاط…" : "Loading activity…"}</p> : null}
          {!activityQuery.isLoading && activity.length === 0 ? <p className="workspace-data-muted dashboard-empty-state">{isAr ? "سيظهر نشاطك هنا بعد إنشاء أو تحديث بيانات العمل." : "Your activity will appear here after you create or update workspace data."}</p> : null}
          {activity.map(entry => <TaskRow key={entry.id} title={activitySummary(entry.action, entry.entityType, lang)} detail={activityTime(entry.createdAt, lang)} state={entry.action === "deleted" ? "queued" : "recorded"} />)}
        </section>
      </div>
    </div>
  );
}

function ExplorerItem({ icon, label, active, depth = 0, badge, onClick }: { icon: React.ReactNode; label: string; active?: boolean; depth?: number; badge?: string; onClick: () => void }) {
  return <button type="button" className={`explorer-item ${active ? "explorer-active" : ""}`} style={{ paddingInlineStart: `${12 + depth * 16}px` }} onClick={onClick}>{icon}<span>{label}</span>{badge && <small>{badge}</small>}</button>;
}

function Programming({ lang }: { lang: Language }) {
  const isAr = lang === "ar";
  const utils = trpc.useUtils();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [operationError, setOperationError] = useState<string | null>(null);
  const theiaStatusQuery = trpc.theia.status.useQuery(undefined, { retry: false });
  const theiaSourceQuery = trpc.theia.source.useQuery(undefined, { retry: false });
  const projectsQuery = trpc.workspace.project.list.useQuery();
  const filesQuery = trpc.workspace.file.list.useQuery({ projectId: selectedProjectId ?? 0 }, { enabled: selectedProjectId !== null });
  const tasksQuery = trpc.workspace.task.list.useQuery(selectedProjectId ? { projectId: selectedProjectId } : undefined);
  const refreshWorkspace = async () => {
    await Promise.all([
      utils.workspace.project.list.invalidate(),
      selectedProjectId ? utils.workspace.file.list.invalidate({ projectId: selectedProjectId }) : Promise.resolve(),
      utils.workspace.task.list.invalidate(),
      utils.workspace.activity.list.invalidate(),
    ]);
  };
  const showFailure = (error: unknown) => setOperationError(error instanceof Error ? error.message : (isAr ? "تعذّر إكمال العملية." : "The operation could not be completed."));
  const createProject = trpc.workspace.project.create.useMutation({
    onSuccess: async project => {
      setOperationError(null);
      setSelectedProjectId(project.id);
      setSelectedFileId(null);
      await refreshWorkspace();
    },
    onError: showFailure,
  });
  const renameProject = trpc.workspace.project.update.useMutation({ onSuccess: refreshWorkspace, onError: showFailure });
  const removeProject = trpc.workspace.project.remove.useMutation({
    onSuccess: async () => {
      setSelectedProjectId(null);
      setSelectedFileId(null);
      setDraftContent("");
      await refreshWorkspace();
    },
    onError: showFailure,
  });
  const createFile = trpc.workspace.file.create.useMutation({
    onSuccess: async file => {
      setOperationError(null);
      setSelectedFileId(file.id);
      await refreshWorkspace();
    },
    onError: showFailure,
  });
  const saveFile = trpc.workspace.file.save.useMutation({ onSuccess: refreshWorkspace, onError: showFailure });
  const renameFile = trpc.workspace.file.rename.useMutation({ onSuccess: refreshWorkspace, onError: showFailure });
  const removeFile = trpc.workspace.file.remove.useMutation({
    onSuccess: async () => {
      setSelectedFileId(null);
      setDraftContent("");
      await refreshWorkspace();
    },
    onError: showFailure,
  });
  const createTask = trpc.workspace.task.create.useMutation({ onSuccess: refreshWorkspace, onError: showFailure });
  const updateTask = trpc.workspace.task.update.useMutation({ onSuccess: refreshWorkspace, onError: showFailure });
  const removeTask = trpc.workspace.task.remove.useMutation({ onSuccess: refreshWorkspace, onError: showFailure });

  const projects = projectsQuery.data ?? [];
  const files = filesQuery.data ?? [];
  const activeProject = projects.find(project => project.id === selectedProjectId) ?? null;
  const activeFile = files.find(file => file.id === selectedFileId) ?? null;
  const hasUnsavedFileChanges = Boolean(activeFile && draftContent !== (activeFile.content ?? ""));
  const isMutating = createProject.isPending || renameProject.isPending || removeProject.isPending || createFile.isPending || saveFile.isPending || renameFile.isPending || removeFile.isPending || createTask.isPending || updateTask.isPending || removeTask.isPending;

  const confirmEditorTransition = (transition: UnsavedFileTransition) => {
    if (!shouldConfirmUnsavedFileTransition({ hasActiveFile: Boolean(activeFile), hasUnsavedChanges: hasUnsavedFileChanges, transition })) return true;
    return window.confirm(isAr
      ? "لديك تعديلات غير محفوظة في الملف الحالي. سيؤدي هذا الانتقال إلى فقدانها. هل تريد المتابعة؟"
      : "The current file has unsaved changes. This transition will discard them. Continue?");
  };

  const selectFile = (nextFileId: number | null) => {
    if (nextFileId === selectedFileId || !confirmEditorTransition(nextFileId === null ? "close-file" : "switch-file")) return;
    setSelectedFileId(nextFileId);
  };

  const selectProject = (nextProjectId: number | null) => {
    if (nextProjectId === selectedProjectId || !confirmEditorTransition("switch-project")) return;
    setSelectedProjectId(nextProjectId);
    setSelectedFileId(null);
  };

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) setSelectedProjectId(projects[0].id);
    if (selectedProjectId && !projects.some(project => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0]?.id ?? null);
      setSelectedFileId(null);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedFileId && files.length > 0) setSelectedFileId(files.find(file => file.kind === "file")?.id ?? null);
    if (selectedFileId && !files.some(file => file.id === selectedFileId)) setSelectedFileId(files.find(file => file.kind === "file")?.id ?? null);
  }, [files, selectedFileId]);

  useEffect(() => {
    setDraftContent(activeFile?.content ?? "");
  }, [activeFile?.id, activeFile?.content]);

  const askForProject = () => {
    if (!confirmEditorTransition("create-project")) return;
    const name = window.prompt(isAr ? "اسم المشروع" : "Project name");
    if (!name?.trim()) return;
    createProject.mutate({ name: name.trim(), language: "TypeScript" });
  };
  const askForFile = () => {
    if (!selectedProjectId) return;
    const name = window.prompt(isAr ? "اسم الملف، مثال: app.ts" : "File name, for example: app.ts");
    if (!name?.trim()) return;
    const normalizedName = name.trim().replace(/^\/+/, "");
    createFile.mutate({ projectId: selectedProjectId, path: normalizedName, name: normalizedName.split("/").at(-1) ?? normalizedName, kind: "file", language: normalizedName.endsWith(".ts") || normalizedName.endsWith(".tsx") ? "TypeScript" : null, content: "" });
  };
  const askToRenameProject = () => {
    if (!activeProject) return;
    const name = window.prompt(isAr ? "اسم المشروع الجديد" : "New project name", activeProject.name);
    if (!name?.trim() || name.trim() === activeProject.name) return;
    renameProject.mutate({ id: activeProject.id, name: name.trim() });
  };
  const askToRenameFile = () => {
    if (!activeFile) return;
    const path = window.prompt(isAr ? "مسار الملف الجديد" : "New file path", activeFile.path);
    if (!path?.trim() || path.trim() === activeFile.path) return;
    const normalizedPath = path.trim().replace(/^\/+/, "");
    renameFile.mutate({ id: activeFile.id, path: normalizedPath, name: normalizedPath.split("/").at(-1) ?? normalizedPath });
  };
  const askForTask = () => {
    const title = window.prompt(isAr ? "عنوان المهمة" : "Task title");
    if (!title?.trim()) return;
    createTask.mutate({ title: title.trim(), projectId: selectedProjectId ?? null, status: "todo" });
  };
  const theiaPhase = theiaStatusQuery.data?.phase;
  const theiaTone = theiaStatusQuery.isLoading
    ? "blue"
    : theiaPhase === "running"
      ? "green"
      : theiaPhase === "build-required"
        ? "amber"
        : theiaPhase === "source-missing" || theiaPhase === "unreachable"
          ? "coral"
          : "slate";
  const theiaLabel = theiaStatusQuery.isLoading
    ? (isAr ? "يتم الفحص" : "Checking")
    : theiaPhase === "running"
      ? (isAr ? "يعمل" : "Running")
      : theiaPhase === "build-required"
        ? (isAr ? "يتطلب بناء" : "Build required")
        : theiaPhase === "ready"
          ? (isAr ? "مبني وغير مشغّل" : "Built, not running")
          : theiaPhase === "source-missing"
            ? (isAr ? "المصدر غير متاح" : "Source unavailable")
            : (isAr ? "غير متاح" : "Unavailable");
  const theiaDetail = theiaStatusQuery.data?.detail ?? (isAr ? "تُراجع حالة مصدر Theia المضمّن." : "Reviewing the embedded Theia source state.");
  const theiaVersion = theiaSourceQuery.data?.version ? `v${theiaSourceQuery.data.version}` : undefined;
  return (
    <div className="programming-view workspace-view">
      <div className="workspace-toolbar">
        <div className="toolbar-tabs">
          {activeFile ? <button type="button" className="active-tab" onClick={() => selectFile(null)}><FileCode2 size={15} /> {activeFile.name} <X size={13} /></button> : <span className="workspace-empty-tab">{isAr ? "لا يوجد ملف مفتوح" : "No file open"}</span>}
          <button type="button" className="toolbar-add" onClick={askForFile} disabled={!activeProject || isMutating} aria-label={isAr ? "ملف جديد" : "New file"}><Plus size={15} /></button>
        </div>
        <div className="toolbar-controls"><button type="button" className="theia-state-control" onClick={() => void theiaStatusQuery.refetch()} disabled={theiaStatusQuery.isFetching} title={theiaDetail}><Signal tone={theiaTone} pulse={theiaStatusQuery.isFetching || theiaPhase === "running"} /> Theia · {theiaLabel}</button><span className="runtime-readonly"><Play size={14} /> {isAr ? "التشغيل يتطلب بناء Theia" : "Run requires a Theia build"}</span></div>
      </div>
      <div className="programming-grid">
        <aside className="project-explorer glass-panel">
          <SectionLabel action={<button type="button" onClick={askForProject} disabled={isMutating} aria-label={isAr ? "مشروع جديد" : "New project"}><Plus size={15} /></button>}>{isAr ? "المستكشف" : "Explorer"}</SectionLabel>
          <div className="project-picker">
            <select value={selectedProjectId ?? ""} onChange={event => selectProject(event.target.value ? Number(event.target.value) : null)} disabled={projectsQuery.isLoading || isMutating} aria-label={isAr ? "المشروع" : "Project"}>
              <option value="">{projects.length === 0 ? (isAr ? "أنشئ مشروعاً للبدء" : "Create a project to begin") : (isAr ? "اختر مشروعاً" : "Select a project")}</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <button type="button" onClick={askToRenameProject} disabled={!activeProject || isMutating} aria-label={isAr ? "إعادة تسمية المشروع" : "Rename project"}><MoreHorizontal size={14} /></button>
            <button type="button" className="danger-icon-action" onClick={() => { if (activeProject && window.confirm(isAr ? "سيُحذف المشروع وكل ملفاته ومهامه نهائياً. هل تريد المتابعة؟" : "This will permanently delete the project, its files, and tasks. Continue?")) removeProject.mutate({ id: activeProject.id }); }} disabled={!activeProject || isMutating} aria-label={isAr ? "حذف المشروع" : "Delete project"}><Trash2 size={14} /></button>
          </div>
          <div className="file-tree">
            {filesQuery.isLoading ? <p className="workspace-data-muted">{isAr ? "يُحمّل الملفات…" : "Loading files…"}</p> : null}
            {!filesQuery.isLoading && activeProject && files.length === 0 ? <p className="workspace-data-muted">{isAr ? "لا توجد ملفات. أضف ملفاً جديداً." : "No files yet. Add a new file."}</p> : null}
            {files.map(file => <ExplorerItem key={file.id} icon={file.kind === "directory" ? <Folder size={14} /> : <FileCode2 size={14} />} label={file.path} active={file.id === selectedFileId} badge={file.id === activeFile?.id && hasUnsavedFileChanges ? "M" : undefined} onClick={() => selectFile(file.id)} />)}
          </div>
          <div className="explorer-footer"><button type="button" onClick={askForFile} disabled={!activeProject || isMutating}><Plus size={14} /> {isAr ? "ملف جديد" : "New file"}</button><button type="button" onClick={askForProject} disabled={isMutating}><FolderOpen size={14} /> {isAr ? "مشروع جديد" : "New project"}</button></div>
        </aside>
        <section className="code-stage glass-panel">
          <div className={`theia-runtime-card theia-${theiaPhase ?? "checking"}`} role="status" aria-live="polite">
            <div className="theia-runtime-copy">
              <span><Signal tone={theiaTone} pulse={theiaStatusQuery.isFetching} /> {isAr ? "محرك مساحة البرمجة" : "Programming workspace engine"}</span>
              <strong>Eclipse Theia {theiaVersion ? `· ${theiaVersion}` : ""}</strong>
              <p>{theiaDetail}</p>
            </div>
            <button onClick={() => void theiaStatusQuery.refetch()} disabled={theiaStatusQuery.isFetching}>{isAr ? "فحص الحالة" : "Refresh status"}</button>
          </div>
          <div className="breadcrumb"><Folder size={13} /> <span>{activeProject?.name ?? (isAr ? "لا يوجد مشروع" : "No project")}</span>{activeFile ? <><ChevronRight size={12} /><span>{activeFile.path}</span>{draftContent !== (activeFile.content ?? "") ? <span className="modified-indicator">M</span> : null}</> : null}</div>
          {activeFile ? <div className="workspace-editor-shell">
            <textarea className="workspace-code-editor" dir="ltr" spellCheck={false} value={draftContent} onChange={event => setDraftContent(event.target.value)} disabled={isMutating} aria-label={isAr ? "محتوى الملف" : "File content"} />
            <div className="workspace-editor-actions">
              <span>{activeFile.language ?? (isAr ? "نص عادي" : "Plain text")}</span>
              <button type="button" onClick={askToRenameFile} disabled={isMutating}>{isAr ? "إعادة تسمية" : "Rename"}</button>
              <button type="button" className="danger-action" onClick={() => { if (window.confirm(isAr ? "حذف هذا الملف نهائياً؟" : "Delete this file permanently?")) removeFile.mutate({ id: activeFile.id }); }} disabled={isMutating}>{isAr ? "حذف" : "Delete"}</button>
              <button type="button" className="save-action" onClick={() => saveFile.mutate({ id: activeFile.id, content: draftContent, language: activeFile.language })} disabled={isMutating || draftContent === (activeFile.content ?? "")}>{saveFile.isPending ? (isAr ? "يُحفظ…" : "Saving…") : (isAr ? "حفظ" : "Save")}</button>
            </div>
          </div> : <div className="workspace-empty-editor"><FileCode2 size={28} /><strong>{isAr ? "افتح ملفاً أو أنشئ ملفاً جديداً" : "Open a file or create a new one"}</strong><button type="button" onClick={askForFile} disabled={!activeProject || isMutating}>{isAr ? "ملف جديد" : "New file"}</button></div>}
          {operationError ? <p className="workspace-operation-error" role="alert">{operationError}</p> : null}
        </section>
      </div>
      <section className="terminal-panel glass-panel" dir="ltr">
        <div className="terminal-tabs"><span className="active-terminal">{isAr ? "المهام" : "TASKS"}</span><button type="button" onClick={askForTask} disabled={isMutating}><Plus size={14} /> {isAr ? "مهمة" : "Task"}</button></div>
        <div className="workspace-task-list" dir={isAr ? "rtl" : "ltr"}>{tasksQuery.isLoading ? <p>{isAr ? "تُحمّل المهام…" : "Loading tasks…"}</p> : null}{!tasksQuery.isLoading && (tasksQuery.data?.length ?? 0) === 0 ? <p>{isAr ? "لا توجد مهام لهذا المشروع." : "No tasks for this project."}</p> : null}{tasksQuery.data?.map(task => <div className="workspace-task-row" key={task.id}><button type="button" className={task.status === "done" ? "task-complete" : ""} onClick={() => updateTask.mutate({ id: task.id, status: task.status === "done" ? "todo" : "done" })} disabled={isMutating} aria-label={isAr ? "تغيير حالة المهمة" : "Change task status"}>{task.status === "done" ? "✓" : "○"}</button><span>{task.title}</span><small>{task.status === "in_progress" ? (isAr ? "قيد التنفيذ" : "In progress") : task.status === "done" ? (isAr ? "مكتملة" : "Done") : (isAr ? "للقيام" : "To do")}</small><button type="button" className="danger-icon-action" onClick={() => { if (window.confirm(isAr ? "حذف هذه المهمة نهائياً؟" : "Delete this task permanently?")) removeTask.mutate({ id: task.id }); }} disabled={isMutating} aria-label={isAr ? "حذف المهمة" : "Delete task"}><Trash2 size={13} /></button></div>)}</div>
      </section>
    </div>
  );
}

function SecondMind({ lang }: { lang: Language }) {
  const isAr = lang === "ar";
  const utils = trpc.useUtils();
  const itemsQuery = trpc.secondBrain.item.list.useQuery();
  const linksQuery = trpc.secondBrain.link.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearchTerm = searchTerm.trim();
  const searchQuery = trpc.secondBrain.item.search.useQuery(normalizedSearchTerm ? { term: normalizedSearchTerm } : skipToken);
  const refreshItems = () => {
    void utils.secondBrain.item.list.invalidate();
    void utils.secondBrain.item.search.invalidate();
  };
  const refreshLinks = () => {
    void utils.secondBrain.link.list.invalidate();
    void utils.workspace.activity.list.invalidate();
  };
  const createItem = trpc.secondBrain.item.create.useMutation({ onSuccess: refreshItems });
  const updateItem = trpc.secondBrain.item.update.useMutation({ onSuccess: refreshItems });
  const removeItem = trpc.secondBrain.item.remove.useMutation({ onSuccess: () => { refreshItems(); refreshLinks(); } });
  const createLink = trpc.secondBrain.link.create.useMutation({ onSuccess: refreshLinks });
  const updateLink = trpc.secondBrain.link.update.useMutation({ onSuccess: refreshLinks });
  const removeLink = trpc.secondBrain.link.remove.useMutation({ onSuccess: refreshLinks });
  const extractCandidates = trpc.secondBrain.taskCandidates.useMutation();
  const materializeTasks = trpc.secondBrain.materializeNoteTasks.useMutation({ onSuccess: () => void utils.workspace.task.list.invalidate() });
  const items = itemsQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"note" | "source" | "insight">("note");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
  const [editingLinkLabel, setEditingLinkLabel] = useState("");
  const selected = items.find(item => item.id === selectedId);
  const displayedItems = normalizedSearchTerm ? searchQuery.data ?? [] : items;
  const links = linksQuery.data ?? [];
  const selectedLinks = selectedId ? links.filter(link => link.fromItemId === selectedId || link.toItemId === selectedId) : [];
  const pending = createItem.isPending || updateItem.isPending || removeItem.isPending || createLink.isPending || updateLink.isPending || removeLink.isPending || extractCandidates.isPending || materializeTasks.isPending;

  useEffect(() => {
    if (!selected && items[0]) setSelectedId(items[0].id);
  }, [items, selected]);
  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title);
    setKind(selected.kind);
    setContent(selected.content ?? "");
    setSourceUrl(selected.sourceUrl ?? "");
    setCandidates([]);
    setEditingLinkId(null);
    setEditingLinkLabel("");
  }, [selected?.id]);

  const resetDraft = () => {
    setSelectedId(null);
    setTitle("");
    setKind("note");
    setContent("");
    setSourceUrl("");
    setCandidates([]);
    setLinkTargetId("");
    setLinkLabel("");
    setEditingLinkId(null);
    setEditingLinkLabel("");
  };
  const save = () => {
    const payload = { title: title.trim(), kind, content: content || null, sourceUrl: sourceUrl.trim() || null };
    if (!payload.title) return;
    if (selectedId) {
      updateItem.mutate({ id: selectedId, ...payload });
    } else {
      createItem.mutate(payload, { onSuccess: item => setSelectedId(item.id) });
    }
  };
  const select = (id: number) => setSelectedId(id);
  const kindLabel = (itemKind: "note" | "source" | "insight") => itemKind === "note" ? (isAr ? "ملاحظة" : "Note") : itemKind === "source" ? (isAr ? "مصدر" : "Source") : (isAr ? "رؤية" : "Insight");
  const itemLabel = (itemId: number) => items.find(item => item.id === itemId)?.title ?? (isAr ? "عنصر محذوف" : "Deleted item");
  const createSelectedLink = () => {
    const toItemId = Number(linkTargetId);
    if (!selectedId || !Number.isInteger(toItemId) || toItemId === selectedId) return;
    createLink.mutate({ fromItemId: selectedId, toItemId, label: linkLabel.trim() || null }, { onSuccess: () => { setLinkTargetId(""); setLinkLabel(""); } });
  };
  const saveLinkLabel = () => {
    if (!editingLinkId) return;
    updateLink.mutate({ id: editingLinkId, label: editingLinkLabel.trim() || null }, { onSuccess: () => { setEditingLinkId(null); setEditingLinkLabel(""); } });
  };
  const operationError = createItem.error?.message ?? updateItem.error?.message ?? removeItem.error?.message ?? createLink.error?.message ?? updateLink.error?.message ?? removeLink.error?.message ?? extractCandidates.error?.message ?? materializeTasks.error?.message;

  return (
    <div className="mind-view workspace-view secondbrain-view">
      <div className="mind-toolbar"><div><span className="eyebrow"><Signal tone="cyan" pulse /> {isAr ? "Second Brain · مصدر فعلي" : "Second Brain · real source"}</span><h2>{isAr ? "معرفتك المحفوظة" : "Your saved knowledge"}</h2></div><div className="mind-toolbar-actions"><button onClick={resetDraft} disabled={pending}><Plus size={15} /> {isAr ? "ملاحظة جديدة" : "New note"}</button></div></div>
      <div className="mind-grid secondbrain-grid">
        <aside className="knowledge-sidebar glass-panel">
          <SectionLabel>{isAr ? "العناصر" : "Items"}</SectionLabel>
          <label className="secondbrain-search"><Search size={14} /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder={isAr ? "ابحث في العنوان أو المحتوى أو الرابط" : "Search title, content, or URL"} /></label>
          <div className="knowledge-nav secondbrain-item-list">
            {itemsQuery.isLoading && <p className="workspace-data-muted">{isAr ? "جارٍ تحميل المعرفة…" : "Loading knowledge…"}</p>}
            {itemsQuery.error && <p className="workspace-operation-error" role="alert">{isAr ? `تعذر تحميل عناصر المعرفة: ${itemsQuery.error.message}` : `Could not load knowledge items: ${itemsQuery.error.message}`} <button type="button" onClick={() => void itemsQuery.refetch()}>{isAr ? "إعادة المحاولة" : "Retry"}</button></p>}
            {!itemsQuery.isLoading && !normalizedSearchTerm && items.length === 0 && <p className="workspace-data-muted">{isAr ? "لا توجد ملاحظات محفوظة. أنشئ أول ملاحظة." : "No saved notes yet. Create your first note."}</p>}
            {normalizedSearchTerm && searchQuery.isLoading && <p className="workspace-data-muted">{isAr ? "جارٍ البحث في المعرفة…" : "Searching knowledge…"}</p>}
            {normalizedSearchTerm && searchQuery.error && <p className="workspace-operation-error" role="alert">{isAr ? `تعذر تنفيذ البحث: ${searchQuery.error.message}` : `Could not search knowledge: ${searchQuery.error.message}`} <button type="button" onClick={() => void searchQuery.refetch()}>{isAr ? "إعادة المحاولة" : "Retry"}</button></p>}
            {normalizedSearchTerm && !searchQuery.isLoading && displayedItems.length === 0 && <p className="workspace-data-muted">{isAr ? "لا توجد نتائج مطابقة." : "No matching results."}</p>}
            {displayedItems.map(item => <button type="button" onClick={() => select(item.id)} className={item.id === selectedId ? "knowledge-active" : ""} key={item.id}><span><FileText size={15} /> {item.title}</span><small>{kindLabel(item.kind)}</small></button>)}
          </div>
          <div className="knowledge-side-bottom"><span>{isAr ? "المحفوظ في Osamah" : "Stored in Osamah"}</span><strong>{items.length} <em>{isAr ? "عنصراً" : "items"}</em></strong><div><i style={{ inlineSize: `${Math.min(items.length * 14, 100)}%` }} /></div></div>
        </aside>
        <section className="knowledge-stage glass-panel secondbrain-editor">
          <div className="knowledge-stage-head"><div><span>{selectedId ? (isAr ? "تحرير عنصر محفوظ" : "Edit saved item") : (isAr ? "إنشاء عنصر جديد" : "Create new item")}</span><strong>{selectedId ? (isAr ? "التغييرات تحفظ في قاعدة البيانات" : "Changes save to the database") : (isAr ? "لا توجد بيانات افتراضية" : "No default data")}</strong></div></div>
          <div className="secondbrain-form">
            <label>{isAr ? "العنوان" : "Title"}<input value={title} onChange={event => setTitle(event.target.value)} placeholder={isAr ? "عنوان واضح للمعلومة" : "A clear knowledge title"} disabled={pending} /></label>
            <div className="secondbrain-form-row"><label>{isAr ? "النوع" : "Kind"}<select value={kind} onChange={event => setKind(event.target.value as typeof kind)} disabled={pending}><option value="note">{isAr ? "ملاحظة" : "Note"}</option><option value="source">{isAr ? "مصدر" : "Source"}</option><option value="insight">{isAr ? "رؤية" : "Insight"}</option></select></label><label>{isAr ? "رابط المصدر" : "Source URL"}<input value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder="https://…" disabled={pending} /></label></div>
            <label>{isAr ? "المحتوى" : "Content"}<textarea value={content} onChange={event => setContent(event.target.value)} placeholder={isAr ? "اكتب ما تريد حفظه. تستخدم مهام - [ ] النص الأصلي لـSecond Brain." : "Write what you want to keep. Use - [ ] tasks for the original Second Brain extractor."} disabled={pending} /></label>
          </div>
          <div className="workspace-editor-actions"><span>{isAr ? "يتطلب استخراج المهام ملاحظة محفوظة." : "Task extraction requires a saved note."}</span>{selectedId && <button type="button" className="danger-action" onClick={() => { if (window.confirm(isAr ? "حذف هذا العنصر نهائياً؟" : "Delete this item permanently?")) { removeItem.mutate({ id: selectedId }, { onSuccess: resetDraft }); } }} disabled={pending}><Trash2 size={13} /> {isAr ? "حذف" : "Delete"}</button>}<button type="button" className="save-action" onClick={save} disabled={pending || !title.trim()}>{isAr ? "حفظ" : "Save"}</button></div>
          {operationError && <p className="workspace-operation-error secondbrain-operation-error" role="alert">{isAr ? `تعذر إتمام العملية: ${operationError}` : `The operation could not be completed: ${operationError}`}</p>}
          {selectedId && <div className="secondbrain-link-editor"><div><Link2 size={14} /><strong>{isAr ? "ربط عنصر معرفي" : "Link a knowledge item"}</strong></div><select value={linkTargetId} onChange={event => setLinkTargetId(event.target.value)} disabled={pending}><option value="">{isAr ? "اختر عنصراً محفوظاً" : "Choose a saved item"}</option>{items.filter(item => item.id !== selectedId && !links.some(link => link.fromItemId === selectedId && link.toItemId === item.id)).map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select><input value={linkLabel} onChange={event => setLinkLabel(event.target.value)} maxLength={160} placeholder={isAr ? "وصف الرابط (اختياري)" : "Link label (optional)"} disabled={pending} /><button type="button" onClick={createSelectedLink} disabled={pending || !linkTargetId}>{isAr ? "إضافة الرابط" : "Add link"}</button></div>}
        </section>
        <aside className="insight-panel glass-panel secondbrain-tasks">
          <SectionLabel>{isAr ? "مهام من Second Brain" : "Tasks from Second Brain"}</SectionLabel>
          <p>{isAr ? "يستدعي هذا المسار مستخرج المهام الأصلي في المصدر المضمّن. لا يستخدم نموذجاً محلياً أو رداً اصطناعياً." : "This path calls the original extractor in the embedded source. It uses no local model or fabricated response."}</p>
          <button className="insight-action" type="button" onClick={() => extractCandidates.mutate({ content }, { onSuccess: result => setCandidates(result) })} disabled={pending || !content.trim()}><Search size={14} /> {isAr ? "استخرج المهام" : "Extract tasks"}</button>
          {candidates.length > 0 && <div className="secondbrain-candidates">{candidates.map(candidate => <span key={candidate}><Clock3 size={13} /> {candidate}</span>)}</div>}
          {selectedId && <button className="insight-source" type="button" onClick={() => materializeTasks.mutate({ id: selectedId }, { onSuccess: result => setCandidates(result.candidates) })} disabled={pending || !content.trim()}><span><Plus size={15} /></span><div><strong>{isAr ? "أنشئ المهام في مساحة العمل" : "Create workspace tasks"}</strong><small>{isAr ? "ينشئ العناصر المفتوحة فقط ويتجنب التكرار." : "Creates open items only and avoids duplicates."}</small></div><ChevronRight size={14} /></button>}
          {materializeTasks.data && <p className="workspace-data-muted">{isAr ? `أُنشئت ${materializeTasks.data.created} مهام من ${materializeTasks.data.candidates.length} مرشحات.` : `${materializeTasks.data.created} tasks created from ${materializeTasks.data.candidates.length} candidates.`}</p>}
          {selectedId && <div className="secondbrain-links"><SectionLabel>{isAr ? "روابط هذا العنصر" : "This item's links"}</SectionLabel>{linksQuery.isLoading && <p className="workspace-data-muted">{isAr ? "جارٍ تحميل الروابط…" : "Loading links…"}</p>}{linksQuery.error && <p className="workspace-operation-error" role="alert">{isAr ? `تعذر تحميل الروابط: ${linksQuery.error.message}` : `Could not load links: ${linksQuery.error.message}`} <button type="button" onClick={() => void linksQuery.refetch()}>{isAr ? "إعادة المحاولة" : "Retry"}</button></p>}{!linksQuery.isLoading && selectedLinks.length === 0 && <p className="workspace-data-muted">{isAr ? "لا توجد روابط محفوظة لهذا العنصر." : "No saved links for this item."}</p>}{selectedLinks.map(link => { const relatedId = link.fromItemId === selectedId ? link.toItemId : link.fromItemId; const editing = editingLinkId === link.id; return <div className="secondbrain-link-row" key={link.id}>{editing ? <div className="secondbrain-link-edit"><input value={editingLinkLabel} onChange={event => setEditingLinkLabel(event.target.value)} maxLength={160} aria-label={isAr ? "وسم الرابط" : "Link label"} disabled={pending} /><button type="button" onClick={saveLinkLabel} disabled={pending}>{isAr ? "حفظ" : "Save"}</button><button type="button" onClick={() => { setEditingLinkId(null); setEditingLinkLabel(""); }} disabled={pending}>{isAr ? "إلغاء" : "Cancel"}</button></div> : <span><Link2 size={13} /><strong>{itemLabel(relatedId)}</strong>{link.label && <small>{link.label}</small>}</span>}<button type="button" onClick={() => { if (editing) { setEditingLinkId(null); setEditingLinkLabel(""); } else { setEditingLinkId(link.id); setEditingLinkLabel(link.label ?? ""); } }} disabled={pending} aria-label={isAr ? "تعديل الرابط" : "Edit link"}>{editing ? <X size={13} /> : <Settings2 size={13} />}</button><button type="button" onClick={() => { if (window.confirm(isAr ? "حذف هذا الرابط؟" : "Delete this link?")) removeLink.mutate({ id: link.id }); }} disabled={pending} aria-label={isAr ? "حذف الرابط" : "Delete link"}><Trash2 size={13} /></button></div>; })}</div>}
        </aside>
      </div>
    </div>
  );
}

function CommandPalette({ lang, onClose, onNavigate }: { lang: Language; onClose: () => void; onNavigate: (workspace: Workspace) => void }) {
  const isAr = lang === "ar";
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const commands = useMemo(() => filterWorkspaceCommands(getWorkspaceCommands(lang), query), [lang, query]);
  const iconFor = (icon: "code" | "presentation" | "mind") => icon === "code" ? <Code2 size={16} /> : icon === "presentation" ? <Presentation size={16} /> : <BookOpen size={16} />;
  const execute = (index: number) => {
    const command = commands[index];
    if (!command) return;
    onNavigate(command.target);
    onClose();
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex(current => Math.min(current + 1, Math.max(commands.length - 1, 0))); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex(current => Math.max(current - 1, 0)); return; }
    if (event.key === "Enter") { event.preventDefault(); execute(activeIndex); }
  };
  return <div className="command-overlay" role="dialog" aria-modal="true" aria-label={isAr ? "لوحة الأوامر" : "Command palette"} onMouseDown={onClose}><div className="command-palette glass-panel" onMouseDown={(event) => event.stopPropagation()}><div className="command-input"><Search size={18} /><input autoFocus value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={handleKeyDown} placeholder={isAr ? "اكتب أمراً أو ابحث…" : "Type a command or search…"} role="combobox" aria-expanded="true" aria-controls="workspace-command-results" aria-activedescendant={commands[activeIndex] ? `workspace-command-${commands[activeIndex].target}` : undefined} /><kbd>ESC</kbd></div><div className="command-section" id="workspace-command-results" role="listbox"><span>{isAr ? "اقتراحات" : "Suggestions"}</span>{commands.map((command, index) => <button id={`workspace-command-${command.target}`} key={command.target} type="button" role="option" aria-selected={index === activeIndex} className={index === activeIndex ? "command-active" : ""} onMouseEnter={() => setActiveIndex(index)} onClick={() => execute(index)}><span className="command-icon">{iconFor(command.icon)}</span><div><strong>{command.title}</strong><small>{command.detail}</small></div><ChevronRight size={16} /></button>)}{commands.length === 0 && <p className="workspace-data-muted">{isAr ? "لا توجد أوامر مطابقة." : "No matching commands."}</p>}</div><div className="command-footer"><span><kbd>↵</kbd> {isAr ? "للتنفيذ" : "to run"}</span><span><kbd>↑↓</kbd> {isAr ? "للتنقل" : "to navigate"}</span></div></div></div>;
}

export default function OsamahWorkspace() {
  const [language, setLanguage] = useState<Language>("ar");
  const [workspace, setWorkspace] = useState<Workspace>("dashboard");
  const [isAICollapsed, setAIcollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const utils = trpc.useUtils();
  const preferencesQuery = trpc.preferences.get.useQuery();
  const profileQuery = trpc.auth.me.useQuery();
  const activityQuery = trpc.workspace.activity.list.useQuery({ limit: 5 });
  const projectsQuery = trpc.workspace.project.list.useQuery();
  const tasksQuery = trpc.workspace.task.list.useQuery();
  const opencodeStatusQuery = trpc.opencode.status.useQuery();
  const enginesStatusQuery = trpc.engines.status.useQuery();
  const preferenceMutation = trpc.preferences.update.useMutation({
    onSuccess: (next) => utils.preferences.get.setData(undefined, next),
  });
  const profileMutation = trpc.auth.local.updateProfile.useMutation({
    onSuccess: () => void utils.auth.me.invalidate(),
  });
  const t = content[language];
  const isAr = language === "ar";
  const meta = workspaceMeta[workspace];
  const WorkspaceIcon = meta.icon;
  const activityEntries = activityQuery.data ?? [];
  const workspaceTitle = workspace === "dashboard"
    ? t.overview
    : workspace === "programming"
      ? (projectsQuery.data?.[0]?.name ?? (isAr ? "لا يوجد مشروع محدد" : "No project selected"))
      : workspace === "presentations"
        ? (isAr ? "استوديو العروض المحفوظة" : "Saved presentation studio")
        : workspace === "mind"
          ? (isAr ? "عناصر المعرفة المحفوظة" : "Saved knowledge items")
          : t.settings;
  const contextDetail = workspace === "programming"
    ? (projectsQuery.isLoading ? (isAr ? "تُحمّل المشاريع…" : "Loading projects…") : (isAr ? `${projectsQuery.data?.length ?? 0} مشاريع محفوظة` : `${projectsQuery.data?.length ?? 0} saved projects`))
    : workspace === "presentations"
      ? (isAr ? "العروض والشرائح محفوظة خادمياً" : "Decks and slides are server-saved")
      : workspace === "mind"
        ? (isAr ? "الملاحظات والروابط محفوظة خادمياً" : "Notes and links are server-saved")
        : workspace === "settings"
          ? (isAr ? "تفضيلات الحساب الخادمية" : "Server-backed account preferences")
          : (activityQuery.isLoading ? (isAr ? "يُحمّل سجل النشاط…" : "Loading activity…") : (isAr ? `${activityEntries.length} أحداث نشاط حديثة` : `${activityEntries.length} recent activity events`));
  const runtimeDetail = opencodeStatusQuery.data?.health === "healthy"
    ? (isAr ? "صحة OpenCode مُتحقق منها" : "OpenCode health verified")
    : (isAr ? "OpenCode غير مهيأ" : "OpenCode not configured");
  const footerProject = projectsQuery.data?.[0]?.name ?? (isAr ? "لا يوجد مشروع محفوظ" : "No saved project");
  const footerActiveTasks = (tasksQuery.data ?? []).filter((task) => task.status !== "done").length;
  const footerHasLoadError = Boolean(projectsQuery.error || tasksQuery.error || activityQuery.error);
  const footerIsLoading = projectsQuery.isLoading || tasksQuery.isLoading || activityQuery.isLoading;
  const helpEnginePhase = getWorkspaceHelpEnginePhase({
    isLoading: enginesStatusQuery.isLoading,
    isError: enginesStatusQuery.isError,
    engineCount: enginesStatusQuery.data?.engines.length ?? 0,
  });
  const footerTone = footerHasLoadError ? "coral" : footerIsLoading ? "blue" : "green";
  const footerStatus = footerHasLoadError
    ? (isAr ? "تعذر تحميل بعض بيانات مساحة العمل" : "Some workspace data could not load")
    : footerIsLoading
      ? (isAr ? "يُحمّل ملخص مساحة العمل…" : "Loading workspace summary…")
      : (isAr ? "بيانات مساحة العمل محفوظة خادمياً" : "Workspace data is server-saved");

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    document.body.classList.toggle("lang-ar", isAr);
    document.body.classList.toggle("lang-en", !isAr);
  }, [isAr, language]);

  useEffect(() => {
    const saved = preferencesQuery.data;
    if (!saved) return;
    if (saved.language !== language) setLanguage(saved.language);
    if (saved.theme !== theme) setTheme?.(saved.theme);
  }, [language, preferencesQuery.data, setTheme, theme]);

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
    setHelpOpen(false);
  };

  const savePreference = (input: PreferencePatch) => preferenceMutation.mutate(input);
  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    savePreference({ language: nextLanguage });
  };
  const changeTheme = (nextTheme: "light" | "dark") => {
    setTheme?.(nextTheme);
    savePreference({ theme: nextTheme });
  };

  const activeContent = {
    dashboard: <Dashboard lang={language} onNavigate={navigate} onCommand={() => setCommandOpen(true)} />,
    programming: <Programming lang={language} />,
    presentations: <PresentationStudio lang={language} />,
    mind: <SecondMind lang={language} />,
    settings: <ServerSettingsView lang={language} theme={theme} onThemeChange={changeTheme} onLanguageChange={changeLanguage} preferences={preferencesQuery.data as SavedPreferences | undefined} profile={profileQuery.data} isSaving={preferenceMutation.isPending || profileMutation.isPending} errorMessage={preferenceMutation.error?.message ?? profileMutation.error?.message} onPreferenceChange={savePreference} onProfileSave={(input) => profileMutation.mutate(input)} />,
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
          <button className="language-toggle" onClick={() => changeLanguage(isAr ? "en" : "ar")}><Globe2 size={15} /><span>{t.language}</span></button>
          <button className="theme-toggle" onClick={() => changeTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? (isAr ? "تفعيل العرض الفاتح" : "Enable light mode") : (isAr ? "تفعيل العرض الداكن" : "Enable dark mode")}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}<span>{theme === "dark" ? (isAr ? "فاتح" : "Light") : (isAr ? "داكن" : "Dark")}</span></button>
          <div className="notification-wrap"><button className={`top-icon-button ${notificationsOpen ? "top-icon-active" : ""}`} onClick={() => setNotificationsOpen((visible) => !visible)} aria-label={t.notifications}><Bell size={17} />{activityEntries.length > 0 && <i>{activityEntries.length}</i>}</button>{notificationsOpen && <div className="notifications-popover glass-panel"><SectionLabel action={<button className="view-notifications" type="button" onClick={() => void activityQuery.refetch()} disabled={activityQuery.isFetching}>{isAr ? "تحديث" : "Refresh"}</button>}>{t.notifications}</SectionLabel>{activityQuery.isLoading && <p className="workspace-data-muted">{isAr ? "يُحمّل سجل النشاط…" : "Loading activity…"}</p>}{activityQuery.error && <div className="workspace-operation-error" role="alert">{isAr ? `تعذر تحميل سجل النشاط: ${activityQuery.error.message}` : `Could not load activity: ${activityQuery.error.message}`} <button type="button" onClick={() => void activityQuery.refetch()}>{isAr ? "إعادة المحاولة" : "Retry"}</button></div>}{!activityQuery.isLoading && !activityQuery.error && activityEntries.length === 0 && <p className="workspace-data-muted">{isAr ? "لا توجد أحداث نشاط محفوظة بعد." : "No activity events have been saved yet."}</p>}{activityEntries.map(entry => <TaskRow key={entry.id} title={activitySummary(entry.action, entry.entityType, language)} detail={activityTime(entry.createdAt, language)} state="recorded" />)}</div>}</div>
          <button className="profile-button" type="button" onClick={() => navigate("settings")} aria-label={isAr ? "فتح إعدادات الحساب" : "Open account settings"}><span>OS</span><ChevronDown size={14} /></button>
        </div>
      </header>
      <div className="app-shell">
        <aside className="main-nav">
          <div className="nav-items">{navigation.map((item) => { const Icon = workspaceMeta[item.key].icon; return <button className={`nav-item ${workspace === item.key ? "nav-active" : ""}`} onClick={() => navigate(item.key)} key={item.key}><Icon size={18} /><span>{item.label}</span>{workspace === item.key && <i />}</button>; })}</div>
          <div className="nav-bottom"><button className="nav-item help-center-trigger" type="button" onClick={() => setHelpOpen(true)} aria-haspopup="dialog" aria-expanded={helpOpen}><CircleHelp size={18} /><span>{isAr ? "مركز المساعدة" : "Help center"}</span></button><div className="connection-state"><Signal tone={footerTone} /><span>{footerStatus}</span></div></div>
        </aside>
        <main className="main-workspace">
          <div className="context-bar"><div className="context-label"><WorkspaceIcon size={15} /><span>{t.workspace}</span><ChevronRight size={14} /><strong>{workspaceTitle}</strong></div><div className="context-states"><span><Folder size={13} /> {contextDetail}</span><span><Signal tone={opencodeStatusQuery.data?.health === "healthy" ? "green" : "amber"} /> {runtimeDetail}</span></div></div>
          <div className={`workspace-content workspace-${workspace}`}>{activeContent}</div>
        </main>
        <AgentPanel workspace={workspace} lang={language} collapsed={isAICollapsed} onCollapse={() => setAIcollapsed((collapsed) => !collapsed)} />
      </div>
      <footer className="status-bar"><div><Signal tone={footerTone} /> {footerStatus}</div><div><span>{isAr ? "المشروع" : "Project"}: {footerProject}</span><span>{activityEntries.length} {isAr ? "أحداث" : "events"}</span><span><Bot size={12} /> {footerActiveTasks} {isAr ? "مهام نشطة" : "active tasks"}</span></div></footer>
      {commandOpen && <CommandPalette lang={language} onClose={() => setCommandOpen(false)} onNavigate={navigate} />}
      {helpOpen && <div className="workspace-help-overlay" role="presentation" onMouseDown={() => setHelpOpen(false)}><section className="workspace-help-panel glass-panel" role="dialog" aria-modal="true" aria-labelledby="workspace-help-title" onMouseDown={(event) => event.stopPropagation()}><header><div><span><CircleHelp size={17} /> {isAr ? "مركز المساعدة" : "Help center"}</span><strong id="workspace-help-title">{isAr ? "مساعدة مرتبطة بمساحة العمل" : "Workspace-connected help"}</strong></div><button type="button" onClick={() => setHelpOpen(false)} aria-label={isAr ? "إغلاق المساعدة" : "Close help"}><X size={17} /></button></header><p>{isAr ? "هذه اللوحة تقرأ حالة المحرك وبيانات مساحة العمل الحالية؛ لا تعرض إجراءات تجريبية." : "This panel reads live engine and workspace state; it does not present demo actions."}</p><div className="workspace-help-runtime"><Signal tone={opencodeStatusQuery.data?.health === "healthy" ? "green" : "amber"} /><div><strong>{isAr ? "حالة OpenCode" : "OpenCode status"}</strong><span>{runtimeDetail}</span></div></div><div className="workspace-help-engines" aria-label={isAr ? "حالات المحركات" : "Engine states"}>{helpEnginePhase === "loading" ? <span className="workspace-help-loading">{isAr ? "تُحمّل حالات المحركات…" : "Loading engine states…"}</span> : helpEnginePhase === "error" ? <span className="workspace-operation-error" role="alert">{isAr ? "تعذر تحميل حالات المحركات. أعد فتح المساعدة للمحاولة مجدداً." : "Engine states could not be loaded. Reopen help to try again."}</span> : helpEnginePhase === "empty" ? <span className="workspace-help-loading">{isAr ? "لا توجد حالات محركات متاحة حالياً." : "No engine states are available right now."}</span> : enginesStatusQuery.data?.engines.map((engine) => { const localized = localizeEngineHelp(engine.id, engine.status, isAr); const tone = engine.agentReady ? "green" : engine.status === "available" ? "cyan" : "amber"; return <div className="workspace-help-engine" key={engine.id}><Signal tone={tone} /><div><strong>{localized.name} · {localized.status}</strong><span>{localized.detail}</span></div></div>; })}</div><div className="workspace-help-shortcuts"><span><Command size={15} /> {isAr ? "Ctrl / ⌘ + K: لوحة الأوامر" : "Ctrl / ⌘ + K: command palette"}</span><span><Bot size={15} /> {isAr ? "لوحة الوكيل على الجانب المقابل للمساحة" : "The agent panel is on the opposite side of the workspace"}</span></div><div className="workspace-help-links">{navigation.filter((item) => item.key !== workspace).map((item) => <button type="button" key={item.key} onClick={() => navigate(item.key)}>{isAr ? `فتح ${item.label}` : `Open ${item.label}`}<ChevronRight size={15} /></button>)}</div></section></div>}
    </div>
  );
}
