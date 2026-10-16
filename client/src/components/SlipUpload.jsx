import { format } from "date-fns";
import { Landmark, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../api/client";
import { formatKes } from "../constants";

const BANKS = ["Equity Bank", "KCB", "Co-operative Bank", "Family Bank", "NCBA", "Absa", "Stanbic", "I&M Bank"];
const STYLES = { pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-700" };
const LABELS = { pending: "Waiting for the bursar", approved: "Confirmed", rejected: "Not confirmed" };
const today = () => new Date().toISOString().slice(0, 10);

export default function SlipUpload({ student }) {
  const [slips, setSlips] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", bank_name: "Equity Bank", reference: "", paid_on: today(), file: null });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/fees/students/${student.id}/slips`).then(({ data }) => setSlips(data));
  }, [student.id]);

  async function submit(event) {
    event.preventDefault();
    const body = new FormData();
    body.append("student_id", student.id);
    body.append("amount", form.amount);
    body.append("bank_name", form.bank_name);
    body.append("reference", form.reference);
    body.append("paid_on", form.paid_on);
    body.append("slip", form.file);
    setSaving(true);
    try {
      const { data } = await api.post("/fees/slips", body);
      setSlips([data, ...slips]);
      setOpen(false);
      setForm({ amount: "", bank_name: "Equity Bank", reference: "", paid_on: today(), file: null });
      setMessage({ type: "success", text: "Slip sent. The bursar will check it against the bank statement, and you will get an SMS receipt once it is confirmed." });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
    setSaving(false);
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <Landmark size={18} className="text-brand-500" />
        <h3 className="flex-1 font-semibold text-brand-800">Paid at the bank?</h3>
        {!open && <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setOpen(true)}><Upload size={15} /> Send the slip</button>}
      </div>
      {!open && <p className="text-sm text-brand-500">Take a photo of the deposit slip and send it here. No need to bring it to the office.</p>}
      {open && (
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="slip-amount">Amount (KES)</label>
              <input id="slip-amount" inputMode="numeric" className="input font-mono" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/\D/g, "") })} required />
            </div>
            <div>
              <label className="label" htmlFor="slip-date">Date on the slip</label>
              <input id="slip-date" type="date" max={today()} className="input" value={form.paid_on} onChange={(event) => setForm({ ...form, paid_on: event.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="slip-bank">Bank</label>
              <select id="slip-bank" className="input" value={form.bank_name} onChange={(event) => setForm({ ...form, bank_name: event.target.value })}>
                {BANKS.map((bank) => <option key={bank}>{bank}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="slip-ref">Transaction number</label>
              <input id="slip-ref" className="input font-mono uppercase" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value.toUpperCase() })} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="slip-file">Photo or PDF of the slip</label>
            <input id="slip-file" type="file" accept="image/*,application/pdf" capture="environment" className="block w-full text-sm text-brand-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700" onChange={(event) => setForm({ ...form, file: event.target.files[0] || null })} required />
          </div>
          <p className="text-xs text-brand-400">Account: <span className="font-mono">{student.admission_number}</span>. Write it on the slip when you pay.</p>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={saving || !form.file}>{saving ? "Sending..." : "Send slip"}</button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
      {message && <p className={`rounded-xl px-3 py-2 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
      {slips.length > 0 && (
        <ul className="divide-y divide-brand-50 border-t border-brand-50 pt-1 text-sm">
          {slips.map((slip) => (
            <li key={slip.id} className="py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-20 text-xs text-brand-500">{format(new Date(slip.paid_on), "d MMM yy")}</span>
                <span className="flex-1 font-mono text-xs">{slip.reference}</span>
                <span className="font-mono font-semibold">{formatKes(slip.amount)}</span>
                <span className={`badge ${STYLES[slip.status]}`}>{LABELS[slip.status]}</span>
              </div>
              {slip.status === "rejected" && <p className="mt-1 text-xs text-red-700">{slip.rejection_reason}</p>}
              {slip.status === "approved" && slip.receipt_number && <p className="mt-1 text-xs text-emerald-700">Receipt {slip.receipt_number}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
