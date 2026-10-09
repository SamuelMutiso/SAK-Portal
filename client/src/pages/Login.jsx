import { ArrowLeft, Bus, Crown, GraduationCap, School, ShieldHalf, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { homePath } from "../roles";
import { clearAuthError, login } from "../store/slices/authSlice";

const DEMO = [
  { label: "Parent", email: "parent@successacademy.ac.ke", icon: Users },
  { label: "Grade 4 teacher", email: "ann.njeri@successacademy.ac.ke", icon: GraduationCap },
  { label: "PP2 teacher", email: "faith.mwende@successacademy.ac.ke", icon: GraduationCap },
  { label: "School office", email: "admin@successacademy.ac.ke", icon: School },
  { label: "Director", email: "director@successacademy.ac.ke", icon: Crown },
  { label: "Bus driver", email: "driver@successacademy.ac.ke", icon: Bus },
  { label: "System owner", email: "owner@successacademy.ac.ke", icon: ShieldHalf },
];

export default function Login() {
  const dispatch = useDispatch();
  const { user, status, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: "", password: "" });

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
              <img src="/photos/choir.jpg" alt="Success Academy learners" className="h-full w-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 h-48 w-[56%] rotate-3 overflow-hidden rounded-[1.75rem] border-[5px] border-white shadow-2xl">
              <img src="/photos/swings.jpg" alt="Pre-primary learners at play" className="h-full w-full object-cover" />
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
          <p className="mt-2 text-sm text-brand-500">Parents, teachers, the office and drivers all sign in here. Your account already knows who you are, so the portal opens the right page for you.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="username" className="input" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" className="input" value={form.password} onChange={handleChange} required />
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" className="btn-primary w-full py-3" disabled={status === "loading"}>
              {status === "loading" ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-3 text-sm text-brand-500">Forgot your password? Call the school office on 0748 065 956.</p>

          <div className="mt-8 rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-semibold text-brand-700">Demo accounts</p>
            <p className="text-xs text-brand-400">Tap one to fill in its email and password.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO.map(({ label, email, icon: Icon }) => (
                <button key={email} type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setForm({ email, password: "Success@2026" })}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs text-brand-400">
            For security, sign-ins and changes on this portal are recorded with the device and network used. By signing in you agree to the{" "}
            <Link to="/terms" className="underline">Terms of use</Link> and <Link to="/privacy" className="underline">Privacy policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
