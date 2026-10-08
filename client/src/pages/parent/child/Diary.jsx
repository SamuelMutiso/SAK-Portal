import { format } from "date-fns";
import { useEffect, useState } from "react";
import api from "../../../api/client";
import Loader from "../../../components/Loader";
import { MOODS } from "../../../constants";

export default function Diary({ student }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    api.get(`/diary/student/${student.id}`).then(({ data }) => setEntries(data));
  }, [student.id]);

  if (!entries) return <Loader />;
  if (!entries.length) return <p className="card text-sm text-brand-500">The teacher has not filled the diary yet.</p>;

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="card">
          <div className="flex items-center gap-3">
            <p className="flex-1 font-semibold text-brand-800">{format(new Date(entry.date), "EEEE d MMMM")}</p>
            <span className={`badge ${MOODS[entry.mood].style}`}>{MOODS[entry.mood].label}</span>
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-brand-400">Meals</dt><dd>{entry.meals || "--"}</dd></div>
            <div><dt className="text-brand-400">Nap</dt><dd>{entry.nap || "--"}</dd></div>
            <div><dt className="text-brand-400">Activities</dt><dd>{entry.activities || "--"}</dd></div>
          </dl>
          {entry.note && <p className="mt-3 rounded-xl bg-gold-100 px-3 py-2 text-sm text-brand-800">{entry.note}</p>}
        </div>
      ))}
    </div>
  );
}
