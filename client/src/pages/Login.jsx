import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BookOpen, Bus, ClipboardCheck, ClipboardList, Crown, GraduationCap, Loader2, LockKeyhole, Phone, School, ShieldCheck, ShieldHalf, UserRound, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { homePath } from "../roles";
import { cancelTwoFactor, clearAuthError, login, verifyTwoFactor } from "../store/slices/authSlice";
import PasswordInput from "../components/PasswordInput";

const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_LOGINS === "true";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "";

const DEMO = [
  { label: "Parent", email: "parent@successacademy.ac.ke", icon: Users },
  { label: "Grade 4 teacher", email: "ann.njeri@successacademy.ac.ke", icon: GraduationCap },
  { label: "PP2 teacher", email: "faith.mwende@successacademy.ac.ke", icon: GraduationCap },
  { label: "School office", email: "admin@successacademy.ac.ke", icon: School },
  { label: "Director", email: "director@successacademy.ac.ke", icon: Crown },
  { label: "Exams officer", email: "exams@successacademy.ac.ke", icon: ClipboardList },
  { label: "Bursar", email: "bursar@successacademy.ac.ke", icon: Wallet },
  { label: "Bus driver", email: "driver@successacademy.ac.ke", icon: Bus },
  { label: "System owner", email: "owner@successacademy.ac.ke", icon: ShieldHalf },
];

const ALERTS = [
  { icon: Bus, tone: "bg-amber-100 text-amber-700", time: "7:12 AM", text: "Ethan was picked up at Chuna by the Kitengela Town Route bus." },
  { icon: ClipboardCheck, tone: "bg-emerald-100 text-emerald-700", time: "8:05 AM", text: "Ethan is at school. Marked present by Ms Njeri." },
  { icon: Wallet, tone: "bg-sky-100 text-sky-700", time: "11:40 AM", text: "KES 5,000 received for Ethan. Receipt RCP-2026-0461 is ready." },
  { icon: BookOpen, tone: "bg-rose-100 text-rose-700", time: "3:20 PM", text: "New homework for Grade 4: fractions practice, due Thursday." },
  { icon: GraduationCap, tone: "bg-violet-100 text-violet-700", time: "5:00 PM", text: "Mid-term results are out. Ethan's report card is ready to view." },
];

function useAlertFeed(count) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(count - 1);

  useEffect(() => {
    if (reduce) return undefined;
    const timer = setInterval(() => setTick((value) => value + 1), 3200);
    return () => clearInterval(timer);
  }, [reduce]);

  return Array.from({ length: count }, (_, offset) => {
    const index = tick - offset;
    return { key: index, ...ALERTS[((index % ALERTS.length) + ALERTS.length) % ALERTS.length] };
  });
}

function Alert({ alert, faded = false }) {
  const Icon = alert.icon;
  return (
    <div className={`flex gap-3 rounded-2xl bg-white p-3 shadow-[0_18px_40px_-14px_rgba(5,12,30,0.55)] ring-1 ring-white/60 ${faded ? "[&>*]:opacity-60" : ""}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${alert.tone}`}><Icon size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2 text-[11px] text-brand-400">
          <span className="font-semibold text-brand-800">Success Academy</span>
          <span>{alert.time}</span>
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-brand-700">{alert.text}</p>
      </div>
    </div>
  );
}

