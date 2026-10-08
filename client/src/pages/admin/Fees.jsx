import { Search, Send, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import SmsPreview from "../../components/SmsPreview";
import StatCard from "../../components/StatCard";
import { formatKes } from "../../constants";

export default function Fees() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [sms, setSms] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get("/fees").then(({ data: result }) => setData(result));
  }, []);

  function toggle(id) {
    setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  async function sendReminders() {
    setSending(true);
    setError(null);
    try {
      const { data: result } = await api.post("/fees/remind", { student_ids: selected.length ? selected : null });
      setSms(result.sms);
      setSelected([]);
    } catch (err) {
      setError(errorMessage(err));
    }
    setSending(false);
  }

  if (!data) return <Loader />;

  const term = search.toLowerCase();
  const students = data.students.filter(
    (student) => student.full_name.toLowerCase().includes(term) || student.admission_number.toLowerCase().includes(term)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Fee Balances</h1>
        <p className="text-brand-500">Remind parents by SMS with their child&apos;s balance and how to pay.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={Wallet} label="Outstanding" value={formatKes(data.total)} />
        <StatCard icon={Send} label="Learners with balance" value={data.students.length} />
      </div>

      {sms && <SmsPreview sms={sms} onClose={() => setSms(null)} />}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pl-10" placeholder="Search learner" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <button className="btn-gold" onClick={sendReminders} disabled={sending}>
          <Send size={16} />
          {sending ? "Sending..." : selected.length ? `Remind ${selected.length} selected` : "Remind all with balance"}
        </button>
      </div>

      <div className="card divide-y divide-brand-100 p-0">
        {students.map((student) => (
          <label key={student.id} className="flex cursor-pointer items-center gap-4 px-5 py-3 hover:bg-brand-50">
            <input type="checkbox" checked={selected.includes(student.id)} onChange={() => toggle(student.id)} className="h-4 w-4 accent-brand-700" />
            <div className="flex-1">
              <p className="font-semibold">{student.full_name}</p>
              <p className="text-xs text-brand-400">
                <span className="font-mono">{student.admission_number}</span> · {student.classroom_name} · {student.parent_name}
              </p>
            </div>
            <span className="font-mono font-semibold text-amber-700">{formatKes(student.fee_balance)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
