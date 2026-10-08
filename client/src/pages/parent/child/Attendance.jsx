import { format } from "date-fns";
import { Bus, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../../api/client";
import Loader from "../../../components/Loader";
import RouteMap from "../../../components/RouteMap";

const STATUS_STYLES = {
  present: "bg-emerald-500",
  late: "bg-amber-400",
  absent: "bg-red-500",
};

export default function Attendance({ student }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/attendance/student/${student.id}`),
      api.get(`/trips/student/${student.id}`),
      api.get("/transport"),
    ]).then(([attendance, trips, routes]) => {
      setData({
        attendance: attendance.data,
        trips: trips.data,
        route: routes.data.find((route) => route.id === student.transport_route_id),
      });
    });
  }, [student]);

  if (!data) return <Loader />;

  const { attendance, trips, route } = data;
  const attended = attendance.filter((record) => record.status !== "absent").length;
  const rate = attendance.length ? Math.round((attended / attendance.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold text-brand-800">Attendance</h3>
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

      {route && (
        <div className="card">
          <h3 className="flex items-center gap-2 font-semibold text-brand-800"><Bus size={18} /> {route.name}</h3>
          <p className="text-sm text-brand-500">Driver {route.driver_name} · {route.driver_phone} · {route.vehicle}</p>
          <ul className="my-4 space-y-1 text-sm">
            {trips.length === 0 && <li className="text-brand-400">No bus updates yet today.</li>}
            {trips.map((trip) => (
              <li key={trip.recorded_at} className="flex items-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2 size={16} />
                {trip.event === "boarded" ? "Boarded the bus" : "Dropped off"} at {format(new Date(trip.recorded_at + "Z"), "h:mm a")}
              </li>
            ))}
          </ul>
          <RouteMap stops={route.stops} height={300} />
        </div>
      )}
    </div>
  );
}