function AlertStack() {
  const feed = useAlertFeed(3);
  return (
    <div className="space-y-2.5" aria-hidden="true">
      <AnimatePresence initial={false} mode="popLayout">
        {feed.map((alert, position) => (
          <motion.div
            key={alert.key}
            layout
            initial={{ opacity: 0, y: -26, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 - position * 0.04 }}
            exit={{ opacity: 0, y: 18, scale: 0.92, transition: { duration: 0.25 } }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            style={{ transformOrigin: "top center" }}
          >
            <Alert alert={alert} faded={position > 0} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function MobileAlert() {
  const [alert] = useAlertFeed(1);
  return (
    <div className="relative h-[74px]" aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.div key={alert.key} className="absolute inset-x-0 top-0" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.4 }}>
          <Alert alert={alert} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BrandPanel() {
  const reduce = useReducedMotion();
  const settle = (delay, rotate) => ({
    initial: reduce ? false : { opacity: 0, y: 30, rotate: 0 },
    animate: { opacity: 1, y: 0, rotate },
    transition: { delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <aside className="relative overflow-hidden bg-brand-800 lg:sticky lg:top-0 lg:h-screen lg:w-[54%]">
      <div className="uniform-check absolute inset-0 opacity-[0.08]" />
      <div className="absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-brand-600/40 blur-3xl" />
      <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-gold-500/20 blur-3xl" />

      <div className="relative flex h-full flex-col px-5 pb-6 pt-5 sm:px-8 lg:p-12">
        <Link to="/" className="flex items-center gap-3 self-start rounded-full text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400">
          <img src="/logo.png" alt="Success Academy crest" className="h-11 w-11 rounded-full bg-white object-contain p-1 lg:h-12 lg:w-12" />
          <span className="leading-tight">
            <span className="block font-headline text-xl font-bold uppercase tracking-wide">Success Academy</span>
            <span className="block text-xs text-brand-200">Kitengela school portal</span>
          </span>
        </Link>

        <div className="relative mx-auto my-8 hidden w-full max-w-[520px] flex-1 lg:block">
          <motion.div {...settle(0.1, -4)} className="absolute left-0 top-[4%] h-[56%] w-[52%] overflow-hidden rounded-[1.75rem] border-[5px] border-white shadow-2xl">
            <img src="/photos/smiling-boys.jpg" alt="Smiling Success Academy learners" className="h-full w-full object-cover object-[40%_center]" />
          </motion.div>
          <motion.div {...settle(0.25, 3)} className="absolute bottom-[6%] left-[10%] h-[42%] w-[44%] overflow-hidden rounded-[1.75rem] border-[5px] border-white shadow-2xl">
            <img src="/photos/smiling-girls.jpg" alt="Learners in the school hall" className="h-full w-full object-cover object-[35%_center]" />
          </motion.div>
          <motion.div initial={reduce ? false : { opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="absolute right-0 top-[18%] w-[min(19rem,50%)]">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-900/70 px-3 py-1.5 text-xs font-medium text-brand-100 ring-1 ring-white/10 backdrop-blur">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
              What parents get on their phone today
            </p>
            <AlertStack />
          </motion.div>
        </div>

        <div className="mt-5 lg:hidden">
          <MobileAlert />
        </div>

        <div className="mt-5 lg:mt-0">
          <p className="font-headline text-base font-bold text-gold-400 lg:text-lg">#InPursuitOfExcellence</p>
          <p className="mt-1 max-w-lg font-headline text-4xl font-extrabold uppercase leading-[0.92] text-white sm:text-5xl lg:text-6xl">Welcome back to Success Academy</p>
        </div>
      </div>
    </aside>
  );
}

function Field({ id, label, icon: Icon, aside, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-semibold text-brand-800">{label}</label>
        {aside}
      </div>
      <div className="relative">
        <Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-brand-400" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

const FIELD = "input h-12 rounded-2xl border-brand-200 bg-white pl-11 shadow-sm shadow-brand-900/[0.03] focus:border-gold-500 focus:ring-4 focus:ring-gold-400/20";

function ErrorNote({ error }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.p
          key={error}
          role="alert"
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: 1, x: [0, -8, 8, -5, 5, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function Submit({ busy, disabled, idle, working }) {
  return (
    <button type="submit" disabled={busy || disabled} className="btn-primary group relative h-12 w-full overflow-hidden rounded-2xl text-base shadow-lg shadow-brand-900/20 transition hover:-translate-y-px hover:shadow-xl hover:shadow-brand-900/25 active:translate-y-0 disabled:translate-y-0">
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full motion-reduce:hidden" />
      {busy ? <><Loader2 size={18} className="animate-spin" /> {working}</> : idle}
    </button>
  );
}

export default function Login() {
  const dispatch = useDispatch();
  const reduce = useReducedMotion();
  const { user, status, error, twoFactor } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [code, setCode] = useState("");

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  if (user) {
    return <Navigate to={homePath(user.role)} replace />;
  }

  const busy = status === "loading";

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function handleSubmit(event) {
    event.preventDefault();
    dispatch(login(form));
  }

  function handleCode(event) {
    event.preventDefault();
    dispatch(verifyTwoFactor({ challenge: twoFactor.challenge, code }));
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream lg:flex-row">
      <BrandPanel />

      <main className="relative flex flex-1 flex-col">
        <div className="hero-grid absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
        <div className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:py-12">
          <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }} className="w-full max-w-[400px]">
            <Link to="/" className="inline-flex items-center gap-1.5 rounded-full text-sm font-semibold text-brand-500 transition hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500">
              <ArrowLeft size={15} /> Back to home
            </Link>

            <div className="mt-6 rounded-[1.75rem] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(12,26,54,0.35)] ring-1 ring-brand-100 sm:p-8">
              <AnimatePresence mode="wait" initial={false}>
                {twoFactor ? (
                  <motion.form key="code" onSubmit={handleCode} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }} className="space-y-5">
                    <div>
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><ShieldCheck size={24} /></span>
                      <h1 className="mt-4 font-headline text-4xl font-extrabold uppercase leading-none text-brand-800">Check your app</h1>
                      <p className="mt-2 text-sm leading-relaxed text-brand-500">Hello {twoFactor.name}. Enter the 6-digit code your authenticator app shows for Success Academy.</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-brand-800" htmlFor="code">6-digit code</label>
                      <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input h-14 rounded-2xl text-center font-mono text-2xl tracking-[0.5em] focus:border-gold-500 focus:ring-4 focus:ring-gold-400/20" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} autoFocus required />
                    </div>
                    <ErrorNote error={error} />
                    <Submit busy={busy} disabled={code.length !== 6} idle="Confirm" working="Checking…" />
                    <button type="button" className="w-full text-sm font-semibold text-brand-500 hover:text-brand-800" onClick={() => { setCode(""); dispatch(cancelTwoFactor()); }}>Use a different account</button>
                  </motion.form>
                ) : (
                  <motion.form key="login" onSubmit={handleSubmit} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.25 }} className="space-y-5">
                    <div>
                      <h1 className="font-headline text-4xl font-extrabold uppercase leading-none text-brand-800 sm:text-5xl">Sign in</h1>
                      <p className="mt-2 text-sm leading-relaxed text-brand-500">One sign-in for parents, teachers, the office and drivers. The portal opens your page for you.</p>
                    </div>
                    <Field id="email" label="Phone number or email" icon={UserRound}>
                      <input id="email" name="email" type="text" autoComplete="username" placeholder="0712 345 678" className={FIELD} value={form.email} onChange={handleChange} required />
                    </Field>
                    <Field id="password" label="Password" icon={LockKeyhole} aside={<Link to="/forgot-password" className="text-sm font-semibold text-gold-600 hover:text-brand-800">Forgot password?</Link>}>
                      <PasswordInput id="password" name="password" autoComplete="current-password" placeholder="Your password" className={FIELD} value={form.password} onChange={handleChange} required />
                    </Field>
                    <ErrorNote error={error} />
                    <Submit busy={busy} idle="Sign in" working="Signing in…" />
                  </motion.form>
                )}
              </AnimatePresence>

              {SHOW_DEMO && !twoFactor && (
                <div className="mt-6 border-t border-brand-100 pt-5">
                  <p className="text-sm font-semibold text-brand-800">Try a demo account</p>
                  <p className="text-xs text-brand-400">Tap one to fill in its email and password.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {DEMO.map(({ label, email, icon: Icon }) => (
                      <button key={email} type="button" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${form.email === email ? "bg-brand-800 text-white ring-brand-800" : "bg-brand-50 text-brand-700 ring-brand-100 hover:bg-white hover:ring-brand-300"}`} onClick={() => setForm({ email, password: DEMO_PASSWORD })}>
                        <Icon size={13} /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a href="tel:0748065956" className="mt-4 flex items-center gap-3 rounded-2xl bg-white/70 p-3.5 text-sm ring-1 ring-brand-100 transition hover:bg-white">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-600"><Phone size={16} /></span>
              <span className="text-brand-600">Parents sign in with the phone number the school has. No account yet? <span className="font-semibold text-brand-800">Call the office on 0748 065 956</span></span>
            </a>

            <p className="mt-5 text-center text-xs leading-relaxed text-brand-400">
              Sign-ins are recorded with the device and network used. By signing in you agree to the{" "}
              <Link to="/terms" className="underline hover:text-brand-700">Terms of use</Link> and <Link to="/privacy" className="underline hover:text-brand-700">Privacy policy</Link>.
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
