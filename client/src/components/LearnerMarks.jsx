import { History } from "lucide-react";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../api/client";
import { EXAMS, LEVELS, RUBRIC_CODES, levelForScore } from "../constants";
import Loader from "./Loader";
import ReasonDialog from "./ReasonDialog";

export default function LearnerMarks({ student, subjects, term, onSaved }) {
  const marked = student.uses_marks;
  const [exam, setExam] = useState("End-Term");
  const [entries, setEntries] = useState(null);
  const [saved, setSaved] = useState({});
  const [history, setHistory] = useState({});
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setEntries(null);
    setMessage(null);
    let active = true;
    api.get(`/assessments/student/${student.id}`, { params: { term, exam } }).then(({ data }) => {
      if (!active) return;
      const values = {};
      const counts = {};
      data.forEach((record) => {
        values[record.subject] = String(marked ? record.score ?? "" : record.level);
        counts[record.subject] = record.times_changed;
      });
      setEntries(values);
      setSaved(values);
      setHistory(counts);
    });
    return () => {
      active = false;
    };
  }, [student.id, term, exam, marked]);

  function changedRows() {
    return subjects
      .filter((subject) => saved[subject] && entries[subject] && entries[subject] !== saved[subject])
      .map((subject) => ({ id: subject, name: subject, before: saved[subject], after: entries[subject] }));
  }

  function handleSave() {
    const changes = changedRows();
    if (changes.length) setPending(changes);
    else submit({});
  }

  async function submit(reasons) {
    const scores = subjects
      .filter((subject) => entries[subject])
      .map((subject) => {
        const row = marked ? { subject, score: Number(entries[subject]) } : { subject, level: entries[subject] };
        return reasons[subject] ? { ...row, reason: reasons[subject] } : row;
      });
    setSaving(true);
    try {
      const { data } = await api.post(`/assessments/student/${student.id}`, { term, exam, scores });
      const counts = { ...history };
      data.forEach((record) => {
        counts[record.subject] = record.times_changed;
      });
      setHistory(counts);
      setSaved({ ...entries });
      setPending(null);
      setMessage({ type: "success", text: `${exam} marks saved for ${scores.length} learning areas. Parents can see them now.` });
      onSaved?.();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
    setSaving(false);
  }

  const filled = entries ? subjects.filter((subject) => entries[subject]).length : 0;

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-brand-800">{student.full_name} · {student.classroom_name}</h2>
          <p className="text-sm text-brand-500">{term} · {marked ? "marks out of 100" : "CBC performance levels"}</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-brand-50 p-1">
          {EXAMS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setExam(item)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${exam === item ? "bg-gold-500 text-brand-900" : "text-brand-600 hover:bg-white"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {!entries ? (
        <Loader />
      ) : (
        <div className="divide-y divide-brand-50">
          {subjects.map((subject) => {
            const value = entries[subject] || "";
            const level = marked ? (value ? levelForScore(Number(value)) : null) : value || null;
            const changed = saved[subject] && value && value !== saved[subject];
            return (
              <div key={subject} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-semibold">{subject}</p>
                  <p className="flex flex-wrap gap-2 text-xs">
                    {history[subject] > 0 && <span className="inline-flex items-center gap-1 text-brand-400"><History size={11} /> changed {history[subject]}x</span>}
                    {changed && <span className="font-semibold text-amber-600">was {saved[subject]}, needs a reason</span>}
                  </p>
                </div>
                {marked ? (
                  <>
                    <input
                      inputMode="numeric"
                      className="input w-20 text-center font-mono"
                      placeholder="--"
                      value={value}
                      onChange={(event) => {
                        const next = event.target.value;
                        if (next === "" || (/^\d+$/.test(next) && Number(next) <= 100)) setEntries({ ...entries, [subject]: next });
                      }}
                      aria-label={`${subject} marks`}
                    />
                    <span className={`badge w-10 justify-center font-mono ${level ? LEVELS[level].style : "bg-brand-50 text-brand-300"}`}>{level || "--"}</span>
                  </>
                ) : (
                  <div className="flex gap-1">
                    {RUBRIC_CODES.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setEntries({ ...entries, [subject]: code })}
                        title={LEVELS[code].label}
                        className={`w-11 rounded-lg py-1.5 font-mono text-sm font-semibold transition ${value === code ? LEVELS[code].style + " ring-2 ring-current" : "bg-brand-50 text-brand-400 hover:bg-brand-100"}`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {message && (
        <p className={`rounded-xl px-3 py-2 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
      )}
      <button className="btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving || !filled}>
        {saving ? "Saving..." : `Save ${exam} marks`}
      </button>

      {pending && <ReasonDialog rows={pending} subject={`${student.full_name} · ${term} ${exam}`} saving={saving} onCancel={() => setPending(null)} onConfirm={submit} />}
    </div>
  );
}
