import { format } from "date-fns";
import { ArrowLeft, BedDouble, Bus, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/client";
import Loader from "../../components/Loader";
import RouteMap from "../../components/RouteMap";
import { LEVELS } from "../../constants";

const STATUS_STYLES = {
  present: "bg-emerald-500",
  late: "bg-amber-400",
  absent: "bg-red-500",
};

export default function Child() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/students/${id}`),
      api.get(`/attendance/student/${id}`),
      api.get(`/assessments/student/${id}`),
      api.get("/transport"),
    ]).then(([student, attendance, assessments, routes]) => {
      const route = routes.data.find((item) => item.id === student.data.transport_route_id);
      setData({ student: student.data, attendance: attendance.data, assessments: assessments.data, route });
    });
  }, [id]);

  if (!data) return <Loader />;

  const { student, attendance, assessments, route } = data;
  const attended = attendance.filter((record) => record.status !== "absent").length;
  const rate = attendance.length ? Math.round((attended / attendance.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link to="/parent" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="card flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-400 font-display text-2xl font-bold text-brand-900">
          {student.first_name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="page-title">{student.full_name}</h1>
          <p className="text-brand-500">{student.classroom_name} · <span className="font-mono">{student.admission_number}</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          {student.is_boarder && <span className="badge bg-violet-100 text-violet-700"><BedDouble size={12} /> Boarder</span>}
          {student.route_name && <span className="badge bg-amber-100 text-amber-700"><Bus size={12} /> {student.route_name}</span>}
          {student.clubs.map((club) => (
            <span key={club} className="badge bg-emerald-100 text-emerald-700"><Trophy size={12} /> {club}</span>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-brand-800">Attendance</h2>
            <span className="font-mono text-2xl font-semibold text-brand-700">{rate}%</span>
          </div>
          <p className="text-xs text-brand-400">Last {attendance.length} school days</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[...attendance].reverse().map((record) => (
              <div key={record.id} title={`${format(new Date(record.date), "EEE d MMM")}: ${record.status}`} className="flex flex-col items-center gap-1">
                <span className={`h-7 w-7 rounded-lg ${STATUS_STYLES[record.status]}`} />
                <span className="font-mono text-[10px] text-brand-400">{format(new Date(record.date), "d")}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-brand-500">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" /> Present</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" /> Late</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500" /> Absent</span>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-brand-800">CBC progress</h2>
          {assessments.length === 0 ? (
            <p className="mt-3 text-sm text-brand-400">No assessments recorded yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {assessments.map((record) => (
                <div key={record.id} className="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{record.subject}</p>
                    <p className="text-xs text-brand-400">{record.term}{record.comment ? ` · ${record.comment}` : ""}</p>
                  </div>
                  <span className={`badge font-mono ${LEVELS[record.level].style}`} title={LEVELS[record.level].label}>{record.level}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {route && (
        <div className="card">
          <h2 className="font-semibold text-brand-800">School bus: {route.name}</h2>
          <p className="mb-4 text-sm text-brand-500">Driver {route.driver_name} · {route.driver_phone} · {route.vehicle}</p>
          <RouteMap stops={route.stops} />
        </div>
      )}
    </div>
  );
}
