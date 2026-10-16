import { format } from "date-fns";
import { Loader2, Smartphone, Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../../api/client";
import InvoiceCard from "../../../components/InvoiceCard";
import Loader from "../../../components/Loader";
import SlipUpload from "../../../components/SlipUpload";
import { formatKes } from "../../../constants";
import { METHOD_STYLES, balanceLabel } from "../../../fees";

export default function Fees({ student, onBalanceChange }) {
  const user = useSelector((state) => state.auth.user);
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ amount: "", phone: user.phone });
  const [status, setStatus] = useState(null);
  const [paying, setPaying] = useState(false);

  const [waiting, setWaiting] = useState(null);
  const timer = useRef(null);

  const reload = useCallback(async () => {
    const { data: result } = await api.get(`/fees/students/${student.id}/statement`);
    setData(result);
    setForm((current) => ({ ...current, amount: result.balance > 0 ? String(result.balance) : "" }));
    return result;
  }, [student.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function watch(payment, tries = 0) {
    timer.current = setTimeout(async () => {
      let current = payment;
      try {
        current = (await api.get(`/payments/${payment.id}`)).data;
      } catch {
        current = payment;
      }
      if (current.status === "completed") {
        setWaiting(null);
        const fresh = await reload();
        onBalanceChange(fresh.balance);
        setStatus({ type: "success", text: `Payment received. Receipt ${current.receipt_number}${current.receipt ? ` (M-Pesa ${current.receipt})` : ""}. An SMS is on its way.` });
      } else if (current.status === "failed") {
        setWaiting(null);
        setStatus({ type: "error", text: current.note || "M-Pesa did not complete the payment." });
      } else if (tries >= 30) {
        setWaiting(null);
        setStatus({ type: "info", text: "We have not heard back from M-Pesa yet. If you entered your PIN, the receipt will appear below within a few minutes." });
      } else {
        watch(payment, tries + 1);
      }
    }, 4000);
  }

  async function handlePay(event) {
    event.preventDefault();
    setPaying(true);
    setStatus(null);
    try {
      const { data: result } = await api.post("/payments/stk", { student_id: student.id, amount: Number(form.amount), phone: form.phone });
      if (result.simulated) {
        const fresh = await reload();
        onBalanceChange(fresh.balance);
        setStatus({ type: "success", text: `Demo payment of ${formatKes(result.payment.amount)} recorded. Receipt ${result.payment.receipt_number}.` });
      } else {
        setWaiting(result.payment);
        watch(result.payment);
      }
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

        {waiting && (
          <div className="card flex items-start gap-4 border-emerald-200 bg-emerald-50">
            <Loader2 className="mt-1 animate-spin text-emerald-600" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-800">Check your phone</p>
              <p className="text-sm text-emerald-700">An M-Pesa prompt for {formatKes(waiting.amount)} has been sent to {waiting.phone.replace(/^254/, "0")}. Enter your PIN to pay. This page updates by itself.</p>
            </div>
          </div>
        )}

        {data.balance > 0 && !waiting && (
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
          <p className={`rounded-xl px-4 py-3 text-sm ${status.type === "success" ? "bg-emerald-50 text-emerald-700" : status.type === "info" ? "bg-sky-50 text-sky-800" : "bg-red-50 text-red-700"}`}>{status.text}</p>
        )}
        <SlipUpload student={student} />
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
                <Link to={payment.receipt_number ? `/parent/receipts/${payment.id}` : "#"} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-brand-50">
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
