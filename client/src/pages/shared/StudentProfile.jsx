import { format } from "date-fns";
import { ArrowLeft, BedDouble, Bus, HeartPulse, LogOut, Phone, RotateCcw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";

const TABS = [["overview", "Overview"], ["guardians", "Guardians"], ["health", "Health"], ["attendance", "Attendance"], ["history", "History"]];

const OUTCOME_STYLES = {
  admitted: "bg-sky-100 text-sky-700",
  promoted: "bg-emerald-100 text-emerald-700",
  repeated: "bg-amber-100 text-amber-700",
  completed: "bg-violet-100 text-violet-700",
  transferred: "bg-brand-100 text-brand-700",
  withdrawn: "bg-red-100 text-red-700",
  readmitted: "bg-sky-100 text-sky-700",
};

const STATUS_LABELS = { active: "In school", completed: "Completed Grade 9", transferred: "Transferred", withdrawn: "Withdrawn" };

function Detail({ label, value, mono }) {
  return (
    <div>
      <dt className="text-xs text-brand-400">{label}</dt>
      <dd className={`mt-0.5 font-semibold text-brand-800 ${mono ? "font-mono" : ""}`}>{value || "-"}</dd>
    </div>
  );
}

function Person({ title, name, relationship, phone, email }) {
  if (!name) return null;
  return (
    <div className="rounded-2xl bg-brand-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{title}</p>
      <p className="mt-1 font-semibold text-brand-800">{name}{relationship && <span className="ml-2 text-sm font-normal text-brand-500">{relationship}</span>}</p>
      {phone && <a href={`tel:${phone}`} className="mt-1 flex items-center gap-1.5 font-mono text-sm text-brand-600 hover:underline"><Phone size={13} /> {phone}</a>}
      {email && <p className="text-sm text-brand-500">{email}</p>}
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const user = useSelector((state) => state.auth.user);
  const isAdmin = user.role === "admin";
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [classes, setClasses] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({ status: "transferred", reason: "", left_on: new Date().toISOString().slice(0, 10), classroom_id: "" });
  const [error, setError] = useState(null);

  function load() {
    api.get(`/students/${id}/profile`).then(({ data: result }) => setData(result));
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (isAdmin) api.get("/classes").then(({ data: result }) => setClasses(result));
  }, [isAdmin]);

  async function submitLeave(event) {
    event.preventDefault();
    try {
      await api.post(`/students/${id}/leave`, { status: form.status, reason: form.reason, left_on: form.left_on || null });
      setDialog(null);
      setError(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function submitReadmit(event) {
    event.preventDefault();
    try {
      await api.post(`/students/${id}/readmit`, { classroom_id: Number(form.classroom_id) });
      setDialog(null);
      setError(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!data) return <Loader />;
  const { student, parent, health, attendance, history, siblings } = data;
  const active = student.status === "active";
  const tabs = TABS.filter(([key]) => key !== "health" || health);
  const rate = attendance.total ? Math.round((attendance.present / attendance.total) * 100) : null;

  return (
    <div className="space-y-6">
      <Link to={`/${user.role}/students`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft size={16} /> All learners</Link>

      <section className="flex flex-wrap items-center gap-5 rounded-3xl bg-brand-800 p-6 text-white">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 font-headline text-3xl font-extrabold text-brand-900">{student.first_name[0]}</span>
        <div className="flex-1">
          <h1 className="font-headline text-4xl font-extrabold uppercase leading-none">{student.full_name}</h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-brand-200">
            <span className="font-mono text-gold-400">{student.admission_number}</span>
            <span>{student.classroom_name || student.last_classroom_name}</span>
            {student.is_boarder ? <span className="inline-flex items-center gap-1"><BedDouble size={14} /> Boarder</span> : student.route_name && <span className="inline-flex items-center gap-1"><Bus size={14} /> {student.route_name}</span>}
          </p>
        </div>
        <span className={`badge ${active ? "bg-emerald-100 text-emerald-700" : "bg-white/15 text-white"}`}>{STATUS_LABELS[student.status]}</span>
        {isAdmin && (active ? (
          <button className="btn-ghost border-white/30 bg-white/10 text-white hover:bg-white/20" onClick={() => setDialog("leave")}><LogOut size={16} /> Record leaving</button>
        ) : (
          <button className="btn-gold" onClick={() => setDialog("readmit")}><RotateCcw size={16} /> Readmit</button>
        ))}
      </section>

      {health?.allergies && (
        <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><ShieldAlert size={18} /> Allergy: {health.allergies}</p>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-brand-50 p-1">
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? "bg-white text-brand-800 shadow-sm" : "text-brand-500 hover:text-brand-800"}`}>{label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <dl className="card grid gap-5 sm:grid-cols-3">
          <Detail label="Gender" value={student.gender} />
          <Detail label="Date of birth" value={student.date_of_birth && format(new Date(student.date_of_birth), "d MMM yyyy")} />
          <Detail label="Admitted" value={student.admission_date && format(new Date(student.admission_date), "d MMM yyyy")} />
          <Detail label="UPI (NEMIS)" value={student.upi} mono />
          <Detail label="KNEC assessment number" value={student.assessment_number} mono />
          <Detail label="Previous school" value={student.previous_school} />
          <Detail label="Home area" value={student.home_address} />
          <Detail label="Clubs" value={student.clubs.join(", ")} />
          <Detail label="Fee balance" value={`KES ${Number(student.fee_balance || 0).toLocaleString("en-KE")}`} mono />
          {!active && <Detail label="Left school" value={student.left_on && format(new Date(student.left_on), "d MMM yyyy")} />}
          {!active && student.leaving_reason && <Detail label="Reason" value={student.leaving_reason} />}
        </dl>
      )}

      {tab === "guardians" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Person title="Main parent (portal login)" name={parent?.full_name} relationship={student.guardian_relationship} phone={parent?.phone} email={parent?.email} />
          <Person title="Second parent or guardian" name={student.guardian2_name} relationship={student.guardian2_relationship} phone={student.guardian2_phone} />
          <Person title="Emergency contact" name={student.emergency_contact_name} phone={student.emergency_contact_phone} />
          {siblings.length > 0 && (
            <div className="rounded-2xl bg-gold-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">Brothers and sisters here</p>
              <ul className="mt-2 space-y-1">
                {siblings.map((sibling) => (
                  <li key={sibling.id}><Link to={`/${user.role}/students/${sibling.id}`} className="font-semibold text-brand-800 hover:underline">{sibling.full_name}</Link> <span className="text-sm text-brand-500">{sibling.classroom_name}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "health" && health && (
        <div className="card space-y-4">
          <p className="flex items-center gap-2 text-sm text-brand-500"><HeartPulse size={16} className="text-red-500" /> Private: only the office, the class teacher and the parents can see this.</p>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Detail label="Allergies" value={health.allergies || "None recorded"} />
            <Detail label="Medical conditions" value={health.medical_conditions || "None recorded"} />
          </dl>
        </div>
      )}

      {tab === "attendance" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card"><p className="text-sm text-brand-500">Attendance rate</p><p className="font-mono text-3xl font-semibold text-brand-800">{rate === null ? "-" : `${rate}%`}</p></div>
          <div className="card"><p className="text-sm text-brand-500">Days present</p><p className="font-mono text-3xl font-semibold text-emerald-700">{attendance.present}</p></div>
          <div className="card"><p className="text-sm text-brand-500">Days absent</p><p className="font-mono text-3xl font-semibold text-red-700">{attendance.absent}</p></div>
        </div>
      )}

      {tab === "history" && (
        <ol className="card space-y-4 border-l-2 border-brand-100 pl-6">
          {history.length === 0 && <li className="text-sm text-brand-400">No history recorded yet.</li>}
          {history.map((item) => (
            <li key={item.id} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold text-brand-800">{item.year}</span>
                <span className="font-semibold">{item.classroom_name}</span>
                <span className={`badge ${OUTCOME_STYLES[item.outcome] || "bg-brand-100 text-brand-700"}`}>{item.outcome}</span>
              </p>
              {item.note && <p className="text-sm text-brand-600">{item.note}</p>}
              {item.recorded_by && <p className="text-xs text-brand-400">Recorded by {item.recorded_by}</p>}
            </li>
          ))}
        </ol>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/50 p-4 sm:items-center" role="dialog" aria-modal="true">
          {dialog === "leave" ? (
            <form onSubmit={submitLeave} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-brand-800">{student.first_name} is leaving the school</h2>
              <p className="text-sm text-brand-500">Nothing is deleted. Marks, report cards, fees and history stay on record, and the learner can be readmitted later.</p>
              <div className="flex gap-2">
                {[["transferred", "Transferred to another school"], ["withdrawn", "Withdrawn"]].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setForm({ ...form, status: value })} className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold ${form.status === value ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-600"}`}>{label}</button>
                ))}
              </div>
              <div>
                <label className="label" htmlFor="reason">Reason</label>
                <input id="reason" className="input" placeholder="e.g. Family moved to Nakuru" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required minLength={5} />
              </div>
              <div>
                <label className="label" htmlFor="left">Last day</label>
                <input id="left" type="date" className="input" value={form.left_on} onChange={(event) => setForm({ ...form, left_on: event.target.value })} />
              </div>
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setDialog(null)}>Cancel</button>
                <button className="btn-primary">Record leaving</button>
              </div>
            </form>
          ) : (
            <form onSubmit={submitReadmit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-brand-800">Readmit {student.first_name}</h2>
              <div>
                <label className="label" htmlFor="class">Class</label>
                <select id="class" className="input" value={form.classroom_id} onChange={(event) => setForm({ ...form, classroom_id: event.target.value })} required>
                  <option value="">Choose a class</option>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setDialog(null)}>Cancel</button>
                <button className="btn-primary">Readmit</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
