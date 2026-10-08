import { useEffect, useState } from "react";
import api from "../../../api/client";
import Loader from "../../../components/Loader";
import TimetableGrid from "../../../components/TimetableGrid";
import { lessonsFor, nextSchoolDay, nextSchoolDayLabel } from "../../../timetable";

export default function Timetable({ student }) {
  const [timetable, setTimetable] = useState(null);

  useEffect(() => {
    api.get(`/timetable/student/${student.id}`).then(({ data }) => setTimetable(data));
  }, [student.id]);

  if (!timetable) return <Loader />;

  const day = nextSchoolDay();
  const lessons = lessonsFor(timetable, day).filter((lesson) => !lesson.isBreak && lesson.subject);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-brand-800 p-6 text-white">
        <p className="text-sm font-semibold text-gold-400">{nextSchoolDayLabel(timetable.days)} · {timetable.days[day]}</p>
        <h3 className="mt-1 font-headline text-3xl font-extrabold uppercase leading-none">{student.first_name}&apos;s lessons</h3>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">
          {lessons.map((lesson) => (
            <li key={lesson.start} className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2 text-sm">
              <span className="font-mono text-xs text-brand-200">{lesson.start}</span>
              <span className="font-semibold">{lesson.subject}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="card">
        <h3 className="mb-4 font-semibold text-brand-800">Full week</h3>
        <TimetableGrid timetable={timetable} highlightDay={day} />
      </div>
    </div>
  );
}
