import { format } from "date-fns";
import { Check, Landmark, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import PrivateFile from "../../components/PrivateFile";
import { formatKes } from "../../constants";
import { feesBase } from "../../roles";

const TABS = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function SlipCard({ slip, readOnly, base, onDone }) {
  const [amount, setAmount] = useState(String(slip.amount));
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function act(path, body) {
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post(`/fees/slips/${slip.id}/${path}`, body);
      onDone(data);
    } catch (err) {
      setError(errorMessage(err));
    }
    setSaving(false);
  }

  return (
    <div className="card grid gap-5 md:grid-cols-[220px_1fr]">
      <PrivateFile path={`/fees/slips/${slip.id}/file`} alt={`Bank slip ${slip.reference}`} className="h-64 w-full bg-white" />
      <div className="space-y-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex-1">
            <Link to={`${base}/students/${slip.student_id}`} className="font-semibold text-brand-800 hover:underline">{slip.student_name}</Link>
            <p className="text-xs text-brand-500">{slip.admission_number} · {slip.classroom_name} · owes {formatKes(slip.balance)}</p>
          </div>
          <p className="font-mono text-xl font-bold text-brand-800">{formatKes(slip.amount)}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-brand-400">Bank</dt><dd>{slip.bank_name}</dd></div>
          <div><dt className="text-xs text-brand-400">Reference</dt><dd className="font-mono">{slip.reference}</dd></div>
          <div><dt className="text-xs text-brand-400">Paid on</dt><dd>{format(new Date(slip.paid_on), "d MMM yyyy")}</dd></div>
          <div><dt className="text-xs text-brand-400">Sent by</dt><dd>{slip.submitted_by}</dd></div>
        </dl>
        {slip.note && <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-600">{slip.note}</p>}

        {slip.status === "approved" && (
          <p className="text-sm text-emerald-700">Approved by {slip.reviewed_by} on {format(new Date(slip.reviewed_at), "d MMM yyyy")}. <Link to={`${base}/receipts/${slip.payment_id}`} className="font-semibold underline">Receipt {slip.receipt_number}</Link></p>
        )}
        {slip.status === "rejected" && (
          <p className="text-sm text-red-700">Rejected by {slip.reviewed_by} on {format(new Date(slip.reviewed_at), "d MMM yyyy")}: {slip.rejection_reason}</p>
        )}

        {slip.status === "pending" && !readOnly && !rejecting && (
          <div className="flex flex-wrap items-end gap-2 border-t border-brand-50 pt-3">
            <div>
              <label className="label" htmlFor={`amount-${slip.id}`}>Amount on the bank statement</label>
              <input id={`amount-${slip.id}`} inputMode="numeric" className="input w-40 font-mono" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} />
            </div>
            <button className="btn-primary" disabled={saving || !amount} onClick={() => act("approve", { amount: Number(amount) })}><Check size={16} /> Approve and send receipt</button>
            <button className="btn-ghost" onClick={() => setRejecting(true)}><X size={16} /> Reject</button>
          </div>
        )}
        {slip.status === "pending" && !readOnly && rejecting && (
          <div className="space-y-2 border-t border-brand-50 pt-3">
            <label className="label" htmlFor={`reason-${slip.id}`}>Why can it not be confirmed? The parent gets this by SMS.</label>
            <input id={`reason-${slip.id}`} className="input" placeholder="Not on the bank statement" value={reason} onChange={(event) => setReason(event.target.value)} />
            <div className="flex gap-2">
              <button className="btn-primary bg-red-600 hover:bg-red-700" disabled={saving || reason.trim().length < 3} onClick={() => act("reject", { reason: reason.trim() })}>Reject slip</button>
              <button className="btn-ghost" onClick={() => setRejecting(false)}>Back</button>
            </div>
          </div>
        )}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}

export default function Slips() {
  const role = useSelector((state) => state.auth.user.role);
  const base = feesBase(role);
  const readOnly = role === "director";
  const [tab, setTab] = useState("pending");
  const [data, setData] = useState(null);
  const [sms, setSms] = useState(null);

  useEffect(() => {
    let active = true;
    setData(null);
    api.get("/fees/slips", { params: { status: tab } }).then(({ data: result }) => active && setData(result));
    return () => {
      active = false;
    };
  }, [tab]);

  function done(result) {
    setSms(result.sms);
    setData({ slips: data.slips.filter((slip) => slip.id !== result.slip.id), pending: data.pending - 1 });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Bank slips</h1>
        <p className="mt-2 text-brand-500">Parents who paid at the bank send a photo of the slip. Check each one against the bank statement before approving.</p>
      </div>

      <div className="flex gap-2">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === key ? "bg-brand-700 text-white" : "bg-white text-brand-600 ring-1 ring-brand-100 hover:bg-brand-50"}`}>
            {label}{key === "pending" && data?.pending > 0 ? ` (${data.pending})` : ""}
          </button>
        ))}
      </div>

      {sms && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <p className="font-semibold">SMS to the parent{sms.mode === "preview" ? " (preview, not sent)" : ""}</p>
          <p className="mt-1">{sms.message}</p>
        </div>
      )}

      {!data ? <Loader /> : data.slips.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-12 text-center text-brand-500">
          <Landmark size={32} className="text-brand-300" />
          {tab === "pending" ? "No slips waiting. All caught up." : "Nothing here yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {data.slips.map((slip) => <SlipCard key={slip.id} slip={slip} readOnly={readOnly} base={base} onDone={done} />)}
        </div>
      )}
    </div>
  );
}
