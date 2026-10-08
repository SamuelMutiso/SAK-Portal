import { useEffect, useState } from "react";
import api from "../../api/client";
import Loader from "../../components/Loader";
import TimetableGrid from "../../components/TimetableGrid";

export default function TeacherTimetable() {
  const [timetable, setTimetable] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api.get("/classes").then(({ data }) => {
      if (!data[0]) {
        setMissing(true);
        return;
      }
      api.get(`/timetable/class/${data[0].id}`).then(({ data: result }) => setTimetable(result));
    });
  }, []);

  if (missing) return <p className="card">You have not been assigned a class yet.</p>;
  if (!timetable) return <Loader />;

  const today = new Date().getDay();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{timetable.classroom_name} timetable</h1>
        <p className="mt-2 text-brand-500">Only the school office can change the timetable.</p>
      </div>
      <div className="card">
        <TimetableGrid timetable={timetable} highlightDay={today >= 1 && today <= 5 ? today - 1 : undefined} />
      </div>
    </div>
  );
}
