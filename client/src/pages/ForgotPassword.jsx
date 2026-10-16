import { ArrowLeft, CheckCircle2, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { passwordProblem } from "../passwords";

export default function ForgotPassword() {
  const [step, setStep] = useState("ask");
  const [login, setLogin] = useState("");
  const [form, setForm] = useState({ code: "", next: "", again: "" });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function ask(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post("/auth/forgot", { login });
      setPreview(data.sms || null);
      setStep("code");
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy(false);
  }

  async function reset(event) {
    event.preventDefault();
    const problem = passwordProblem(form.next) || (form.next !== form.again ? "The two passwords do not match" : null);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/reset", { login, code: form.code, new_password: form.next });
      setStep("done");
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft size={15} /> Back to sign in</Link>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Success Academy crest" className="h-12 w-12 object-contain mix-blend-multiply" />
          <h1 className="font-headline text-4xl font-extrabold uppercase leading-none text-brand-800">Reset password</h1>
        </div>

        {step === "ask" && (
          <form onSubmit={ask} className="card space-y-4">
            <p className="text-sm text-brand-600">Enter the phone number or email on your account. We will send a 6-digit code by SMS to the phone number the school has for you.</p>
            <div>
              <label className="label" htmlFor="login">Phone number or email</label>
              <input id="login" className="input" placeholder="0712 345 678" value={login} onChange={(event) => setLogin(event.target.value)} required />
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="btn-primary w-full py-3" disabled={busy}>{busy ? "Sending..." : "Send me a code"}</button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={reset} className="card space-y-4">
            <p className="text-sm text-brand-600">If that account exists, a code is on its way. It works for 10 minutes.</p>
            {preview && (
              <div className="rounded-2xl border-2 border-brand-800 bg-white p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-400"><MessageSquareText size={13} /> Demo mode: the SMS that was sent</p>
                <p className="mt-1.5 rounded-xl bg-brand-50 p-2.5 text-sm text-brand-800">{preview.message}</p>
              </div>
            )}
            <div>
              <label className="label" htmlFor="code">6-digit code</label>
              <input id="code" inputMode="numeric" maxLength={6} className="input text-center font-mono text-2xl tracking-[0.5em]" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, "") })} required />
            </div>
            <div>
              <label className="label" htmlFor="next">New password</label>
              <input id="next" type="password" autoComplete="new-password" className="input" value={form.next} onChange={(event) => setForm({ ...form, next: event.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="again">New password again</label>
              <input id="again" type="password" autoComplete="new-password" className="input" value={form.again} onChange={(event) => setForm({ ...form, again: event.target.value })} required />
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="btn-primary w-full py-3" disabled={busy || form.code.length !== 6}>{busy ? "Saving..." : "Set new password"}</button>
            <button type="button" className="w-full text-sm font-semibold text-brand-500 hover:underline" onClick={() => setStep("ask")}>Send a new code</button>
          </form>
        )}

        {step === "done" && (
          <div className="card space-y-4 text-center">
            <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
            <p className="font-semibold text-brand-800">Your password has been changed.</p>
            <Link to="/login" className="btn-primary w-full py-3">Sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
