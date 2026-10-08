import { History, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import ClassInsights from "../../components/ClassInsights";
import Loader from "../../components/Loader";
import ReasonDialog from "../../components/ReasonDialog";
import { EXAMS, LEVELS, RUBRIC_CODES, TERM, levelForScore } from "../../constants";

export default function Assessments() {
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("End-Term");
  const [entries, setEntries] = useState({});
  const [saved, setSaved] = useState({});
  const [history, setHistory] = useState({});
  const [pending, setPending] = useState(null);
  const [insights, setInsights] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/classes"), api.get("/students")]).then(([classes, list]) => {
      setClassroom(classes.data[0]);
      setSubject(classes.data[0]?.learning_areas[0] || "");
      setStudents(list.data);
    });
  }, []);

  useEffect(() => {
    if (!subject) return;
    api.get("/assessments", { params: { subject, exam, term: TERM } }).then(({ data }) => {
      const values = {};
      const counts = {};
      data.forEach((record) => {
        values[record.student_id] = String(classroom?.uses_marks ? record.score ?? "" : record.level);
        counts[record.student_id] = record.times_changed;
      });
      setEntries(values);
      setSaved(values);
      setHistory(counts);
      setMessage(null);
      setInsights(null);
    });
  }, [subject, exam, classroom]);

  function handleScore(studentId, value) {
    if (value === "" || (/^\d+$/.test(value) && Number(value) <= 100)) {
      setEntries({ ...entries, [studentId]: value });
    }
  }

  function isChanged(studentId) {
    const before = saved[studentId];
    const now = entries[studentId];
    return before !== undefined && before !== "" && now !== "" && now !== undefined && String(now) !== before;
  }

  function changedRows() {
    return students
      .filter((student) => isChanged(student.id))
      .map((student) => ({ id: student.id, name: student.full_name, before: saved[student.id], after: String(entries[student.id]) }));
  }

  function handleSave() {
    const changes = changedRows();
    if (changes.length) setPending(changes);
    else submit({});
  }

  async function submit(reasons) {
    const rows = Object.entries(entries)
      .filter(([, value]) => value !== "" && value !== undefined)
      .map(([studentId, value]) => {
        const row = classroom.uses_marks ? { student_id: Number(studentId), score: Number(value) } : { student_id: Number(studentId), level: value };
        return reasons[studentId] ? { ...row, reason: reasons[studentId] } : row;
      });
    setSaving(true);
    try {
      const { data } = await api.post("/assessments/sheet", { subject, exam, term: TERM, scores: rows });
      const counts = { ...history };
      data.forEach((record) => {
        counts[record.student_id] = record.times_changed;
      });
      const changedCount = Object.keys(reasons).length;
      setSaved({ ...entries });
      setHistory(counts);
      setPending(null);
      setMessage({
        type: "success",
        text: `${subject} ${exam} saved for ${rows.length} learners${changedCount ? `, ${changedCount} changed mark${changedCount > 1 ? "s" : ""} recorded with the reason` : ""}. Parents can see it now.`,
      });
      api.get("/insights/class", { params: { term: TERM, exam } }).then(({ data: result }) => setInsights(result));
    } catch (error) {
      const missing = error.response?.data?.needs_reason;
      if (missing) setPending(changedRows().filter((row) => missing.includes(row.id)));
      setMessage({ type: "error", text: errorMessage(error) });
    }
    setSaving(false);
  }

  if (!classroom) return <Loader />;

  const marks = Object.values(entries).filter((value) => value !== "" && value !== undefined);
  const mean = classroom.uses_marks && marks.length ? Math.round(marks.map(Number).reduce((sum, score) => sum + score, 0) / marks.length) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Grades</h1>
        <p className="mt-2 text-brand-500">
          {classroom.name} · {TERM}.{" "}
          {classroom.uses_marks ? "Enter marks out of 100 and the CBC level is worked out for you." : "Pick a performance level for each learner."}
        </p>
      </div>

      <div className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="subject">Learning area</label>
          <select id="subject" className="input" value={subject} onChange={(event) => setSubject(event.target.value)}>
            {classroom.learning_areas.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="label">Assessment</p>
          <div className="flex gap-1 rounded-xl bg-brand-50 p-1">
            {EXAMS.map((item) => (
              <button
                key={item}
                onClick={() => setExam(item)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${exam === item ? "bg-brand-700 text-white" : "text-brand-600 hover:bg-white"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        {mean !== null && (
          <div className="rounded-xl bg-gold-100 px-4 py-2 text-center">
            <p className="text-xs font-semibold text-gold-600">Class mean</p>
            <p className="font-mono text-xl font-semibold text-brand-800">{mean}%</p>
          </div>
        )}
      </div>

      <div className="card divide-y divide-brand-100 p-0">
        {students.map((student) => {
          const value = entries[student.id] ?? "";
          const level = classroom.uses_marks ? (value === "" ? null : levelForScore(Number(value))) : value || null;
          return (
            <div key={student.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-40 flex-1">
                <p className="font-semibold">{student.full_name}</p>
                <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-brand-400">
                  {student.admission_number}
                  {history[student.id] > 0 && (
                    <span className="inline-flex items-center gap-1 font-body text-brand-500" title="This mark has been changed before. The reasons are kept.">
                      <History size={12} /> changed {history[student.id]}x
                    </span>
                  )}
                  {isChanged(student.id) && <span className="font-body font-semibold text-amber-600">was {saved[student.id]}, needs a reason</span>}
                </p>
              </div>
              {classroom.uses_marks ? (
                <>
                  <input
                    inputMode="numeric"
                    className="input w-20 text-center font-mono"
                    placeholder="--"
                    value={value}
                    onChange={(event) => handleScore(student.id, event.target.value)}
                    aria-label={`Marks for ${student.full_name}`}
                  />
                  <span className={`badge w-10 justify-center font-mono ${level ? LEVELS[level].style : "bg-brand-50 text-brand-300"}`}>{level || "--"}</span>
                </>
              ) : (
                <div className="flex gap-1">
                  {RUBRIC_CODES.map((code) => (
                    <button
                      key={code}
                      onClick={() => setEntries({ ...entries, [student.id]: code })}
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

      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(LEVELS).map(([code, level]) => (
          <span key={code} className={`badge ${level.style}`}>{code}: {level.label}</span>
        ))}
      </div>

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
      )}

      <button className="btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving || !marks.length}>
        {saving ? "Saving..." : "Save grades"}
      </button>

      {insights && (
        <section className="space-y-3 border-t border-brand-100 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="flex flex-1 items-center gap-2 text-xl font-semibold text-brand-800"><Lightbulb size={20} className="text-gold-500" /> Insights for {exam}</h2>
            <Link to="/teacher/insights" className="text-sm font-semibold text-brand-600 hover:underline">Open full insights</Link>
          </div>
          <ClassInsights data={insights} />
        </section>
      )}

      {pending && (
        <ReasonDialog
          rows={pending}
          subject={`${subject} · ${exam}`}
          saving={saving}
          onCancel={() => setPending(null)}
          onConfirm={submit}
        />
      )}
    </div>
  );
}
