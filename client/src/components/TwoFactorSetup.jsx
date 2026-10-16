import { Copy, ShieldCheck, Smartphone } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api, { errorMessage } from "../api/client";
import { logout, sessionRenewed } from "../store/slices/authSlice";

export default function TwoFactorSetup({ required = false }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setMessage(null);
    try {
      setSetup((await api.post("/auth/2fa/setup")).data);
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
    setBusy(false);
  }

  async function enable(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/2fa/enable", { code });
      dispatch(sessionRenewed(data));
      setSetup(null);
      setCode("");
      setMessage({ type: "success", text: "Two-step sign-in is on. You will need your phone each time you sign in." });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
    setBusy(false);
  }

  async function disable(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/2fa/disable", { password, code });
      dispatch(sessionRenewed(data));
      setPassword("");
      setCode("");
      setMessage({ type: "success", text: "Two-step sign-in is off." });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
    setBusy(false);
  }

  const key = setup ? setup.secret.match(/.{1,4}/g).join(" ") : "";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="card space-y-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><ShieldCheck size={22} /></span>
        <h1 className="text-xl font-semibold text-brand-800">{required ? `Set up two-step sign-in, ${user.full_name.split(" ")[0]}` : "Two-step sign-in"}</h1>
        <p className="text-sm text-brand-500">
          {required
            ? "Your role can see fees and learners' records, so the school requires a second step when you sign in: a 6-digit code from an app on your phone."
            : "Protect your account with a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator or Authy). Even if someone learns your password, they cannot sign in without your phone."}
        </p>
        {user.two_factor_enabled && !setup && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Two-step sign-in is on for this account.</p>}
        {!user.two_factor_enabled && !setup && (
          <button className="btn-primary" onClick={start} disabled={busy}><Smartphone size={16} /> Set it up</button>
        )}
      </div>

      {setup && (
        <form onSubmit={enable} className="card space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-brand-700">
            <li>Install an authenticator app on your phone.</li>
            <li>In the app, choose <strong>Add account</strong>, then <strong>Enter a setup key</strong>. Or, on this phone, tap the button below.</li>
            <li>Type the 6-digit code the app shows.</li>
          </ol>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-brand-50 px-4 py-3">
            <div>
              <p className="text-xs text-brand-400">Setup key · account {user.email}</p>
              <p className="break-all font-mono text-lg font-semibold tracking-wide text-brand-800">{key}</p>
            </div>
            <button type="button" className="rounded-lg p-2 text-brand-600 hover:bg-white" aria-label="Copy setup key" onClick={() => navigator.clipboard?.writeText(setup.secret)}><Copy size={16} /></button>
          </div>
          <a href={setup.link} className="btn-ghost w-full justify-center text-sm">Open in authenticator app</a>
          <div>
            <label className="label" htmlFor="totp-code">Code from the app</label>
            <input id="totp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input text-center font-mono text-2xl tracking-[0.5em]" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required />
          </div>
          <button className="btn-primary w-full" disabled={busy || code.length !== 6}>Turn on two-step sign-in</button>
        </form>
      )}

      {user.two_factor_enabled && !required && (
        <form onSubmit={disable} className="card space-y-3">
          <p className="text-sm font-semibold text-brand-700">Turn it off</p>
          <input type="password" className="input" placeholder="Your password" aria-label="Your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <input inputMode="numeric" maxLength={6} className="input font-mono" placeholder="Code from the app" aria-label="Code from the app" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required />
          <button className="btn-ghost" disabled={busy}>Turn off</button>
        </form>
      )}

      {message && <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
      {required && <button className="w-full text-sm font-semibold text-brand-500 hover:underline" onClick={() => dispatch(logout())}>Sign out</button>}
    </div>
  );
}
