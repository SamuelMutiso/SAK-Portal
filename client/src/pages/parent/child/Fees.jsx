import { format } from "date-fns";
import { Smartphone, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../../api/client";
import InvoiceCard from "../../../components/InvoiceCard";
import Loader from "../../../components/Loader";
import { formatKes } from "../../../constants";
import { METHOD_STYLES, balanceLabel } from "../../../fees";

export default function Fees({ student, onBalanceChange }) {
  const user = useSelector((state) => state.auth.user);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ amount: "", phone: user.phone });
  const [status, setStatus] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api.get(`/fees/students/${student.id}/statement`).then(({ data: result }) => {
      setData(result);
      setForm((current) => ({ ...current, amount: result.balance ? String(result.balance) : "" }));
    });
  }, [student.id]);

  async function handlePay(event) {
    event.preventDefault();
    setPaying(true);
    setStatus(null);
    try {
      const { data: result } = await api.post("/payments/stk", { student_id: student.id, amount: Number(form.amount), phone: form.phone });
      const fresh = await api.get(`/fees/students/${student.id}/statement`);
      setData(fresh.data);
      onBalanceChange(fresh.data.balance);
      setForm({ ...form, amount: fresh.data.balance ? String(fresh.data.balance) : "" });
      setStatus({
        type: "success",
        text: result.simulated
          ? `Demo payment of ${formatKes(result.payment.amount)} recorded. Receipt ${result.payment.receipt_number}.`
          : `Check your phone and enter your M-Pesa PIN to pay ${formatKes(result.payment.amount)}.`,
      });
    } catch (error) {
      setStatus({ type: "error", text: errorMessage(error) });
    }
    setPaying(false);
  }

  if (!data) return <Loader />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className={`card flex items-center gap-4 ${data.balance > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <Wallet className={data.balance > 0 ? "text-amber-600" : "text-emerald-600"} />
          <div>
            <p className="text-sm font-semibold text-brand-500">{balanceLabel(data.balance)}</p>
            <p className="font-mono text-2xl font-semibold text-brand-800">{formatKes(Math.abs(data.balance))}</p>
          </div>
        </div>

        {data.balance > 0 && (
          <form onSubmit={handlePay} className="card space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-brand-800"><Smartphone size={18} /> Pay with M-Pesa</h3>
            <p className="text-sm text-brand-500">You will get a prompt on your phone to enter your M-Pesa PIN. Account: <span className="font-mono">{student.admission_number}</span></p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="amount">Amount (KES)</label>
                <input id="amount" inputMode="numeric" className="input font-mono" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/\D/g, "") })} required />
              </div>
              <div>
                <label className="label" htmlFor="phone">M-Pesa number</label>
                <input id="phone" className="input font-mono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
              </div>
            </div>
            <button className="btn w-full bg-emerald-600 py-3 text-white hover:bg-emerald-700" disabled={paying}>
              {paying ? "Sending prompt..." : `Pay ${form.amount ? formatKes(form.amount) : ""}`}
            </button>
          </form>
        )}
        {status && (
          <p className={`rounded-xl px-4 py-3 text-sm ${status.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{status.text}</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-brand-800">Invoices</h3>
          {data.invoices.length === 0 && <p className="card text-sm text-brand-400">No invoices yet.</p>}
          {data.invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} />)}
        </div>
        <div className="card p-0">
          <h3 className="px-5 pt-5 font-semibold text-brand-800">Payments and receipts</h3>
          <ul className="mt-2 divide-y divide-brand-50">
            {data.payments.length === 0 && <li className="px-5 py-3 text-sm text-brand-400">No payments yet.</li>}
            {data.payments.map((payment) => (
              <li key={payment.id}>
                <Link to={`/parent/receipts/${payment.id}`} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-brand-50">
                  <span className="w-20 text-xs text-brand-500">{payment.paid_on ? format(new Date(payment.paid_on), "d MMM yy") : payment.status}</span>
                  <span className={`badge ${METHOD_STYLES[payment.method] || "bg-brand-100 text-brand-600"}`}>{payment.method}</span>
                  <span className="flex-1 font-mono text-xs text-brand-400">{payment.receipt_number || payment.status}</span>
                  <span className={`font-mono font-semibold ${payment.status === "reversed" ? "line-through text-brand-400" : ""}`}>{formatKes(payment.amount)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
