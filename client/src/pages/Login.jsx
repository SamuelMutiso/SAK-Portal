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
    <div className="flex min-h-screen items-center justify-center bg-brand-800 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-cream p-8 shadow-2xl">
        <Link to="/" className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="Success Academy logo" className="h-24 w-24 object-contain mix-blend-multiply" />
          <h1 className="mt-3 text-2xl font-bold text-brand-800">Welcome back</h1>
          <p className="text-sm text-brand-500">Sign in to the Success Academy portal</p>
        </Link>

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

        <div className="mt-8 border-t border-brand-100 pt-5">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand-400">Demo accounts</p>
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
  );
}
