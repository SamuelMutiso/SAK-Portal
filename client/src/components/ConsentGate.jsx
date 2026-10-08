import { FileSignature, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { consentAccepted, logout } from "../store/slices/authSlice";

const SUMMARY = {
  parent: [
    "Your name, phone and email, and the people you allow to pick up your child",
    "Your child's attendance, marks, CBC levels, report cards, clubs, bus times and fee balance",
    "Photos of your child's class work, only if you allow it below",
  ],
  teacher: ["Your name, phone, email and class", "The grades, attendance, comments and other records you enter"],
  admin: ["Your name, phone and email", "The changes you make to school records"],
  director: ["Your name, phone and email", "The school records you view"],
  driver: ["Your name, phone and route", "The boarding and drop-off times you record"],
};

export default function ConsentGate() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const isParent = user.role === "parent";
  const [form, setForm] = useState({ accept_terms: false, accept_privacy: false, child_data: false, photo_consent: false, signature: "" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const ready = form.accept_terms && form.accept_privacy && (!isParent || form.child_data) && form.signature.trim().length >= 3;

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/consent", form);
      dispatch(consentAccepted());
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  function Check({ name, children }) {
    return (
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
        <input type="checkbox" checked={form[name]} onChange={(event) => setForm({ ...form, [name]: event.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700" />
        <span>{children}</span>
      </label>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={handleSubmit} className="card space-y-5 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-gold-600"><ShieldCheck size={24} /></span>
          <div>
            <h1 className="font-headline text-3xl font-extrabold uppercase leading-none text-brand-800">Before you continue</h1>
            <p className="text-sm text-brand-500">Welcome, {user.full_name}. Please read and accept how the portal uses information.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-100 p-4 text-sm">
          <p className="font-semibold text-brand-800">What the school will hold</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-600">
            {(SUMMARY[user.role] || []).map((item) => <li key={item}>{item}</li>)}
            <li>For security: sign-in times, changes made, IP address, approximate location and device type</li>
          </ul>
          <p className="mt-3 text-brand-500">
            Read the full <Link to="/terms" target="_blank" className="font-semibold text-brand-700 underline">Terms of use</Link> and{" "}
            <Link to="/privacy" target="_blank" className="font-semibold text-brand-700 underline">Privacy policy</Link>.
          </p>
        </div>

        <div className="space-y-2">
          {Check({ name: "accept_terms", children: "I have read and accept the Terms of use." })}
          {Check({ name: "accept_privacy", children: "I have read the Privacy policy and consent to my information being processed as it describes." })}
          {isParent && Check({ name: "child_data", children: "As the parent or guardian, I consent to Success Academy processing my child's information as described in the Privacy policy." })}
          {isParent && Check({ name: "photo_consent", children: "Optional: I allow teachers to add photos of my child's class work to their portfolio." })}
        </div>

        <div>
          <label className="label" htmlFor="signature"><FileSignature size={13} className="mr-1 inline" /> Sign by typing your full name</label>
          <input id="signature" className="input font-display text-lg italic" placeholder={user.full_name} value={form.signature} onChange={(event) => setForm({ ...form, signature: event.target.value })} required />
          <p className="mt-1 text-xs text-brand-400">Your typed name, the date, your IP address and device are saved as a record of your agreement.</p>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button className="btn-primary flex-1 py-3" disabled={!ready || saving}>{saving ? "Saving..." : "I agree, continue"}</button>
          <button type="button" className="btn-ghost" onClick={() => dispatch(logout())}>Not now, sign out</button>
        </div>
      </form>
    </div>
  );
}
