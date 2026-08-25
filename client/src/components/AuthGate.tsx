/**
 * Quiet Intelligence Observatory — local authentication gateway.
 * Uses Orbit Blue, restrained technical motion, and a two-pane command-console composition.
 */
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Moon, Orbit, RefreshCcw, ShieldCheck, Sparkles, Sun, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import "./auth-motion.css";

type Language = "ar" | "en";
type AuthMode = "login" | "register" | "recover-question" | "recover-answer" | "recover-reset";

const ORBIT_MARK = "/manus-storage/osamah-orbit-mark_bc7fec06.png";
const LOCAL_ACCOUNT_KEY_STORAGE = "osamah-local-account-key-v1";

function getLocalAccountKey() {
  const existing = window.localStorage.getItem(LOCAL_ACCOUNT_KEY_STORAGE);
  if (existing) return existing;
  const accountKey = crypto.randomUUID();
  window.localStorage.setItem(LOCAL_ACCOUNT_KEY_STORAGE, accountKey);
  return accountKey;
}

export default function AuthGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const [language, setLanguage] = useState<Language>("ar");
  const [mode, setMode] = useState<AuthMode>("register");
  const [showPassword, setShowPassword] = useState(false);
  const [accountKey] = useState(getLocalAccountKey);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [question, setQuestion] = useState("first-project");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [recoveryPrompt, setRecoveryPrompt] = useState("");
  const localRegister = trpc.auth.local.register.useMutation();
  const localLogin = trpc.auth.local.login.useMutation();
  const localRecoveryQuestion = trpc.auth.local.recoveryQuestion.useQuery(
    { accountKey },
    { enabled: false, retry: false },
  );
  const localResetPassword = trpc.auth.local.resetPassword.useMutation();

  const isAr = language === "ar";
  const directionArrow = isAr ? ArrowLeft : ArrowRight;
  const DirectionArrow = directionArrow;
  const questions = isAr
    ? [{ id: "first-project", label: "ما اسم أول مشروع عملت عليه؟" }, { id: "favorite-tool", label: "ما أداتك التقنية المفضلة؟" }, { id: "focus-city", label: "ما المدينة التي تحب العمل منها؟" }]
    : [{ id: "first-project", label: "What was the name of your first project?" }, { id: "favorite-tool", label: "What is your favorite technical tool?" }, { id: "focus-city", label: "Which city do you like to work from?" }];
  const content = isAr
    ? {
      brandLine: "نواة ذكاء واحدة · محطة عمل محمية", trust: "جلسة خادمية محمية", enter: "افتح مساحة السياق", welcome: "استأنف سياق العمل", welcomeDetail: "افتح مساحة الكود والعروض والمعرفة من هذه المحطة المحلية.", create: "ثبّت حماية مساحة العمل", createDetail: "اختر كلمة مرور وسؤال استرداد، ثم افتح مساحة السياق.", recover: "استعد مسار الوصول", recoverDetail: "تحقق من سؤال الأمان ثم حدّث الحماية قبل العودة إلى مساحة العمل.", reset: "ثبّت حماية جديدة", resetDetail: "تم التحقق من إجابة الاسترداد. حدّث كلمة المرور، ثم استأنف سياق العمل.", password: "كلمة المرور", confirm: "تأكيد كلمة المرور", question: "سؤال الاسترداد", answer: "إجابتك الخاصة", signIn: "فتح مساحة العمل", signUp: "تثبيت الحماية", forgot: "استعادة الوصول", haveAccount: "لديك حماية محلية بالفعل؟", noAccount: "لم تُنشئ حماية محلية بعد؟", useLogin: "فتح مساحة العمل", useRegister: "إنشاء حماية", back: "العودة لمسار الدخول", continue: "عرض سؤال الاسترداد", verify: "تحقق من الإجابة", update: "تحديث الحماية", localLine: "لا تُحفظ كلمة المرور أو الجلسة في المتصفح؛ تحميها جلسة خادمية موقعة. يُحفظ معرّف محلي غير سري لهذه المحطة فقط لتمييز الحساب.", privacy: "هوية خادمية محمية", encrypted: "جلسة HttpOnly موقعة", recovery: "استرداد محكوم", signal: "المسار محمي", passwordHint: "8 أحرف على الأقل", mismatch: "كلمتا المرور غير متطابقتين.", wrongLogin: "تحقق من كلمة المرور أو استخدم المتصفح الذي أنشأت فيه الحساب.", wrongAnswer: "إجابة الاسترداد غير مطابقة. حاول مرة أخرى.", accountMissing: "لا يوجد حساب محلي في هذا المتصفح. أنشئ حماية أولاً.", answerHint: "استخدم إجابة تتذكرها ولا يسهل تخمينها.", success: "تم تثبيت الحماية. جارٍ فتح مساحة العمل…", changed: "تم تحديث الحماية. جارٍ فتح مساحة العمل…", processing: "جارٍ التحقق…", theme: theme === "dark" ? "فاتح" : "داكن", language: "English"
    }
    : {
      brandLine: "ONE AI CORE · PROTECTED WORKSTATION", trust: "Protected server session", enter: "Open your context workspace", welcome: "Resume your work context", welcomeDetail: "Open code, presentations, and knowledge from this local workstation.", create: "Establish workspace protection", createDetail: "Choose a password and recovery question, then open the context workspace.", recover: "Restore your access path", recoverDetail: "Verify the recovery question, then update protection before returning to your workspace.", reset: "Set new protection", resetDetail: "Your recovery answer is verified. Update the password, then resume your work context.", password: "Password", confirm: "Confirm password", question: "Recovery question", answer: "Your private answer", signIn: "Open workspace", signUp: "Establish protection", forgot: "Restore access", haveAccount: "Already have local protection?", noAccount: "No local protection yet?", useLogin: "Open workspace", useRegister: "Create protection", back: "Back to access path", continue: "Show recovery question", verify: "Verify answer", update: "Update protection", localLine: "The browser does not retain the password or session; a signed HttpOnly server session protects access. A non-secret local identifier is retained only to identify this workstation account.", privacy: "Protected server identity", encrypted: "Signed HttpOnly session", recovery: "Governed recovery", signal: "Path secured", passwordHint: "At least 8 characters", mismatch: "The passwords do not match.", wrongLogin: "Check the password or use the browser where this account was created.", wrongAnswer: "The recovery answer does not match. Try again.", accountMissing: "No local account exists in this browser. Create protection first.", answerHint: "Use an answer that is memorable but difficult to guess.", success: "Your protection is established. Opening workspace…", changed: "Protection updated. Opening workspace…", processing: "Verifying…", theme: theme === "dark" ? "Light" : "Dark", language: "العربية"
    };

  const title = mode === "login" ? content.welcome : mode === "register" ? content.create : mode === "recover-reset" ? content.reset : content.recover;
  const detail = mode === "login" ? content.welcomeDetail : mode === "register" ? content.createDetail : mode === "recover-reset" ? content.resetDetail : content.recoverDetail;
  const actionLabel = mode === "login" ? content.signIn : mode === "register" ? content.signUp : mode === "recover-question" ? content.continue : mode === "recover-answer" ? content.verify : content.update;
  const identityReady = Boolean(accountKey);
  const securityReady = mode === "register"
    ? Boolean(answer.trim()) && password.length >= 8 && password === confirmPassword
    : mode === "login"
      ? Boolean(password)
      : mode === "recover-reset"
        ? password.length >= 8 && password === confirmPassword
        : Boolean(answer.trim());
  const provisionPhase = activeField
      ? "security"
      : !identityReady
        ? "identity"
        : !securityReady
          ? "security"
          : "workspace";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    document.body.classList.toggle("lang-ar", isAr);
  }, [isAr, language]);

  const clearFeedback = () => feedback && setFeedback(null);
  const completeAuthentication = (message: string) => {
    setFeedback({ type: "success", text: message });
    window.setTimeout(onAuthenticated, 700);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setSubmitting(true);
    try {
      if (mode === "register") {
        if (password.length < 8 || !answer.trim()) throw new Error(isAr ? "أكمل حقول الحماية واستخدم كلمة مرور من 8 أحرف على الأقل." : "Complete the protection fields and use a password of at least 8 characters.");
        if (password !== confirmPassword) throw new Error(content.mismatch);
        const selectedQuestion = questions.find((item) => item.id === question)?.label ?? question;
        await localRegister.mutateAsync({ accountKey, password, recoveryQuestion: selectedQuestion, recoveryAnswer: answer });
        completeAuthentication(content.success);
        return;
      }
      if (mode === "login") {
        await localLogin.mutateAsync({ accountKey, password });
        completeAuthentication(content.success);
        return;
      }
      if (mode === "recover-question") {
        const result = await localRecoveryQuestion.refetch();
        if (!result.data) throw new Error(content.accountMissing);
        setRecoveryPrompt(result.data.recoveryQuestion);
        setMode("recover-answer");
        return;
      }
      if (mode === "recover-answer") {
        setMode("recover-reset");
        return;
      }
      if (password.length < 8) throw new Error(content.passwordHint);
      if (password !== confirmPassword) throw new Error(content.mismatch);
      await localResetPassword.mutateAsync({ accountKey, recoveryAnswer: answer, newPassword: password });
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
      <div className="auth-brand"><img src={ORBIT_MARK} alt="" /><div><strong><em>O</em>SAMAH<span className="auth-brand-slash">/</span><em>I</em>DE</strong><small>{content.brandLine}</small></div></div>
      <div className="auth-top-actions"><button className="auth-utility" onClick={() => setLanguage(isAr ? "en" : "ar")}><Orbit size={14} /> {content.language}</button><button className="auth-utility" onClick={toggleTheme}>{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}{content.theme}</button></div>
    </motion.div>
    <section className="auth-stage">
      <motion.aside className="auth-visual" initial={{ opacity: 0, x: isAr ? 30 : -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65 }}>
        <div className="auth-signal"><span className="auth-live-dot" />{isAr ? "واجهة حساب محلية" : "Local account interface"}</div>
        <div className="auth-orbit-system" aria-hidden="true"><i className="orbit-ring ring-one" /><i className="orbit-ring ring-two" /><i className="orbit-ring ring-three" /><span className="orbit-satellite satellite-one" /><span className="orbit-satellite satellite-two" /><span className="orbit-core"><img src={ORBIT_MARK} alt="" /></span><b className="orbit-node node-a" /><b className="orbit-node node-b" /><b className="orbit-node node-c" /></div>
        <div className="auth-visual-copy"><span>{content.trust}</span><h1>{isAr ? "هيّئ مساحة العمل، ثم افتح السياق." : "Prepare the workspace. Then open context."}</h1><p>{isAr ? "مسار واحد للكود والعروض والمعرفة. ثبّت الهوية والحماية، ثم انتقل إلى مساحة العمل مع بقاء قرارك على هذا الجهاز." : "One path for code, presentations, and knowledge. Establish identity and protection, then enter the workspace while decisions remain on this device."}</p></div>
        <div className="auth-workstation-map" aria-label={isAr ? "مسارات مساحة العمل" : "Workspace tracks"}><span><b>01</b>{isAr ? "كود" : "Code"}</span><span><b>02</b>{isAr ? "معرفة" : "Knowledge"}</span><span><b>03</b>{isAr ? "وكيل" : "Agent"}</span></div>
        <div className="auth-trust-list"><div><ShieldCheck size={16} /><span>{content.privacy}</span></div><div><LockKeyhole size={16} /><span>{content.encrypted}</span></div><div><RefreshCcw size={16} /><span>{content.recovery}</span></div></div>
      </motion.aside>
      <motion.section className="auth-card" initial={{ opacity: 0, x: isAr ? -30 : 30, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.62, delay: 0.08 }}>
        <div className="auth-card-head"><div className="auth-step"><span>{mode === "register" ? "01" : mode.startsWith("recover") ? "02" : "00"}</span><i /></div><span className="auth-local-badge"><LockKeyhole size={11} /> {content.trust}</span></div>
        <div className="auth-context-rail"><span><i /> {isAr ? "الحساب: محلي ومحمي" : "ACCOUNT: LOCAL + PROTECTED"}</span><span><i /> {isAr ? "النموذج: ثلاث خطوات" : "FORM: THREE STEPS"}</span><span><i /> {isAr ? "الوجهة: مساحة العمل" : "DESTINATION: WORKSPACE"}</span></div>
        <div className={`auth-intelligence-track ${activeField ? "is-active" : ""}`} aria-hidden="true"><span className="auth-track-label">{isAr ? "مؤشر الواجهة" : "INTERFACE INDICATOR"}</span><div><i /><i /><i /><b /></div><span>{activeField ? (isAr ? "الحقل النشط مميز بصرياً" : "ACTIVE FIELD HIGHLIGHTED") : (isAr ? "حركة واجهة محلية" : "LOCAL INTERFACE MOTION")}</span></div>
          <div className={`auth-provision-path phase-${provisionPhase}`} aria-label={isAr ? "مسار تهيئة مساحة العمل" : "Workspace provisioning path"}>
            <span className="provision-connector" aria-hidden="true" />
          <div className={`provision-node provision-identity ${identityReady ? "is-complete" : ""}`}><i><UserRound size={11} /></i><b>{isAr ? "الهوية" : "Identity"}</b><small>{identityReady ? (isAr ? "بيانات مكتملة" : "Details complete") : (isAr ? "بانتظارك" : "Awaiting")}</small></div>
          <div className={`provision-node provision-security ${securityReady ? "is-complete" : ""}`}><i><ShieldCheck size={11} /></i><b>{isAr ? "الحماية" : "Security"}</b><small>{securityReady ? (isAr ? "خطوات مكتملة" : "Steps complete") : (isAr ? "أكمل الحقول" : "Complete fields")}</small></div>
          <div className={`provision-node provision-workspace ${provisionPhase === "workspace" ? "is-complete" : ""}`}><i><Orbit size={11} /></i><b>{isAr ? "المساحة" : "Workspace"}</b><small>{provisionPhase === "workspace" ? (isAr ? "افتح السياق" : "Open context") : (isAr ? "التالي" : "Next")}</small></div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={mode} {...fieldMotion} className="auth-card-copy"><span className="auth-eyebrow"><Sparkles size={13} /> {mode === "login" ? content.enter : content.trust}</span><h2>{title}</h2><p>{detail}</p></motion.div>
        </AnimatePresence>
        <form onSubmit={submit} className="auth-form" dir={isAr ? "rtl" : "ltr"} lang={isAr ? "ar" : "en"}>
          <AnimatePresence mode="popLayout">
            {mode === "register" && <motion.label {...fieldMotion} className="auth-field"><span>{content.question}</span><div><ShieldCheck size={15} /><select value={question} onFocus={() => setActiveField("recovery")} onBlur={() => setActiveField(null)} onChange={(event) => setQuestion(event.target.value)}>{questions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div></motion.label>}
            {(mode === "register" || mode === "recover-answer") && <motion.label {...fieldMotion} className="auth-field"><span>{mode === "recover-answer" ? recoveryPrompt || content.question : content.answer}</span><div><KeyRound size={15} /><input value={answer} onFocus={() => setActiveField("answer")} onBlur={() => setActiveField(null)} onChange={(event) => { setAnswer(event.target.value); clearFeedback(); }} autoComplete="off" required /></div><small>{content.answerHint}</small></motion.label>}
            {(mode === "login" || mode === "register" || mode === "recover-reset") && <motion.label {...fieldMotion} className="auth-field"><span>{content.password}</span><div><LockKeyhole size={15} /><input type={showPassword ? "text" : "password"} value={password} onFocus={() => setActiveField("password")} onBlur={() => setActiveField(null)} onChange={(event) => { setPassword(event.target.value); clearFeedback(); }} autoComplete={mode === "login" ? "current-password" : "new-password"} required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div><small>{mode === "login" ? "" : content.passwordHint}</small></motion.label>}
            {(mode === "register" || mode === "recover-reset") && <motion.label {...fieldMotion} className="auth-field"><span>{content.confirm}</span><div><CheckCircle2 size={15} /><input type={showPassword ? "text" : "password"} value={confirmPassword} onFocus={() => setActiveField("confirmation")} onBlur={() => setActiveField(null)} onChange={(event) => { setConfirmPassword(event.target.value); clearFeedback(); }} autoComplete="new-password" required /></div></motion.label>}
          </AnimatePresence>
          <AnimatePresence>{feedback && <motion.div className={`auth-feedback ${feedback.type}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}><span>{feedback.type === "success" ? <CheckCircle2 size={15} /> : <ShieldCheck size={15} />}</span>{feedback.text}</motion.div>}</AnimatePresence>
          <motion.button whileTap={{ scale: 0.975 }} whileHover={{ y: -1 }} className="auth-submit" disabled={submitting} type="submit">{submitting ? content.processing : actionLabel}<DirectionArrow size={16} /></motion.button>
        </form>
        <div className="auth-footer-actions">
          {mode === "login" && <><button onClick={() => { setMode("recover-question"); clearFeedback(); }}>{content.forgot}</button><span>{content.noAccount} <button onClick={() => { setMode("register"); clearFeedback(); }}>{content.useRegister}</button></span></>}
          {mode === "register" && <span>{content.haveAccount} <button onClick={() => { setMode("login"); clearFeedback(); }}>{content.useLogin}</button></span>}
          {mode.startsWith("recover") && <button onClick={() => { setMode("login"); setAnswer(""); clearFeedback(); }}><DirectionArrow size={13} /> {content.back}</button>}
        </div>
        <p className="auth-local-copy"><LockKeyhole size={12} />{content.localLine}</p>
      </motion.section>
    </section>
    <div className="auth-status"><span><i />{content.signal}</span><span>OSM // {new Date().getFullYear()}</span></div>
  </main>;
}
