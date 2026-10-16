import { format } from "date-fns";
import { CheckCircle2, FlaskConical, Hash, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import { formatKes } from "../../constants";
import { feesBase } from "../../roles";

const TABS = [
  { key: "unmatched", label: "Needs a learner" },
  { key: "matched", label: "Matched" },
  { key: "all", label: "All" },
];

function MatchLearner({ receipt, onDone }) {
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (search.trim().length < 2) {
      setMatches([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      api.get("/students", { params: { search } }).then(({ data }) => setMatches(data.slice(0, 6)));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  async function pick(student) {
    try {
      const { data } = await api.post(`/paybill/receipts/${receipt.id}/assign`, { student_id: student.id });
      onDone(data);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" />
        <input className="input pl-9" placeholder="Type the learner's name or admission number" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Find learner" />
      </div>
      {matches.length > 0 && (
        <ul className="divide-y divide-brand-50 rounded-xl ring-1 ring-brand-100">
          {matches.map((student) => (
            <li key={student.id}>
              <button className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50" onClick={() => pick(student)}>
                <span className="flex-1 font-semibold text-brand-800">{student.full_name}</span>
                <span className="font-mono text-xs text-brand-400">{student.admission_number}</span>
                <span className="text-xs text-brand-500">{student.classroom_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}

export default function Paybill() {
  const role = useSelector((state) => state.auth.user.role);
  const base = feesBase(role);
  const readOnly = role === "director";
  const [tab, setTab] = useState("unmatched");
  const [data, setData] = useState(null);
  const [matching, setMatching] = useState(null);
  const [demo, setDemo] = useState({ account: "SAK-2021-0008", amount: "2500", name: "Mary Mutiso" });
  const [notice, setNotice] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setData(null);
    api.get("/paybill/receipts", { params: { status: tab } }).then(({ data: result }) => active && setData(result));
    return () => {
      active = false;
    };
  }, [tab, refresh]);

  function matched(result) {
    setMatching(null);
    setNotice({ type: "success", text: `Matched to ${result.receipt.student_name}. Receipt ${result.receipt.receipt_number}.`, sms: result.sms?.message });
    setRefresh(refresh + 1);
  }

  async function simulate(event) {
    event.preventDefault();
    try {
      const { data: result } = await api.post("/paybill/simulate", { ...demo, amount: Number(demo.amount) });
      const receipt = result.receipt;
      setNotice(receipt.matched
        ? { type: "success", text: `${receipt.trans_id}: ${formatKes(receipt.amount)} matched to ${receipt.student_name} automatically. Receipt ${receipt.receipt_number}.`, sms: result.sms?.message }
        : { type: "info", text: `${receipt.trans_id}: no learner has account "${receipt.account}", so it is waiting below for you to match.` });
      setRefresh(refresh + 1);
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err) });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">M-Pesa Paybill</h1>
        <p className="mt-2 text-brand-500">Parents who pay through the Paybill with the admission number as the account are matched automatically. Anything else waits here for you.</p>
      </div>

      {data?.simulation && !readOnly && (
        <form onSubmit={simulate} className="card flex flex-wrap items-end gap-3 border-dashed">
          <div className="w-full">
            <p className="flex items-center gap-2 font-semibold text-brand-800"><FlaskConical size={18} className="text-gold-600" /> Try it: pretend a parent paid through the Paybill</p>
            <p className="text-sm text-brand-500">Demo only. Use a real admission number to see it match, or type anything else to see it wait for you.</p>
          </div>
          <div>
            <label className="label" htmlFor="demo-account">Account typed</label>
            <input id="demo-account" className="input w-44 font-mono" value={demo.account} onChange={(event) => setDemo({ ...demo, account: event.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="demo-amount">Amount</label>
            <input id="demo-amount" inputMode="numeric" className="input w-28 font-mono" value={demo.amount} onChange={(event) => setDemo({ ...demo, amount: event.target.value.replace(/\D/g, "") })} />
          </div>
          <div>
            <label className="label" htmlFor="demo-name">Payer name</label>
            <input id="demo-name" className="input w-44" value={demo.name} onChange={(event) => setDemo({ ...demo, name: event.target.value })} />
          </div>
          <button className="btn-gold" disabled={!demo.account || !demo.amount}>Send demo payment</button>
        </form>
      )}

      {notice && (
        <div className={`rounded-2xl px-5 py-4 text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-800" : notice.type === "info" ? "bg-sky-50 text-sky-800" : "bg-red-50 text-red-700"}`}>
          <p className="font-semibold">{notice.text}</p>
          {notice.sms && <p className="mt-1">SMS to the parent: {notice.sms}</p>}
        </div>
      )}

      <div className="flex gap-2">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-brand-700 text-white" : "bg-white text-brand-600 ring-1 ring-brand-100 hover:bg-brand-50"}`}>
            {label}{key === "unmatched" && data?.unmatched > 0 ? ` (${data.unmatched})` : ""}
          </button>
        ))}
      </div>

      {!data ? <Loader /> : data.receipts.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-12 text-center text-brand-500">
          <CheckCircle2 size={32} className="text-emerald-400" />
          {tab === "unmatched" ? "Every Paybill payment is matched to a learner." : "No Paybill payments yet."}
        </div>
      ) : (
        <div className="card divide-y divide-brand-50 p-0">
          {data.receipts.map((receipt) => (
            <div key={receipt.id} className="space-y-3 px-5 py-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span className="w-32 text-brand-500">{format(new Date(receipt.received_at), "d MMM yyyy, HH:mm")}</span>
                <span className="font-mono text-xs">{receipt.trans_id}</span>
                <span className="flex-1">{receipt.payer_name || "Unknown payer"} <span className="text-brand-400">· account typed <span className="font-mono text-brand-700">&quot;{receipt.account || "blank"}&quot;</span></span></span>
                <span className="font-mono font-semibold">{formatKes(receipt.amount)}</span>
              </div>
              {receipt.matched ? (
                <p className="flex flex-wrap items-center gap-2 text-sm text-emerald-700">
                  <Hash size={14} />
                  <Link to={`${base}/students/${receipt.student_id}`} className="font-semibold hover:underline">{receipt.student_name}</Link>
                  <span className="font-mono text-xs">{receipt.admission_number}</span>
                  <Link to={`${base}/receipts/${receipt.payment_id}`} className="font-mono text-xs hover:underline">{receipt.receipt_number}</Link>
                  <span className="text-xs text-brand-400">{receipt.assigned_by}</span>
                </p>
              ) : readOnly ? (
                <p className="text-sm text-amber-700">Waiting for the bursar to match it to a learner.</p>
              ) : matching === receipt.id ? (
                <MatchLearner receipt={receipt} onDone={matched} />
              ) : (
                <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setMatching(receipt.id)}>Match to a learner</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
