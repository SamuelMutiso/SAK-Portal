import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import { EXAMS, LEVELS, SUBJECTS, TERM, levelForScore } from "../../constants";

export default function Assessments() {
  const [students, setStudents] = useState(null);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [exam, setExam] = useState("End-Term");
  const [scores, setScores] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/students").then(({ data }) => setStudents(data));
  }, []);

  useEffect(() => {
    api.get("/assessments", { params: { subject, exam, term: TERM } }).then(({ data }) => {
      const saved = {};
      data.forEach((record) => {
        saved[record.student_id] = record.score ?? "";
      });
      setScores(saved);
      setMessage(null);
    });
  }, [subject, exam]);

  function handleScore(studentId, value) {
    if (value === "" || (/^\d+$/.test(value) && Number(value) <= 100)) {
      setScores({ ...scores, [studentId]: value });
    }
  }

  async function handleSave() {
    const entries = Object.entries(scores)
      .filter(([, score]) => score !== "")
      .map(([studentId, score]) => ({ student_id: Number(studentId), score: Number(score) }));
    setSaving(true);
    try {
      await api.post("/assessments/sheet", { subject, exam, term: TERM, scores: entries });
      setMessage({ type: "success", text: `${subject} ${exam} marks saved for ${entries.length} learners. Parents can see them now.` });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
    setSaving(false);
  }

  if (!students) return <Loader />;

  const entered = Object.values(scores).filter((score) => score !== "").map(Number);
  const mean = entered.length ? Math.round(entered.reduce((sum, score) => sum + score, 0) / entered.length) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Grades</h1>
        <p className="text-brand-500">{TERM} · enter marks out of 100. The CBC level is worked out for you.</p>
      </div>

      <div className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="subject">Learning area</label>
          <select id="subject" className="input" value={subject} onChange={(event) => setSubject(event.target.value)}>
            {SUBJECTS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="label">Exam</p>
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
            <p className="text-xs font-semibold uppercase text-gold-600">Class mean</p>
            <p className="font-mono text-xl font-semibold text-brand-800">{mean}%</p>
          </div>
        )}
      </div>

      <div className="card divide-y divide-brand-100 p-0">
        {students.map((student) => {
          const score = scores[student.id] ?? "";
          const level = score === "" ? null : levelForScore(Number(score));
          return (
            <div key={student.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1">
                <p className="font-semibold">{student.full_name}</p>
                <p className="font-mono text-xs text-brand-400">{student.admission_number}</p>
              </div>
              <input
                inputMode="numeric"
                className="input w-20 text-center font-mono"
                placeholder="--"
                value={score}
                onChange={(event) => handleScore(student.id, event.target.value)}
                aria-label={`Score for ${student.full_name}`}
              />
              <span className={`badge w-10 justify-center font-mono ${level ? LEVELS[level].style : "bg-brand-50 text-brand-300"}`}>{level || "--"}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-brand-500">
        {Object.entries(LEVELS).map(([code, level]) => (
          <span key={code} className={`badge ${level.style}`}>{code} · {level.label}</span>
        ))}
      </div>

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
      )}

      <button className="btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving || !entered.length}>
        {saving ? "Saving..." : "Save marks"}
      </button>
    </div>
  );
}
