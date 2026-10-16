import { format } from "date-fns";
import { ArrowRight, CalendarCheck, ChevronDown, GraduationCap, Repeat } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";

function TermRow({ term, readOnly, onSaved, onCurrent }) {
  const [form, setForm] = useState({ start_date: term.start_date || "", end_date: term.end_date || "", fee_due_date: term.fee_due_date || "" });
  const [message, setMessage] = useState(null);
  const changed = form.start_date !== (term.start_date || "") || form.end_date !== (term.end_date || "") || form.fee_due_date !== (term.fee_due_date || "");

  async function save() {
    try {
      const { data } = await api.patch(`/school-year/terms/${term.id}`, {
        start_date: form.start_date || null, end_date: form.end_date || null, fee_due_date: form.fee_due_date || null,
      });
      onSaved(data);
      setMessage(null);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }

  return (
    <div className={`grid items-end gap-3 rounded-2xl p-4 sm:grid-cols-[8rem_1fr_1fr_1fr_auto] ${term.is_current ? "bg-gold-100 ring-1 ring-gold-400" : "bg-brand-50"}`}>
      <div>
        <p className="font-semibold text-brand-800">Term {term.number}</p>
        {term.is_current && <p className="flex items-center gap-1 text-xs font-semibold text-gold-600"><CalendarCheck size={13} /> Current term</p>}
      </div>
      {[["start_date", "Opens"], ["end_date", "Closes"], ["fee_due_date", "Fees due"]].map(([field, label]) => (
        <div key={field}>
          <label className="label">{label}</label>
          <input type="date" className="input" value={form[field]} disabled={readOnly} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
        </div>
      ))}
      {!readOnly && (
        <div className="flex gap-2">
          {changed && <button className="btn-primary px-3" onClick={save}>Save</button>}
          {!term.is_current && !changed && <button className="btn-ghost px-3" onClick={() => onCurrent(term)}>Make current</button>}
        </div>
      )}
      {message && <p className="text-sm text-red-700 sm:col-span-5">{message}</p>}
    </div>
  );
}

export default function SchoolYear() {
  const user = useSelector((state) => state.auth.user);
  const readOnly = user.role !== "admin";
  const [terms, setTerms] = useState(null);
  const [year, setYear] = useState(null);
  const [preview, setPreview] = useState(null);
  const [holdBack, setHoldBack] = useState([]);
  const [open, setOpen] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [startNext, setStartNext] = useState(true);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function loadTerms() {
    api.get("/school-year/terms").then(({ data }) => {
      setTerms(data.terms);
      setYear(data.current_year);
    });
  }

  function loadPreview(fromYear) {
    api.get("/school-year/promotion", { params: { from_year: fromYear } }).then(({ data }) => setPreview(data));
  }

  useEffect(loadTerms, []);
  useEffect(() => {
    if (year) loadPreview(year);
  }, [year]);

  async function makeCurrent(term) {
    await api.post(`/school-year/terms/${term.id}/current`);
    loadTerms();
  }

  async function promote() {
    try {
      const { data } = await api.post("/school-year/promotion", { from_year: preview.from_year, hold_back: holdBack, start_next_year: startNext });
      setResult(data);
      setConfirm(false);
      setHoldBack([]);
      setTyped("");
      setError(null);
      loadTerms();
      loadPreview(preview.from_year);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!terms || !preview) return <Loader />;

  const years = [...new Set(terms.map((term) => term.year))];
  const totalLearners = preview.rows.reduce((sum, row) => sum + row.learners.length, 0);
  const completing = preview.rows.filter((row) => row.completes).reduce((sum, row) => sum + row.learners.filter((item) => !holdBack.includes(item.id)).length, 0);
  const promoting = totalLearners - completing - holdBack.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">School year</h1>
        <p className="mt-2 max-w-2xl text-brand-500">Set the term dates and the current term, and move every class up at the end of the year. Marks, attendance, fees and report cards all follow the current term.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-brand-800">Terms</h2>
        {years.map((item) => (
          <div key={item} className="card space-y-3">
            <h3 className="font-headline text-2xl font-extrabold uppercase text-brand-800">{item}</h3>
            {terms.filter((term) => term.year === item).map((term) => (
              <TermRow
                key={`${term.id}-${term.start_date}-${term.end_date}-${term.fee_due_date}-${term.is_current}`}
                term={term}
                readOnly={readOnly}
                onSaved={(saved) => setTerms(terms.map((entry) => (entry.id === saved.id ? saved : entry)))}
                onCurrent={makeCurrent}
              />
            ))}
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-brand-800">End of year: move classes up</h2>
          <p className="text-sm text-brand-500">Every learner moves to the next class for {preview.to_year}. Grade 9 learners are marked as completed and kept on record. Tick anyone who will repeat their class.</p>
        </div>

        {result && (
          <div className="card border-l-4 border-emerald-500">
            <p className="font-semibold text-emerald-700">Done. {result.promoted} promoted, {result.repeated} repeating, {result.completed} completed Grade 9.</p>
          </div>
        )}

        {preview.already_run ? (
          <p className="card text-brand-600">Classes have already been moved up from {preview.from_year} to {preview.to_year}.</p>
        ) : (
          <div className="card divide-y divide-brand-50 p-0">
            {preview.rows.map((row) => (
              <div key={row.classroom_id}>
                <button onClick={() => setOpen(open === row.classroom_id ? null : row.classroom_id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-brand-50">
                  <span className="w-28 font-semibold text-brand-800">{row.name}</span>
                  <ArrowRight size={16} className="text-brand-300" />
                  <span className={`flex-1 font-semibold ${row.completes ? "text-violet-700" : "text-brand-600"}`}>{row.completes ? "Completes school" : row.next}</span>
                  <span className="font-mono text-sm text-brand-500">{row.learners.length} learners</span>
                  {row.learners.some((item) => holdBack.includes(item.id)) && (
                    <span className="badge bg-amber-100 text-amber-700"><Repeat size={12} /> {row.learners.filter((item) => holdBack.includes(item.id)).length} repeating</span>
                  )}
                  <ChevronDown size={16} className={`text-brand-300 transition ${open === row.classroom_id ? "rotate-180" : ""}`} />
                </button>
                {open === row.classroom_id && (
                  <ul className="grid gap-1 bg-brand-50/50 px-5 pb-4 pt-1 sm:grid-cols-2">
                    {row.learners.map((item) => (
                      <li key={item.id}>
                        <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-amber-600"
                            disabled={readOnly}
                            checked={holdBack.includes(item.id)}
                            onChange={(event) => setHoldBack(event.target.checked ? [...holdBack, item.id] : holdBack.filter((value) => value !== item.id))}
                          />
                          <span className="flex-1">{item.full_name}</span>
                          <span className="font-mono text-xs text-brand-400">{item.admission_number}</span>
                          {holdBack.includes(item.id) && <span className="text-xs font-semibold text-amber-700">repeats</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {!readOnly && (
              <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <p className="flex-1 text-sm text-brand-600">
                  <span className="font-semibold text-emerald-700">{promoting} move up</span> · <span className="font-semibold text-amber-700">{holdBack.length} repeat</span> · <span className="font-semibold text-violet-700">{completing} complete</span>
                </p>
                <button className="btn-gold" onClick={() => setConfirm(true)}><GraduationCap size={17} /> Move classes up to {preview.to_year}</button>
              </div>
            )}
          </div>
        )}

        {preview.runs.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-brand-800">Past promotions</h3>
            <ul className="mt-2 divide-y divide-brand-50 text-sm">
              {preview.runs.map((run) => (
                <li key={run.from_year} className="flex flex-wrap gap-x-4 py-2">
                  <span className="font-mono font-semibold">{run.from_year} → {run.to_year}</span>
                  <span>{run.promoted} promoted, {run.repeated} repeating, {run.completed} completed</span>
                  <span className="text-brand-400">{run.run_by} · {format(new Date(`${run.run_at}Z`), "d MMM yyyy, h:mm a")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/50 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-brand-800">Move every class up to {preview.to_year}?</h2>
            <ul className="space-y-1 text-sm text-brand-600">
              <li><strong className="text-emerald-700">{promoting}</strong> learners move to the next class</li>
              <li><strong className="text-amber-700">{holdBack.length}</strong> repeat their class</li>
              <li><strong className="text-violet-700">{completing}</strong> complete Grade 9 and are kept on record</li>
            </ul>
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">This can only be done once for {preview.from_year}. Check the learners who repeat before you continue.</p>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={startNext} onChange={(event) => setStartNext(event.target.checked)} />
              Make Term 1 {preview.to_year} the current term
            </label>
            <div>
              <label className="label" htmlFor="typed">Type {preview.to_year} to confirm</label>
              <input id="typed" className="input font-mono" value={typed} onChange={(event) => setTyped(event.target.value)} />
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn-primary" disabled={typed !== String(preview.to_year)} onClick={promote}>Move classes up</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
