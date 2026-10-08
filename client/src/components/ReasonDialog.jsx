import { AlertTriangle } from "lucide-react";
import { useState } from "react";

const MIN = 5;

export default function ReasonDialog({ rows, subject, saving, onCancel, onConfirm }) {
  const [reasons, setReasons] = useState({});
  const [shared, setShared] = useState("");

  const filled = rows.map((row) => ({ ...row, reason: (reasons[row.id] ?? shared).trim() }));
  const ready = filled.every((row) => row.reason.length >= MIN);

  function confirm(event) {
    event.preventDefault();
    if (ready) onConfirm(Object.fromEntries(filled.map((row) => [row.id, row.reason])));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/50 p-4 sm:items-center" role="dialog" aria-modal="true">
      <form onSubmit={confirm} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle size={20} /></span>
          <div>
            <h2 className="text-lg font-semibold text-brand-800">Why are you changing {rows.length > 1 ? "these marks" : "this mark"}?</h2>
            <p className="mt-1 text-sm text-brand-500">{subject}. {rows.length > 1 ? "These marks were" : "This mark was"} already saved. The old mark, the new mark and your reason are kept and can be seen by the office and the director.</p>
          </div>
        </div>

        {rows.length > 1 && (
          <div className="mt-5">
            <label className="label" htmlFor="shared-reason">One reason for all of them</label>
            <input id="shared-reason" className="input" placeholder="e.g. Re-marked paper 2 after moderation" value={shared} onChange={(event) => setShared(event.target.value)} />
          </div>
        )}

        <ul className="mt-5 space-y-4">
          {filled.map((row) => (
            <li key={row.id}>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-semibold">{row.name}</span>
                <span className="font-mono text-brand-400 line-through">{row.before}</span>
                <span className="text-brand-300">→</span>
                <span className="font-mono font-semibold text-brand-800">{row.after}</span>
              </div>
              <input
                className="input mt-1.5"
                placeholder={rows.length > 1 ? "Own reason (optional if the one above fits)" : "e.g. Missed question 5 when adding up"}
                value={reasons[row.id] ?? ""}
                onChange={(event) => setReasons({ ...reasons, [row.id]: event.target.value })}
                autoFocus={rows.length === 1}
                aria-label={`Reason for ${row.name}`}
              />
            </li>
          ))}
        </ul>

        {!ready && <p className="mt-4 text-xs text-brand-400">Every changed mark needs a reason of at least {MIN} characters.</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" disabled={!ready || saving}>{saving ? "Saving..." : "Save with reason"}</button>
        </div>
      </form>
    </div>
  );
}
