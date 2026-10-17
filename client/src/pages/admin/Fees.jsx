import { ChevronDown, Search, Send, Smartphone, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import SmsPreview from "../../components/SmsPreview";
import StatCard from "../../components/StatCard";
import { formatKes } from "../../constants";
import { feesBase } from "../../roles";

export default function Fees() {
  const role = useSelector((state) => state.auth.user.role);
  const base = feesBase(role);
  const readOnly = role === "director";
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [closed, setClosed] = useState([]);
  const [sms, setSms] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const picked = params.get("class") || "";

  useEffect(() => {
    Promise.all([api.get("/fees"), api.get("/classes")]).then(([balances, classList]) => {
      setData(balances.data);
      setClasses(classList.data.map((item) => item.name));
    });
  }, []);

  const toggle = (id) => setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  const pick = (name) => setParams(name ? { class: name } : {});

  async function sendReminders(ids) {
    setSending(true);
    setError(null);
    try {
      const { data: result } = await api.post("/fees/remind", { student_ids: ids });
      setSms(result.sms);
      setSelected([]);
    } catch (err) {
      setError(errorMessage(err));
    }
    setSending(false);
  }

  if (!data) return <Loader />;

  const words = search.trim().toLowerCase();
  const matching = data.students.filter((student) => !words || `${student.full_name} ${student.admission_number} ${student.parent_name || ""}`.toLowerCase().includes(words));
  const order = [...classes, ...new Set(data.students.map((student) => student.classroom_name || "No class").filter((name) => !classes.includes(name)))];
  const groups = order
    .map((name) => {
      const students = matching.filter((student) => (student.classroom_name || "No class") === name).sort((a, b) => b.fee_balance - a.fee_balance);
      return { name, students, total: students.reduce((sum, student) => sum + student.fee_balance, 0) };
    })
    .filter((group) => group.students.length && (!picked || group.name === picked));
  const perClass = Object.fromEntries(order.map((name) => [name, data.students.filter((student) => (student.classroom_name || "No class") === name)]));
  const visibleIds = groups.flatMap((group) => group.students.map((student) => student.id));
  const shownTotal = groups.reduce((sum, group) => sum + group.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Fee balances</h1>
        <p className="text-brand-500">Who still owes, class by class. Remind parents by SMS or send them an M-Pesa prompt.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={Wallet} label={picked ? `Outstanding in ${picked}` : "Outstanding"} value={formatKes(picked ? shownTotal : data.total)} />
        <StatCard icon={Send} label="Learners with balance" value={picked ? visibleIds.length : data.students.length} />
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2">
          {["", ...order.filter((name) => perClass[name]?.length || classes.includes(name))].map((name) => {
            const owing = name ? perClass[name] || [] : data.students;
            const active = picked === name;
            return (
              <button key={name || "all"} type="button" onClick={() => pick(name)} className={`rounded-2xl px-4 py-2.5 text-left text-sm font-semibold ${active ? "bg-brand-700 text-white" : "bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"}`}>
                {name || "All classes"}
                <span className={`block text-xs font-normal ${active ? "text-brand-100" : owing.length ? "text-amber-700" : "text-emerald-700"}`}>{owing.length ? `${owing.length} · ${formatKes(owing.reduce((sum, student) => sum + student.fee_balance, 0))}` : "All paid"}</span>
              </button>
            );
          })}
        </div>
      </div>

      {sms && <SmsPreview sms={sms} onClose={() => setSms(null)} />}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pl-10" placeholder="Search learner or parent" aria-label="Search learner or parent" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        {!readOnly && (
          <button className="btn-gold" onClick={() => sendReminders(selected.length ? selected : picked || words ? visibleIds : null)} disabled={sending || !visibleIds.length}>
            <Send size={16} />
            {sending ? "Sending..." : selected.length ? `Remind ${selected.length} selected` : picked ? `Remind all in ${picked}` : words ? `Remind these ${visibleIds.length}` : "Remind all with balance"}
          </button>
        )}
      </div>

      {groups.length === 0 && <div className="card py-10 text-center text-sm text-brand-500">{picked ? `Everyone in ${picked} has paid in full. 🎉` : "No balances found."}</div>}

      {groups.map((group) => {
        const ids = group.students.map((student) => student.id);
        const allPicked = ids.every((id) => selected.includes(id));
        const isClosed = closed.includes(group.name);
        return (
          <section key={group.name} className="card overflow-hidden p-0">
            <div className="flex items-center gap-3 border-b border-brand-50 bg-brand-50/50 px-5 py-3">
              <button type="button" onClick={() => setClosed(isClosed ? closed.filter((name) => name !== group.name) : [...closed, group.name])} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={!isClosed}>
                <ChevronDown size={18} className={`shrink-0 text-brand-400 transition ${isClosed ? "-rotate-90" : ""}`} />
                <span className="font-semibold text-brand-800">{group.name}</span>
                <span className="truncate text-sm text-brand-500">{group.students.length} owing · <span className="font-mono font-semibold text-amber-700">{formatKes(group.total)}</span></span>
              </button>
              {!readOnly && (
                <button type="button" onClick={() => setSelected(allPicked ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])])} className="shrink-0 text-sm font-semibold text-brand-600 hover:underline">
                  {allPicked ? "Clear" : "Select class"}
                </button>
              )}
            </div>
            {!isClosed && (
              <ul className="divide-y divide-brand-50">
                {group.students.map((student) => (
                  <li key={student.id} className="flex items-center gap-3 px-5 py-3">
                    {!readOnly && <input type="checkbox" checked={selected.includes(student.id)} onChange={() => toggle(student.id)} className="h-5 w-5 shrink-0 accent-brand-700" aria-label={`Select ${student.full_name}`} />}
                    <div className="min-w-0 flex-1">
                      <Link to={`${base}/students/${student.id}`} className="font-semibold text-brand-800 hover:underline">{student.full_name}</Link>
                      <p className="truncate text-xs text-brand-400"><span className="font-mono">{student.admission_number}</span>{student.parent_name ? ` · ${student.parent_name}` : ""}{student.parent_phone ? ` · ${student.parent_phone}` : ""}</p>
                    </div>
                    <span className="shrink-0 font-mono font-semibold text-amber-700">{formatKes(student.fee_balance)}</span>
                    {!readOnly && (
                      <Link to={`${base}/prompt?student=${student.id}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-emerald-700 hover:bg-emerald-50" aria-label={`Send M-Pesa prompt for ${student.full_name}`} title="Send M-Pesa prompt">
                        <Smartphone size={18} />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
