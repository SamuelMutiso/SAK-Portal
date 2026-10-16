import { ArrowLeft, Bus, ClipboardList, Crown, GraduationCap, School, ShieldCheck, ShieldHalf, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { homePath } from "../roles";
import { cancelTwoFactor, clearAuthError, login, verifyTwoFactor } from "../store/slices/authSlice";

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

export default function Login() {
  const dispatch = useDispatch();
  const { user, status, error, twoFactor } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [code, setCode] = useState("");

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  if (user) {
    return <Navigate to={homePath(user.role)} replace />;
  }

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
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <div className="relative overflow-hidden bg-brand-800 lg:w-[52%]">
        <div className="uniform-check absolute inset-0 opacity-[0.1]" />
        <div className="relative flex h-full flex-col p-6 lg:p-12">
          <Link to="/" className="flex items-center gap-3 text-white">
            <img src="/logo.png" alt="Success Academy crest" className="h-12 w-12 rounded-full bg-white object-contain p-1" />
            <span className="font-headline text-xl font-bold uppercase tracking-wide">Success Academy</span>
          </Link>

          <div className="relative mx-auto my-10 hidden h-[340px] w-full max-w-md lg:block">
            <div className="absolute left-0 top-0 h-56 w-[64%] -rotate-3 overflow-hidden rounded-[1.75rem] border-[5px] border-white shadow-2xl">
              <img src="/photos/smiling-boys.jpg" alt="Smiling Success Academy learners" className="h-full w-full object-cover object-[40%_center]" />
            </div>
            <div className="absolute bottom-0 right-0 h-48 w-[56%] rotate-3 overflow-hidden rounded-[1.75rem] border-[5px] border-white shadow-2xl">
              <img src="/photos/smiling-girls.jpg" alt="Learners in the school hall" className="h-full w-full object-cover object-[35%_center]" />
            </div>
            <div className="absolute bottom-10 left-4 w-56 rounded-2xl bg-white p-3.5 shadow-xl">
              <p className="text-[11px] font-semibold text-brand-400">SMS · SUCCESSACAD</p>
              <p className="mt-1 text-xs leading-snug text-brand-800">Mid-Term results are out. View Ethan&apos;s report card on the parent portal.</p>
            </div>
          </div>

          <div className="mt-6 lg:mt-auto">
            <p className="font-headline text-lg font-bold text-gold-400">#InPursuitOfExcellence</p>
            <p className="mt-1 max-w-md font-headline text-4xl font-extrabold uppercase leading-[0.95] text-white lg:text-6xl">
              Welcome back to Success Academy
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft size={15} /> Back to home</Link>
          <h1 className="mt-6 font-headline text-5xl font-extrabold uppercase leading-none text-brand-800">Sign in to portal</h1>
          <p className="mt-2 text-sm text-brand-500">Parents, teachers, the office, the bursar, the exams officer and drivers all sign in here. Your account already knows who you are, so the portal opens the right page for you.</p>

          {twoFactor ? (
            <form onSubmit={handleCode} className="mt-8 space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
                <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" />
                <p className="text-sm text-brand-700">Hello {twoFactor.name}. Open your authenticator app and enter the 6-digit code for Success Academy.</p>
              </div>
              <div>
                <label className="label" htmlFor="code">6-digit code</label>
                <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input text-center font-mono text-2xl tracking-[0.5em]" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} autoFocus required />
              </div>
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button type="submit" className="btn-primary w-full py-3" disabled={status === "loading" || code.length !== 6}>
                {status === "loading" ? "Checking..." : "Confirm"}
              </button>
              <button type="button" className="w-full text-sm font-semibold text-brand-500 hover:underline" onClick={() => { setCode(""); dispatch(cancelTwoFactor()); }}>Start again</button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">Phone number or email</label>
              <input id="email" name="email" type="text" autoComplete="username" placeholder="0712 345 678" className="input" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label className="label" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:underline">Forgot password?</Link>
              </div>
              <input id="password" name="password" type="password" autoComplete="current-password" className="input" value={form.password} onChange={handleChange} required />
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" className="btn-primary w-full py-3" disabled={status === "loading"}>
              {status === "loading" ? "Signing in..." : "Sign in"}
            </button>
          </form>
          )}

          <p className="mt-3 text-sm text-brand-500">Parents sign in with the phone number the school has. No account yet? Call the school office on 0748 065 956.</p>

          {SHOW_DEMO && !twoFactor && <div className="mt-8 rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-semibold text-brand-700">Demo accounts</p>
            <p className="text-xs text-brand-400">Tap one to fill in its email and password.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO.map(({ label, email, icon: Icon }) => (
                <button key={email} type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setForm({ email, password: DEMO_PASSWORD })}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>}

          <p className="mt-4 text-xs text-brand-400">
            For security, sign-ins and changes on this portal are recorded with the device and network used. By signing in you agree to the{" "}
            <Link to="/terms" className="underline">Terms of use</Link> and <Link to="/privacy" className="underline">Privacy policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
