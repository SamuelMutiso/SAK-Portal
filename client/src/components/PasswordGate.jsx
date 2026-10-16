import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api, { errorMessage } from "../api/client";
import { passwordProblem } from "../passwords";
import { logout, sessionRenewed } from "../store/slices/authSlice";

export default function PasswordGate() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [form, setForm] = useState({ current: "", next: "", again: "" });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const problem = passwordProblem(form.next) || (form.next !== form.again ? "The two new passwords do not match" : null);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/auth/change-password", { current_password: form.current, new_password: form.next });
      dispatch(sessionRenewed(data));
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="card space-y-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-100 text-gold-600"><KeyRound size={22} /></span>
        <div>
          <h1 className="text-xl font-semibold text-brand-800">Choose your own password, {user.full_name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-brand-500">You signed in with a temporary password from the school. Choose one only you know. Use at least 8 characters with letters and numbers.</p>
        </div>
        <div>
          <label className="label" htmlFor="current">Temporary password</label>
          <input id="current" type="password" autoComplete="current-password" className="input" value={form.current} onChange={(event) => setForm({ ...form, current: event.target.value })} required />
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
        <button className="btn-primary w-full py-3" disabled={saving}>{saving ? "Saving..." : "Save my password"}</button>
        <button type="button" className="w-full text-sm font-semibold text-brand-500 hover:underline" onClick={() => dispatch(logout())}>Sign out</button>
      </form>
    </div>
  );
}
