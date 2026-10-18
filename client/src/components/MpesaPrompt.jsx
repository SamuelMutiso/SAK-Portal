import { CheckCircle2, Loader2, ReceiptText, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { formatKes } from "../constants";
import { feesBase } from "../roles";

export default function MpesaPrompt({ student, balance, defaultPhone, onPaid, staff = false }) {
  const [form, setForm] = useState({ amount: balance > 0 ? String(balance) : "", phone: defaultPhone || "" });
  const [waiting, setWaiting] = useState(null);
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [paidPayment, setPaidPayment] = useState(null);
  const role = useSelector((state) => state.auth.user.role);
  const receiptPath = (payment) => (role === "parent" ? `/parent/receipts/${payment.id}` : `${feesBase(role)}/receipts/${payment.id}`);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    setForm((current) => ({ ...current, amount: balance > 0 ? String(balance) : "" }));
  }, [balance]);

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
        setStatus(null);
        setPaidPayment(current);
        onPaid(current);
      } else if (current.status === "failed") {
        setWaiting(null);
        setStatus({ type: "error", text: `${current.note || "M-Pesa did not complete the payment."} No money was taken and no receipt was issued.` });
      } else if (tries >= 30) {
        setWaiting(null);
        setStatus({ type: "info", text: "No answer from M-Pesa yet. If the PIN was entered, the receipt will appear within a few minutes." });
      } else {
        watch(payment, tries + 1);
      }
    }, 4000);
  }

  async function send(event) {
    event.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      const { data } = await api.post("/payments/stk", { student_id: student.id, amount: Number(form.amount), phone: form.phone });
      if (data.simulated) {
        setPaidPayment(data.payment);
        onPaid(data.payment);
      } else {
        setWaiting(data.payment);
        watch(data.payment);
      }
    } catch (error) {
      setStatus({ type: "error", text: errorMessage(error) });
    }
    setSending(false);
  }

  const phone = waiting ? waiting.phone.replace(/^254/, "0") : "";

  if (paidPayment) {
    return (
      <div className="card space-y-3 border-emerald-200 bg-emerald-50" role="status">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={26} />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-emerald-800">Payment received</p>
            <p className="text-sm text-emerald-700">
              {formatKes(paidPayment.amount)} for {student.first_name}. Receipt <span className="font-mono font-semibold">{paidPayment.receipt_number}</span>
              {paidPayment.receipt ? <> · M-Pesa <span className="font-mono font-semibold">{paidPayment.receipt}</span></> : null}.
              {" "}{staff ? "The parent gets the receipt by SMS." : "A copy is on its way by SMS."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={receiptPath(paidPayment)} className="btn-primary"><ReceiptText size={16} /> View receipt</Link>
          <button type="button" onClick={() => setPaidPayment(null)} className="btn-ghost">Make another payment</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {waiting ? (
        <div className="card flex items-start gap-4 border-emerald-200 bg-emerald-50">
          <Loader2 className="mt-1 shrink-0 animate-spin text-emerald-600" />
          <div className="space-y-1">
            <p className="font-semibold text-emerald-800">{staff ? "Waiting for the parent" : "Check your phone"}</p>
            <p className="text-sm text-emerald-700">
              {staff
                ? `An M-Pesa prompt for ${formatKes(waiting.amount)} has been sent to ${phone}. Ask the parent to enter their PIN. This updates by itself.`
                : `An M-Pesa prompt for ${formatKes(waiting.amount)} has been sent to ${phone}. Enter your PIN to pay. This page updates by itself.`}
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={send} className="card space-y-3">
          <h3 className="flex items-center gap-2 font-semibold text-brand-800"><Smartphone size={18} /> {staff ? "Send an M-Pesa prompt to the parent" : "Pay with M-Pesa"}</h3>
          <p className="text-sm text-brand-500">
            {staff
              ? "For parents at the office with an ordinary phone. They only enter their PIN."
              : "You will get a prompt on your phone to enter your M-Pesa PIN."} Account: <span className="font-mono">{student.admission_number}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor={`stk-amount-${student.id}`}>Amount (KES)</label>
              <input id={`stk-amount-${student.id}`} inputMode="numeric" className="input font-mono" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/\D/g, "") })} required />
            </div>
            <div>
              <label className="label" htmlFor={`stk-phone-${student.id}`}>M-Pesa number</label>
              <input id={`stk-phone-${student.id}`} inputMode="tel" className="input font-mono" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
            </div>
          </div>
          <button className="btn w-full bg-emerald-600 py-3 text-white hover:bg-emerald-700" disabled={sending || !form.amount}>
            {sending ? "Sending prompt..." : `${staff ? "Send prompt for" : "Pay"} ${form.amount ? formatKes(form.amount) : ""}`}
          </button>
        </form>
      )}
      {status && (
        <p className={`rounded-xl px-4 py-3 text-sm ${status.type === "success" ? "bg-emerald-50 text-emerald-700" : status.type === "info" ? "bg-sky-50 text-sky-800" : "bg-red-50 text-red-700"}`}>{status.text}</p>
      )}
    </div>
  );
}
