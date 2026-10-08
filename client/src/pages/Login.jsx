import { ArrowLeft, Bus, ChevronRight, Crown, GraduationCap, KeyRound, School, ShieldHalf, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { homePath } from "../roles";
import { clearAuthError, login } from "../store/slices/authSlice";

const DOORS = [
  { key: "parent", title: "Parent or guardian", text: "Report cards, fees, the bus and notices for your children", icon: Users, demo: [["Mary Mutiso", "parent@successacademy.ac.ke"]] },
  { key: "teacher", title: "Teacher", text: "Register, grades, report cards, homework and your class", icon: GraduationCap, demo: [["Grade 4 teacher", "ann.njeri@successacademy.ac.ke"], ["PP2 teacher", "faith.mwende@successacademy.ac.ke"]] },
  { key: "admin", title: "School office", text: "Head teacher and secretary: notices, fees, timetables and records", icon: School, demo: [["School admin", "admin@successacademy.ac.ke"]] },
  { key: "director", title: "Director", text: "The whole school at a glance: performance, clubs and people", icon: Crown, demo: [["School director", "director@successacademy.ac.ke"]] },
  { key: "driver", title: "Bus driver", text: "Mark learners on and off the bus", icon: Bus, demo: [["Kitengela Town bus", "driver@successacademy.ac.ke"]] },
];

const OWNER = { key: "superadmin", title: "System owner", text: "Security, audit trail and accounts", icon: ShieldHalf, demo: [["System owner", "owner@successacademy.ac.ke"]] };

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { role } = useParams();
  const { user, status, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: "", password: "" });
  const door = role === "owner" ? OWNER : DOORS.find((item) => item.key === role);

  useEffect(() => {
    dispatch(clearAuthError());
    setForm({ email: "", password: "" });
  }, [dispatch, role]);

  if (user) {
    return <Navigate to={homePath(user.role)} replace />;
  }

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function handleSubmit(event) {
    event.preventDefault();
    dispatch(login({ ...form, role: door.key }));
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
        {!door ? (
          <div className="w-full max-w-md">
            <h1 className="font-headline text-4xl font-extrabold uppercase text-brand-800">Sign in</h1>
            <p className="mt-1 text-sm text-brand-500">Who are you signing in as?</p>
            <ul className="mt-6 space-y-2.5">
              {DOORS.map(({ key, title, text, icon: Icon }) => (
                <li key={key}>
                  <button
                    onClick={() => navigate(`/login/${key}`)}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-brand-100 bg-white p-4 text-left transition hover:border-brand-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition group-hover:bg-gold-400 group-hover:text-brand-900"><Icon size={20} /></span>
                    <span className="flex-1">
                      <span className="block font-semibold text-brand-800">{title}</span>
                      <span className="block text-sm text-brand-500">{text}</span>
                    </span>
                    <ChevronRight size={18} className="text-brand-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-brand-400">
              <Link to="/" className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"><ArrowLeft size={14} /> Back to home</Link>
              <Link to="/login/owner" className="inline-flex items-center gap-1 hover:text-brand-600"><KeyRound size={12} /> System owner</Link>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <button onClick={() => navigate("/login")} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
              <ArrowLeft size={15} /> Choose a different role
            </button>
            <div className="mt-5 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-400 text-brand-900"><door.icon size={22} /></span>
              <div>
                <p className="text-sm text-brand-500">Signing in as</p>
                <h1 className="font-headline text-3xl font-extrabold uppercase leading-none text-brand-800">{door.title}</h1>
              </div>
            </div>

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
              <p className="text-sm font-semibold text-brand-700">Demo account</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {door.demo.map(([label, email]) => (
                  <button key={email} type="button" className="btn-ghost px-3" onClick={() => setForm({ email, password: "Success@2026" })}>{label}</button>
                ))}
              </div>
            </div>

            <p className="mt-4 text-xs text-brand-400">
              For security, sign-ins and changes on this portal are recorded with the device and network used. By signing in you agree to the{" "}
              <Link to="/terms" className="underline">Terms of use</Link> and <Link to="/privacy" className="underline">Privacy policy</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
