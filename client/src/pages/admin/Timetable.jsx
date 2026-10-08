import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import TimetableGrid from "../../components/TimetableGrid";

export default function Timetable() {
  const canEdit = useSelector((state) => state.auth.user.role) === "admin";
  const [classes, setClasses] = useState([]);
  const [classroomId, setClassroomId] = useState("");
  const [timetable, setTimetable] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.get("/classes").then(({ data }) => {
      setClasses(data);
      if (data[0]) setClassroomId(String(data[0].id));
    });
  }, []);

  useEffect(() => {
    if (!classroomId) return;
    setTimetable(null);
    api.get(`/timetable/class/${classroomId}`).then(({ data }) => setTimetable(data));
  }, [classroomId]);

  async function handleChange(day, period, subject) {
    try {
      const { data } = await api.put(`/timetable/class/${classroomId}`, { day, period, subject });
      const others = timetable.slots.filter((slot) => !(slot.day === day && slot.period === period));
      setTimetable({ ...timetable, slots: data.slot ? [...others, data.slot] : others });
      setStatus({ type: "success", text: "Saved. Parents and teachers see the change straight away." });
    } catch (error) {
      setStatus({ type: "error", text: errorMessage(error) });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="page-title">Timetable</h1>
          <p className="mt-2 text-brand-500">{canEdit ? "Pick a lesson in any cell to change it. Changes save as you go." : "Weekly lessons for every class."}</p>
        </div>
        <select className="input w-auto" value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>
          {classes.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
        </select>
      </div>

      {status && (
        <p className={`rounded-xl px-4 py-2 text-sm ${status.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{status.text}</p>
      )}

      <div className="card">{timetable ? <TimetableGrid timetable={timetable} editable={canEdit} onChange={handleChange} /> : <Loader />}</div>
    </div>
  );
}
