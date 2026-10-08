import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";
import { LEVELS } from "../../constants";

const SUBJECTS = ["Mathematics", "English", "Kiswahili", "Science", "Social Studies", "Creative Arts"];
const TERM = "Term 3 2026";

export default function Assessments() {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ subject: SUBJECTS[0], level: "", comment: "" });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get("/students").then(({ data }) => {
      setStudents(data);
      if (data[0]) setStudentId(String(data[0].id));
    });
  }, []);

  useEffect(() => {
    if (!studentId) return;
    api.get(`/assessments/student/${studentId}`).then(({ data }) => setRecords(data));
  }, [studentId]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const { data } = await api.post("/assessments", { ...form, student_id: Number(studentId), term: TERM });
      setRecords([...records.filter((record) => record.id !== data.id), data]);
      setForm({ ...form, level: "", comment: "" });
      setMessage({ type: "success", text: `${data.subject} saved for ${data.student_name}.` });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">CBC Assessments</h1>
        <p className="text-brand-500">{TERM} · record a performance level for each learning area.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label" htmlFor="student">Learner</label>
            <select id="student" className="input" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="subject">Learning area</label>
            <select id="subject" className="input" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}>
              {SUBJECTS.map((subject) => (
                <option key={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="label">Performance level</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(LEVELS).map(([code, level]) => (
                <button
                  type="button"
                  key={code}
                  onClick={() => setForm({ ...form, level: code })}
                  className={`rounded-xl border-2 p-2 text-left transition ${form.level === code ? `${level.style} border-current` : "border-brand-100 hover:border-brand-300"}`}
                >
                  <span className="font-mono font-semibold">{code}</span>
                  <span className="block text-[11px] leading-tight">{level.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="comment">Comment</label>
            <input id="comment" className="input" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
          </div>
          {message && (
            <p className={`rounded-xl px-3 py-2 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
          )}
          <button className="btn-primary w-full" disabled={!form.level || !studentId}>Save level</button>
        </form>

        <div className="card">
          <h2 className="font-semibold text-brand-800">Recorded this term</h2>
          <div className="mt-3 space-y-2">
            {records.length === 0 && <p className="text-sm text-brand-400">Nothing recorded yet.</p>}
            {records.map((record) => (
              <div key={record.id} className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-sm">
                <span>{record.subject}</span>
                <span className={`badge font-mono ${LEVELS[record.level].style}`}>{record.level}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
