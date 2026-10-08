import { format } from "date-fns";
import { Bus, CheckCircle2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import SmsPreview from "../../components/SmsPreview";

export default function Trip() {
  const [data, setData] = useState(null);
  const [sms, setSms] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/trips/my-route").then(({ data: result }) => setData(result));
  }, []);

  async function record(studentId, event) {
    try {
      const { data: result } = await api.post("/trips/log", { student_id: studentId, event });
      setData({ ...data, logs: [...data.logs, result.log] });
      setSms(result.sms);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!data) return <Loader />;
  if (!data.route) return <p className="card">You have not been assigned a route yet. Please contact the school office.</p>;

  function lastEvent(studentId) {
    const logs = data.logs.filter((log) => log.student_id === studentId);
    return logs[logs.length - 1];
  }

  const onBoard = data.students.filter((student) => lastEvent(student.id)?.event === "boarded").length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-brand-800 p-6 text-white">
        <p className="text-sm font-semibold text-gold-400">{format(new Date(), "EEEE d MMMM")}</p>
        <h1 className="mt-1 flex items-center gap-3 font-headline text-4xl font-extrabold uppercase leading-none"><Bus /> {data.route.name}</h1>
        <p className="mt-2 text-brand-200">{data.route.vehicle} · {onBoard} of {data.students.length} learners on the bus</p>
        <p className="mt-3 flex flex-wrap items-center gap-1 text-sm text-brand-100">
          <MapPin size={14} /> {data.route.stops.map((stop) => stop.name).join(" → ")}
        </p>
      </section>

      {sms && <SmsPreview sms={sms} onClose={() => setSms(null)} />}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="space-y-3">
        {data.students.map((student) => {
          const last = lastEvent(student.id);
          return (
            <div key={student.id} className="card flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <p className="text-lg font-semibold">{student.full_name}</p>
                <p className="text-sm text-brand-500">
                  {student.classroom_name}
                  {last && (
                    <span className="ml-2 inline-flex items-center gap-1 font-semibold text-emerald-600">
                      <CheckCircle2 size={14} /> {last.event === "boarded" ? "On the bus" : "Dropped off"} {format(new Date(last.recorded_at + "Z"), "h:mm a")}
                    </span>
                  )}
                </p>
              </div>
              <button className="btn-primary px-5 py-3" onClick={() => record(student.id, "boarded")} disabled={last?.event === "boarded"}>Boarded</button>
              <button className="btn-gold px-5 py-3" onClick={() => record(student.id, "dropped")} disabled={last?.event !== "boarded"}>Dropped</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
