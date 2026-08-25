/**
 * Quiet Intelligence Observatory — local authentication gateway.
 * Uses Orbit Blue, restrained technical motion, and a two-pane command-console composition.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Moon, Orbit, RefreshCcw, ShieldCheck, Sparkles, Sun, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import "./auth-motion.css";

type Language = "ar" | "en";
type AuthMode = "login" | "register" | "recover-email" | "recover-answer" | "recover-reset";

type LocalAccount = {
  name: string;
  email: string;
  passwordHash: string;
  recoveryQuestion: string;
  recoveryAnswerHash: string;
  createdAt: string;
};

const ACCOUNT_KEY = "osamah.ide.local.account.v1";
const SESSION_KEY = "osamah.ide.local.session.v1";
const ORBIT_MARK = "/manus-storage/osamah-orbit-mark_bc7fec06.png";

function readAccount(): LocalAccount | null {
  try {
    const value = localStorage.getItem(ACCOUNT_KEY);
    return value ? (JSON.parse(value) as LocalAccount) : null;
  } catch {
    return null;
  }
}

async function hashValue(value: string) {
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value.trim().toLowerCase());
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return btoa(unescape(encodeURIComponent(value.trim().toLowerCase())));
}

export function hasLocalSession() {
  return Boolean(readAccount() && localStorage.getItem(SESSION_KEY) === "active");
}

export default function AuthGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const account = useMemo(() => readAccount(), []);
  const [language, setLanguage] = useState<Language>("ar");
  const [mode, setMode] = useState<AuthMode>(account ? "login" : "register");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(account?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [question, setQuestion] = useState("first-project");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  const isAr = language === "ar";
  const directionArrow = isAr ? ArrowLeft : ArrowRight;
  const DirectionArrow = directionArrow;
  const questions = isAr
    ? [{ id: "first-project", label: "ما اسم أول مشروع عملت عليه؟" }, { id: "favorite-tool", label: "ما أداتك التقنية المفضلة؟" }, { id: "focus-city", label: "ما المدينة التي تحب العمل منها؟" }]
    : [{ id: "first-project", label: "What was the name of your first project?" }, { id: "favorite-tool", label: "What is your favorite technical tool?" }, { id: "focus-city", label: "Which city do you like to work from?" }];
  const content = isAr
    ? {
      brandLine: "نواة ذكاء واحدة · مساحة عمل محلية", trust: "محلي على هذا الجهاز", enter: "الدخول إلى مساحة العمل", welcome: "مرحباً بعودتك", welcomeDetail: "سجّل الدخول لتستأنف السياق والمشاريع المتصلة.", create: "أنشئ هوية العمل", createDetail: "أنشئ حساباً محلياً لحماية مساحة العمل الخاصة بك.", recover: "استعادة الوصول", recoverDetail: "سنستخدم سؤال الأمان الذي ربطته بحسابك محلياً.", reset: "تعيين كلمة مرور جديدة", resetDetail: "تم التحقق من هويتك. اختر كلمة مرور قوية جديدة.", name: "الاسم الظاهر", email: "البريد الإلكتروني", password: "كلمة المرور", confirm: "تأكيد كلمة المرور", question: "سؤال الاسترداد", answer: "إجابتك الخاصة", signIn: "تسجيل الدخول", signUp: "إنشاء حساب محلي", forgot: "نسيت كلمة المرور؟", haveAccount: "لديك حساب محلي بالفعل؟", noAccount: "لا يوجد حساب بعد؟", useLogin: "تسجيل الدخول", useRegister: "إنشاء حساب", back: "العودة لتسجيل الدخول", continue: "متابعة", verify: "تحقق من الإجابة", update: "تحديث كلمة المرور", localLine: "لن يُرسل أي بريد أو كلمة مرور إلى خادم. تُحفظ بياناتك محلياً على هذا الجهاز فقط.", privacy: "خصوصية محلية أولاً", encrypted: "تحقق مشفّر محلياً", recovery: "استرداد بأسئلة الأمان", signal: "البوابة آمنة", passwordHint: "8 أحرف على الأقل", mismatch: "كلمتا المرور غير متطابقتين.", wrongLogin: "تحقق من البريد الإلكتروني أو كلمة المرور.", wrongAnswer: "إجابة الاسترداد غير مطابقة. حاول مرة أخرى.", emailMismatch: "هذا البريد لا يطابق الحساب المحلي على هذا الجهاز.", answerHint: "احتفظ بإجابة يسهل تذكرها ويصعب تخمينها.", success: "تم تجهيز هويتك المحلية. جارٍ فتح مساحة العمل…", changed: "تم تحديث كلمة المرور محلياً. جارٍ فتح مساحة العمل…", noSpace: "لا يوجد حساب محلي بعد. أنشئ حساباً أولاً.", processing: "جارٍ التحقق…", theme: theme === "dark" ? "فاتح" : "داكن", language: "English"
    }
    : {
      brandLine: "ONE AI CORE · LOCAL WORKSPACE", trust: "Local to this device", enter: "Enter workspace", welcome: "Welcome back", welcomeDetail: "Sign in to resume your connected context and projects.", create: "Create your work identity", createDetail: "Set up a local account to protect your private workspace.", recover: "Recover access", recoverDetail: "We’ll use the security question attached to your local account.", reset: "Set a new password", resetDetail: "Your identity is verified. Choose a strong new password.", name: "Display name", email: "Email address", password: "Password", confirm: "Confirm password", question: "Recovery question", answer: "Your private answer", signIn: "Sign in", signUp: "Create local account", forgot: "Forgot password?", haveAccount: "Already have a local account?", noAccount: "No account on this device yet?", useLogin: "Sign in", useRegister: "Create one", back: "Back to sign in", continue: "Continue", verify: "Verify answer", update: "Update password", localLine: "No email or password is sent to a server. Your account stays only on this device.", privacy: "Local-first privacy", encrypted: "Local encrypted verification", recovery: "Security-question recovery", signal: "Gateway secured", passwordHint: "At least 8 characters", mismatch: "The passwords do not match.", wrongLogin: "Check your email address or password.", wrongAnswer: "The recovery answer does not match. Try again.", emailMismatch: "That email does not match the local account on this device.", answerHint: "Use an answer that is memorable but difficult to guess.", success: "Your local identity is ready. Opening workspace…", changed: "Password updated locally. Opening workspace…", noSpace: "No local account exists yet. Create one first.", processing: "Verifying…", theme: theme === "dark" ? "Light" : "Dark", language: "العربية"
    };

  const title = mode === "login" ? content.welcome : mode === "register" ? content.create : mode === "recover-reset" ? content.reset : content.recover;
  const detail = mode === "login" ? content.welcomeDetail : mode === "register" ? content.createDetail : mode === "recover-reset" ? content.resetDetail : content.recoverDetail;
  const actionLabel = mode === "login" ? content.signIn : mode === "register" ? content.signUp : mode === "recover-email" ? content.continue : mode === "recover-answer" ? content.verify : content.update;
  const provisionPhase = activeField === "identity" || activeField === "email" ? "identity" : activeField ? "security" : "workspace";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    document.body.classList.toggle("lang-ar", isAr);
  }, [isAr, language]);

  const clearFeedback = () => feedback && setFeedback(null);
  const completeAuthentication = (message: string) => {
    localStorage.setItem(SESSION_KEY, "active");
    setFeedback({ type: "success", text: message });
    window.setTimeout(onAuthenticated, 700);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setSubmitting(true);
    try {
      if (mode === "register") {
        if (!name.trim() || !email.trim() || password.length < 8 || !answer.trim()) throw new Error(isAr ? "أكمل الحقول المطلوبة واستخدم كلمة مرور من 8 أحرف على الأقل." : "Complete the required fields and use a password of at least 8 characters.");
        if (password !== confirmPassword) throw new Error(content.mismatch);
        const localAccount: LocalAccount = { name: name.trim(), email: email.trim().toLowerCase(), passwordHash: await hashValue(password), recoveryQuestion: question, recoveryAnswerHash: await hashValue(answer), createdAt: new Date().toISOString() };
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(localAccount));
        completeAuthentication(content.success);
        return;
      }
      const current = readAccount();
      if (!current) throw new Error(content.noSpace);
      if (mode === "login") {
        if (current.email !== email.trim().toLowerCase() || current.passwordHash !== await hashValue(password)) throw new Error(content.wrongLogin);
        completeAuthentication(content.success);
        return;
      }
      if (mode === "recover-email") {
        if (current.email !== email.trim().toLowerCase()) throw new Error(content.emailMismatch);
        setMode("recover-answer");
        return;
      }
      if (mode === "recover-answer") {
        if (current.recoveryAnswerHash !== await hashValue(answer)) throw new Error(content.wrongAnswer);
        setMode("recover-reset");
        return;
      }
      if (password.length < 8) throw new Error(content.passwordHint);
      if (password !== confirmPassword) throw new Error(content.mismatch);
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ ...current, passwordHash: await hashValue(password) }));
      completeAuthentication(content.changed);
    } catch (error) {
      setFeedback({ type: "error", text: error instanceof Error ? error.message : content.wrongLogin });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldMotion = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.22 } };

  return <main className={`auth-shell ${activeField ? "is-field-active" : ""}`} dir={isAr ? "rtl" : "ltr"}>
    <div className="auth-grid" aria-hidden="true" />
    <motion.div className="auth-topbar" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
      <div className="auth-brand"><img src={ORBIT_MARK} alt="" /><div><strong><em>O</em>SAMAH<span>/</span><em>I</em>DE</strong><small>{content.brandLine}</small></div></div>
      <div className="auth-top-actions"><button className="auth-utility" onClick={() => setLanguage(isAr ? "en" : "ar")}><Orbit size={14} /> {content.language}</button><button className="auth-utility" onClick={toggleTheme}>{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}{content.theme}</button></div>
    </motion.div>
    <section className="auth-stage">
      <motion.aside className="auth-visual" initial={{ opacity: 0, x: isAr ? 30 : -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65 }}>
        <div className="auth-signal"><span className="auth-live-dot" />{content.signal}</div>
        <div className="auth-orbit-system" aria-hidden="true"><i className="orbit-ring ring-one" /><i className="orbit-ring ring-two" /><i className="orbit-ring ring-three" /><span className="orbit-satellite satellite-one" /><span className="orbit-satellite satellite-two" /><span className="orbit-core"><img src={ORBIT_MARK} alt="" /></span><b className="orbit-node node-a" /><b className="orbit-node node-b" /><b className="orbit-node node-c" /></div>
        <div className="auth-visual-copy"><span>{content.trust}</span><h1>{isAr ? "مساحة عملك، بإشارةٍ خاصة." : "Your work, on a private signal."}</h1><p>{isAr ? "بوابة محلية للكود والعروض وسياق المعرفة — تفتح مساحة العمل وتبقي قراراتك على هذا الجهاز." : "A local command gate for code, presentations, and knowledge context — opening your workspace while keeping decisions on this device."}</p></div>
        <div className="auth-trust-list"><div><ShieldCheck size={16} /><span>{content.privacy}</span></div><div><LockKeyhole size={16} /><span>{content.encrypted}</span></div><div><RefreshCcw size={16} /><span>{content.recovery}</span></div></div>
      </motion.aside>
      <motion.section className="auth-card" initial={{ opacity: 0, x: isAr ? -30 : 30, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.62, delay: 0.08 }}>
        <div className="auth-card-head"><div className="auth-step"><span>{mode === "register" ? "01" : mode.startsWith("recover") ? "02" : "00"}</span><i /></div><span className="auth-local-badge"><LockKeyhole size={11} /> {content.trust}</span></div>
        <div className="auth-context-rail"><span><i /> {isAr ? "السياق: محلي ومحمٍ" : "CONTEXT: LOCAL + PROTECTED"}</span><span><i /> {isAr ? "المحطات: 03 جاهزة" : "NODES: 03 READY"}</span><span><i /> {isAr ? "المسار: مساحة العمل" : "ROUTE: WORKSPACE"}</span></div>
        <div className={`auth-intelligence-track ${activeField ? "is-active" : ""}`} aria-hidden="true"><span className="auth-track-label">{isAr ? "إشارة التكيّف" : "ADAPTIVE SIGNAL"}</span><div><i /><i /><i /><b /></div><span>{activeField ? (isAr ? "يتابع الحقل النشط" : "TRACKING ACTIVE FIELD") : (isAr ? "يراقب الحقول النشطة" : "WATCHING ACTIVE FIELDS")}</span></div>
        <div className={`auth-provision-path phase-${provisionPhase}`} aria-label={isAr ? "مسار تهيئة مساحة العمل" : "Workspace provisioning path"}>
          <span className="provision-connector" aria-hidden="true" />
          <div className="provision-node provision-identity"><i><UserRound size={11} /></i><b>{isAr ? "الهوية" : "Identity"}</b><small>{isAr ? "محلي" : "Local"}</small></div>
          <div className="provision-node provision-security"><i><ShieldCheck size={11} /></i><b>{isAr ? "الحماية" : "Security"}</b><small>{isAr ? "مشفّر" : "Encrypted"}</small></div>
          <div className="provision-node provision-workspace"><i><Orbit size={11} /></i><b>{isAr ? "المساحة" : "Workspace"}</b><small>{isAr ? "جاهزة" : "Ready"}</small></div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={mode} {...fieldMotion} className="auth-card-copy"><span className="auth-eyebrow"><Sparkles size={13} /> {mode === "login" ? content.enter : content.trust}</span><h2>{title}</h2><p>{detail}</p></motion.div>
        </AnimatePresence>
        <form onSubmit={submit} className="auth-form" dir={isAr ? "rtl" : "ltr"} lang={isAr ? "ar" : "en"}>
          <AnimatePresence mode="popLayout">
            {mode === "register" && <motion.label {...fieldMotion} className="auth-field"><span>{content.name}</span><div><UserRound size={15} /><input value={name} onFocus={() => setActiveField("identity")} onBlur={() => setActiveField(null)} onChange={(event) => { setName(event.target.value); clearFeedback(); }} autoComplete="name" required /></div></motion.label>}
            {(mode === "login" || mode === "register" || mode === "recover-email") && <motion.label {...fieldMotion} className="auth-field"><span>{content.email}</span><div><Orbit size={15} /><input type="email" value={email} onFocus={() => setActiveField("email")} onBlur={() => setActiveField(null)} onChange={(event) => { setEmail(event.target.value); clearFeedback(); }} autoComplete="email" required /></div></motion.label>}
            {mode === "register" && <motion.label {...fieldMotion} className="auth-field"><span>{content.question}</span><div><ShieldCheck size={15} /><select value={question} onFocus={() => setActiveField("recovery")} onBlur={() => setActiveField(null)} onChange={(event) => setQuestion(event.target.value)}>{questions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div></motion.label>}
            {(mode === "register" || mode === "recover-answer") && <motion.label {...fieldMotion} className="auth-field"><span>{mode === "recover-answer" ? questions.find((item) => item.id === readAccount()?.recoveryQuestion)?.label ?? content.question : content.answer}</span><div><KeyRound size={15} /><input value={answer} onFocus={() => setActiveField("answer")} onBlur={() => setActiveField(null)} onChange={(event) => { setAnswer(event.target.value); clearFeedback(); }} autoComplete="off" required /></div><small>{content.answerHint}</small></motion.label>}
            {(mode === "login" || mode === "register" || mode === "recover-reset") && <motion.label {...fieldMotion} className="auth-field"><span>{content.password}</span><div><LockKeyhole size={15} /><input type={showPassword ? "text" : "password"} value={password} onFocus={() => setActiveField("password")} onBlur={() => setActiveField(null)} onChange={(event) => { setPassword(event.target.value); clearFeedback(); }} autoComplete={mode === "login" ? "current-password" : "new-password"} required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div><small>{mode === "login" ? "" : content.passwordHint}</small></motion.label>}
            {(mode === "register" || mode === "recover-reset") && <motion.label {...fieldMotion} className="auth-field"><span>{content.confirm}</span><div><CheckCircle2 size={15} /><input type={showPassword ? "text" : "password"} value={confirmPassword} onFocus={() => setActiveField("confirmation")} onBlur={() => setActiveField(null)} onChange={(event) => { setConfirmPassword(event.target.value); clearFeedback(); }} autoComplete="new-password" required /></div></motion.label>}
          </AnimatePresence>
          <AnimatePresence>{feedback && <motion.div className={`auth-feedback ${feedback.type}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}><span>{feedback.type === "success" ? <CheckCircle2 size={15} /> : <ShieldCheck size={15} />}</span>{feedback.text}</motion.div>}</AnimatePresence>
          <motion.button whileTap={{ scale: 0.975 }} whileHover={{ y: -1 }} className="auth-submit" disabled={submitting} type="submit">{submitting ? content.processing : actionLabel}<DirectionArrow size={16} /></motion.button>
        </form>
        <div className="auth-footer-actions">
          {mode === "login" && <><button onClick={() => { setMode("recover-email"); clearFeedback(); }}>{content.forgot}</button><span>{content.noAccount} <button onClick={() => { setMode("register"); clearFeedback(); }}>{content.useRegister}</button></span></>}
          {mode === "register" && <span>{content.haveAccount} <button onClick={() => { setMode("login"); clearFeedback(); }}>{content.useLogin}</button></span>}
          {mode.startsWith("recover") && <button onClick={() => { setMode("login"); setAnswer(""); clearFeedback(); }}><DirectionArrow size={13} /> {content.back}</button>}
        </div>
        <p className="auth-local-copy"><LockKeyhole size={12} />{content.localLine}</p>
      </motion.section>
    </section>
    <div className="auth-status"><span><i />{content.signal}</span><span>OSM // {new Date().getFullYear()}</span></div>
  </main>;
}
