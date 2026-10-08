import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate } from "react-router-dom";
import { login } from "../store/slices/authSlice";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@successacademy.ac.ke" },
  { label: "Teacher", email: "ann.njeri@successacademy.ac.ke" },
  { label: "Parent", email: "parent@successacademy.ac.ke" },
];

export default function Login() {
  const dispatch = useDispatch();
  const { user, status, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: "", password: "" });

  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
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
      <div className="relative h-56 shrink-0 overflow-hidden sm:h-72 lg:h-auto lg:w-[55%]">
        <img src="/photos/play-time.jpg" alt="Pre-primary learners at Success Academy" className="absolute inset-0 h-full w-full object-cover" />
        <div className="photo-overlay absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-6 lg:p-12">
          <Link to="/" className="flex items-center gap-3 text-white">
            <img src="/logo.png" alt="Success Academy crest" className="h-12 w-12 rounded-full bg-white object-contain p-1" />
            <span className="font-headline text-xl font-bold uppercase tracking-wide">Success Academy</span>
          </Link>
          <div className="hidden lg:block">
            <p className="font-headline text-xl font-bold text-gold-400">#InPursuitOfExcellence</p>
            <p className="mt-2 max-w-md font-headline text-6xl font-extrabold uppercase leading-[0.95] text-white">
              Welcome to the parent portal
            </p>
          </div>
        </div>
        <div className="uniform-check absolute inset-x-0 bottom-0 h-3" />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <h1 className="font-headline text-4xl font-extrabold uppercase text-brand-800">Sign in</h1>
          <p className="mt-1 text-sm text-brand-500">Use the email and password the school office gave you.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="input" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" className="input" value={form.password} onChange={handleChange} required />
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" className="btn-primary w-full py-3" disabled={status === "loading"}>
              {status === "loading" ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-10 rounded-2xl bg-brand-50 p-4">
            <p className="text-sm font-semibold text-brand-700">Try a demo account</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.label}
                  type="button"
                  className="btn-ghost px-2"
                  onClick={() => setForm({ email: account.email, password: "Success@2026" })}
                >
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
