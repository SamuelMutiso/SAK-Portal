import { format } from "date-fns";
import { Bus, CheckCircle2, Home, MapPin, School, Sun, Sunset } from "lucide-react";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";
import LiveShare from "../../components/LiveShare";
import Loader from "../../components/Loader";

const STATUS = {
  boarded: { text: "On the bus", tone: "bg-sky-100 text-sky-800" },
  arrived: { text: "At school", tone: "bg-emerald-100 text-emerald-800" },
  left: { text: "On the bus home", tone: "bg-sky-100 text-sky-800" },
  dropped: { text: "Dropped off", tone: "bg-brand-100 text-brand-700" },
};

const time = (value) => format(new Date(`${value}Z`), "h:mm a");

export default function Trip() {
  const [data, setData] = useState(null);
  const [run, setRun] = useState(new Date().getHours() < 12 ? "morning" : "afternoon");
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    api.get("/trips/my-route").then(({ data: result }) => setData(result));
  }, []);

  if (!data) return <Loader />;
  if (!data.route) return <p className="card">You have not been assigned a route yet. Please contact the school office.</p>;

  const lastEvent = (studentId) => [...data.logs].reverse().find((log) => log.student_id === studentId);
  const state = (studentId) => lastEvent(studentId)?.event || null;

  async function mark(student, event) {
    setBusy(`${student.id}-${event}`);
    try {
      const { data: result } = await api.post("/trips/log", { student_id: student.id, event });
      setData({ ...data, logs: [...data.logs, result.log] });
      setNotice({ type: "success", text: `${student.first_name}: parent told by SMS.` });
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  async function whole(event) {
    setBusy(event);
    try {
      const { data: result } = await api.post("/trips/bulk", { event });
      setData({ ...data, logs: [...data.logs, ...result.logs] });
      setNotice({ type: "success", text: result.count ? `${result.count} learner${result.count === 1 ? "" : "s"} marked ${event === "arrived" ? "at school" : "on the bus home"}. ${result.sms.recipients} parents told by SMS.` : "Nobody to mark right now." });
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  const students = data.students;
  const stops = data.route.stops.slice(1).map((stop) => stop.name);
  const groups = [...stops, null].map((stop) => ({ stop, learners: students.filter((student) => (stop ? student.transport_stop === stop : !stops.includes(student.transport_stop))) })).filter((group) => group.learners.length);
  const onBus = students.filter((student) => state(student.id) === "boarded").length;
  const atSchool = students.filter((student) => state(student.id) === "arrived").length;
  const goingHome = students.filter((student) => state(student.id) === "left").length;
  const home = students.filter((student) => state(student.id) === "dropped").length;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-brand-800 p-5 text-white">
        <p className="text-sm font-semibold text-gold-400">{format(new Date(), "EEEE d MMMM")}</p>
        <h1 className="mt-1 flex items-center gap-3 font-headline text-3xl font-extrabold uppercase leading-none sm:text-4xl"><Bus className="shrink-0" /> {data.route.name}</h1>
        <p className="mt-2 text-brand-200">{data.route.vehicle} · {students.length} learners · {stops.length} stops</p>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[["On bus", onBus + goingHome], ["At school", atSchool], ["Home", home], ["Waiting", students.length - onBus - goingHome - atSchool - home]].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/10 px-1 py-2">
              <p className="font-mono text-xl font-semibold">{value}</p>
              <p className="text-[11px] text-brand-200">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <LiveShare stops={data.route.stops} initiallySharing={data.sharing} practice={data.practice} />

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-brand-100/60 p-1">
        {[["morning", "Morning", Sun], ["afternoon", "Afternoon", Sunset]].map(([key, label, Icon]) => (
          <button key={key} type="button" onClick={() => setRun(key)} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ${run === key ? "bg-white text-brand-800 shadow-sm" : "text-brand-500"}`}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>

      {run === "morning" ? (
        <button type="button" onClick={() => whole("arrived")} disabled={!onBus || busy === "arrived"} className="btn w-full bg-emerald-600 py-4 text-base text-white hover:bg-emerald-700">
          <School size={20} /> {busy === "arrived" ? "Sending…" : onBus ? `Arrived at school (${onBus} on the bus)` : "Arrived at school"}
        </button>
      ) : (
        <button type="button" onClick={() => whole("left")} disabled={!atSchool || busy === "left"} className="btn w-full bg-sky-600 py-4 text-base text-white hover:bg-sky-700">
          <Bus size={20} /> {busy === "left" ? "Sending…" : atSchool ? `All aboard, leaving school (${atSchool})` : "All aboard, leaving school"}
        </button>
      )}
      <p className="-mt-2 text-center text-xs text-brand-400">{run === "morning" ? "Tap each learner as they get on, then this button when you reach school." : "Tap this when the bus leaves school, then each learner as they get off."}</p>

      {notice && <p className={`rounded-xl px-3 py-2 text-sm ${notice.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`} role="status">{notice.text}</p>}

      {groups.map((group) => (
        <section key={group.stop || "none"} className="space-y-2">
          <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-brand-600"><MapPin size={15} /> {group.stop || "No stop set"} <span className="font-normal text-brand-400">· {group.learners.length}</span></h2>
          {group.learners.map((student) => {
            const last = lastEvent(student.id);
            const status = last ? STATUS[last.event] : null;
            const canBoard = run === "morning" && (!last || last.event === "dropped");
            const canDrop = run === "afternoon" && last && (last.event === "left" || last.event === "boarded");
            const canLeave = run === "afternoon" && (!last || last.event === "arrived" || last.event === "dropped");
            return (
              <div key={student.id} className="card flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-brand-900">{student.full_name}</p>
                  <p className="truncate text-sm text-brand-500">{student.classroom_name}</p>
                  {status && <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${status.tone}`}><CheckCircle2 size={12} /> {status.text} {time(last.recorded_at)}</span>}
                </div>
                {run === "morning" && (
                  <button type="button" onClick={() => mark(student, "boarded")} disabled={!canBoard || busy === `${student.id}-boarded`} className="btn-primary h-12 shrink-0 px-4">
                    Picked up
                  </button>
                )}
                {run === "afternoon" && canLeave && (
                  <button type="button" onClick={() => mark(student, "left")} disabled={busy === `${student.id}-left`} className="btn-ghost h-12 shrink-0 px-4">
                    On bus
                  </button>
                )}
                {run === "afternoon" && !canLeave && (
                  <button type="button" onClick={() => mark(student, "dropped")} disabled={!canDrop || busy === `${student.id}-dropped`} className="btn-gold h-12 shrink-0 px-4">
                    <Home size={16} /> Dropped
                  </button>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
