import { format } from "date-fns";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import { MOODS } from "../../constants";

const EMPTY = { meals: "", nap: "", mood: "happy", activities: "", note: "" };

export default function Diary() {
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [rows, setRows] = useState({});
  const [shared, setShared] = useState({ meals: "", activities: "" });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/classes"), api.get("/students")]).then(([classes, list]) => {
      setClassroom(classes.data[0]);
      setStudents(list.data);
    });
  }, []);

  useEffect(() => {
    api.get("/diary", { params: { date } }).then(({ data }) => {
      const saved = {};
      data.forEach((entry) => {
        saved[entry.student_id] = { meals: entry.meals || "", nap: entry.nap || "", mood: entry.mood, activities: entry.activities || "", note: entry.note || "" };
      });
      setRows(saved);
      setMessage(null);
    });
  }, [date]);

  function update(studentId, field, value) {
    setRows({ ...rows, [studentId]: { ...EMPTY, ...rows[studentId], [field]: value } });
  }

  function applyToAll() {
    const next = {};
    students.forEach((student) => {
      next[student.id] = { ...EMPTY, ...rows[student.id], ...Object.fromEntries(Object.entries(shared).filter(([, value]) => value)) };
    });
    setRows(next);
  }

  async function handleSave() {
    const entries = students.map((student) => ({ student_id: student.id, ...EMPTY, ...rows[student.id] }));
    try {
      await api.post("/diary", { date, entries });
      setMessage({ type: "success", text: `Diary saved for ${entries.length} learners.` });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  if (!classroom) return <Loader />;

  if (classroom.level !== "Pre-Primary") {
    return (
      <div className="space-y-4">
        <h1 className="page-title">Daily diary</h1>
        <p className="card text-brand-600">The daily diary is for Playgroup, PP1 and PP2 classes. {classroom.name} uses homework and grades.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="page-title">Daily diary</h1>
          <p className="mt-2 text-brand-500">{classroom.name}. Parents see meals, nap, mood and activities the same day.</p>
        </div>
        <input type="date" className="input w-auto" value={date} max={format(new Date(), "yyyy-MM-dd")} onChange={(event) => setDate(event.target.value)} />
      </div>

      <div className="card grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label className="label" htmlFor="shared-meals">Today&apos;s meals for everyone</label>
          <input id="shared-meals" className="input" placeholder="Porridge, rice and beans, fruit" value={shared.meals} onChange={(event) => setShared({ ...shared, meals: event.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="shared-activities">Today&apos;s activities for everyone</label>
          <input id="shared-activities" className="input" placeholder="Counting, story time, outdoor play" value={shared.activities} onChange={(event) => setShared({ ...shared, activities: event.target.value })} />
        </div>
        <button className="btn-ghost" onClick={applyToAll}>Fill for whole class</button>
      </div>

      <div className="space-y-3">
        {students.map((student) => {
          const row = { ...EMPTY, ...rows[student.id] };
          return (
            <div key={student.id} className="card space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="flex-1 font-semibold">{student.full_name}</p>
                <div className="flex gap-1">
                  {Object.entries(MOODS).map(([key, mood]) => (
                    <button
                      key={key}
                      onClick={() => update(student.id, "mood", key)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${row.mood === key ? mood.style + " ring-2 ring-current" : "bg-brand-50 text-brand-400"}`}
                    >
                      {mood.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <input className="input" placeholder="Meals" value={row.meals} onChange={(event) => update(student.id, "meals", event.target.value)} />
                <input className="input" placeholder="Nap, e.g. 1 hour" value={row.nap} onChange={(event) => update(student.id, "nap", event.target.value)} />
                <input className="input" placeholder="Note for parent (optional)" value={row.note} onChange={(event) => update(student.id, "note", event.target.value)} />
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
      )}
      <button className="btn-primary w-full sm:w-auto" onClick={handleSave}>Save diary</button>
    </div>
  );
}
