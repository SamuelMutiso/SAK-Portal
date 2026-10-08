import { format } from "date-fns";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";

const STATUSES = [
  { value: "present", label: "Present", active: "bg-emerald-600 text-white" },
  { value: "late", label: "Late", active: "bg-amber-500 text-white" },
  { value: "absent", label: "Absent", active: "bg-red-600 text-white" },
];

export default function Attendance() {
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [marks, setMarks] = useState({});
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClassroom(data[0]));
    api.get("/students").then(({ data }) => setStudents(data));
  }, []);

  useEffect(() => {
    if (!classroom) return;
    api.get("/attendance", { params: { classroom_id: classroom.id, date } }).then(({ data }) => {
      const saved = {};
      data.forEach((record) => {
        saved[record.student_id] = record.status;
      });
      setMarks(saved);
      setMessage(null);
    });
  }, [classroom, date]);

  function markAll(status) {
    const all = {};
    students.forEach((student) => {
      all[student.id] = status;
    });
    setMarks(all);
  }

  async function handleSave() {
    const records = students.map((student) => ({ student_id: student.id, status: marks[student.id] || "present" }));
    try {
      await api.post("/attendance", { date, records });
      setMessage({ type: "success", text: `Register saved for ${records.length} learners.` });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  if (!classroom) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="page-title">Attendance</h1>
          <p className="text-brand-500">{classroom.name} register</p>
        </div>
        <input type="date" className="input w-auto" value={date} max={format(new Date(), "yyyy-MM-dd")} onChange={(event) => setDate(event.target.value)} />
      </div>

      <div className="flex gap-2">
        <button className="btn-ghost" onClick={() => markAll("present")}>Mark all present</button>
      </div>

      <div className="card divide-y divide-brand-100 p-0">
        {students.map((student) => {
          const current = marks[student.id] || "present";
          return (
            <div key={student.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="flex-1">
                <p className="font-semibold">{student.full_name}</p>
                <p className="font-mono text-xs text-brand-400">{student.admission_number}</p>
              </div>
              <div className="flex gap-1 rounded-xl bg-brand-50 p-1">
                {STATUSES.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => setMarks({ ...marks, [student.id]: status.value })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${current === status.value ? status.active : "text-brand-500 hover:bg-white"}`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <button className="btn-primary w-full sm:w-auto" onClick={handleSave}>Save register</button>
    </div>
  );
}
