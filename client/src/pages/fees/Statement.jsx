import { format } from "date-fns";
import { ArrowLeft, Banknote, FilePlus2, Printer, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import InvoiceCard from "../../components/InvoiceCard";
import Loader from "../../components/Loader";
import { TERM, formatKes } from "../../constants";
import { METHOD_STYLES, balanceLabel } from "../../fees";
import { feesBase } from "../../roles";

export default function Statement() {
  const { id } = useParams();
  const role = useSelector((state) => state.auth.user.role);
  const base = feesBase(role);
  const canEdit = role === "admin" || role === "bursar";
  const [data, setData] = useState(null);
  const [discounts, setDiscounts] = useState([]);
  const [editingDiscounts, setEditingDiscounts] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState(null);

  function load() {
    api.get(`/fees/students/${id}/statement`).then(({ data: result }) => setData(result));
  }

  useEffect(load, [id]);
  useEffect(() => {
    if (canEdit) api.get("/fees/discounts").then(({ data: result }) => setDiscounts(result));
  }, [canEdit]);

  async function invoiceNow() {
    try {
      await api.post(`/fees/students/${id}/invoice`, { term: TERM });
      setMessage({ type: "success", text: `Invoice for ${TERM} created.` });
      load();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  async function toggleDiscount(discountId) {
    const current = data.discounts.map((item) => item.id);
    const next = current.includes(discountId) ? current.filter((item) => item !== discountId) : [...current, discountId];
    const { data: saved } = await api.put(`/fees/students/${id}/discounts`, { discount_ids: next });
    setData({ ...data, discounts: saved });
  }

  async function cancelInvoice(event) {
    event.preventDefault();
    try {
      await api.post(`/fees/invoices/${cancelling.id}/cancel`, { reason });
      setCancelling(null);
      setReason("");
      load();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  if (!data) return <Loader />;
  const { student, balance } = data;
  const hasCurrent = data.invoices.some((invoice) => invoice.term === TERM && invoice.status !== "cancelled");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link to={base} className="inline-flex flex-1 items-center gap-2 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft size={16} /> Fees</Link>
        <button className="btn-ghost" onClick={() => window.print()}><Printer size={16} /> Print statement</button>
        {canEdit && <Link to={`${base}/record?student=${student.id}`} className="btn-gold"><Banknote size={16} /> Record payment</Link>}
      </div>

      <section className="flex flex-wrap items-center gap-5 rounded-3xl bg-brand-800 p-6 text-white print:bg-white print:text-brand-900">
        <div className="flex-1">
          <p className="text-sm text-brand-200 print:text-brand-500">Fee statement</p>
          <h1 className="font-headline text-4xl font-extrabold uppercase leading-none">{student.full_name}</h1>
          <p className="mt-1.5 text-sm text-brand-200 print:text-brand-500">
            <span className="font-mono text-gold-400 print:text-brand-800">{student.admission_number}</span> · {student.classroom_name} · {student.is_boarder ? "Boarder" : student.route_name ? `Day scholar, ${student.route_name}` : "Day scholar"} · {student.parent_name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-brand-200 print:text-brand-500">{balanceLabel(balance)}</p>
          <p className="font-mono text-4xl font-semibold">{formatKes(Math.abs(balance))}</p>
        </div>
      </section>

      {message && <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="flex-1 text-lg font-semibold text-brand-800">Invoices</h2>
            {canEdit && !hasCurrent && student.status === "active" && <button className="btn-ghost px-3 py-1.5 text-sm print:hidden" onClick={invoiceNow}><FilePlus2 size={15} /> Invoice for {TERM}</button>}
          </div>
          {data.invoices.length === 0 && <p className="card text-sm text-brand-400">No invoices yet.</p>}
          {data.invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} onCancel={canEdit ? setCancelling : null} />)}

          <div className="card print:hidden">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-gold-600" />
              <h3 className="flex-1 font-semibold text-brand-800">Discounts</h3>
              {canEdit && <button className="text-sm font-semibold text-brand-600 hover:underline" onClick={() => setEditingDiscounts(!editingDiscounts)}>{editingDiscounts ? "Done" : "Change"}</button>}
            </div>
            {!editingDiscounts ? (
              <p className="mt-2 text-sm text-brand-600">{data.discounts.length ? data.discounts.map((item) => item.name).join(", ") : "None"}</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {discounts.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={data.discounts.some((applied) => applied.id === item.id)} onChange={() => toggleDiscount(item.id)} />
                    {item.name} <span className="text-brand-400">({item.kind === "percent" ? `${item.value}% of ${item.applies_to}` : `KES ${item.value.toLocaleString()} off ${item.applies_to}`})</span>
                  </label>
                ))}
                <p className="text-xs text-brand-400">Applies to the next invoices generated.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-800">Payments</h2>
          <div className="card divide-y divide-brand-50 p-0">
            {data.payments.length === 0 && <p className="px-5 py-4 text-sm text-brand-400">No payments yet.</p>}
            {data.payments.map((payment) => (
              <Link key={payment.id} to={role === "parent" ? `/parent/receipts/${payment.id}` : `${base}/receipts/${payment.id}`} className={`flex flex-wrap items-center gap-3 px-5 py-3 text-sm hover:bg-brand-50 ${payment.status !== "completed" ? "opacity-60" : ""}`}>
                <span className="w-20 text-xs text-brand-500">{payment.paid_on ? format(new Date(payment.paid_on), "d MMM yy") : ""}</span>
                <span className={`badge ${METHOD_STYLES[payment.method] || "bg-brand-100 text-brand-600"}`}>{payment.method}</span>
                <span className="flex-1 font-mono text-xs text-brand-400">{payment.receipt_number || payment.status}</span>
                {payment.status === "reversed" && <span className="badge bg-red-100 text-red-700">reversed</span>}
                <span className={`font-mono font-semibold ${payment.status === "reversed" ? "line-through" : ""}`}>{formatKes(payment.amount)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-left text-xs text-brand-500">
            <tr>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Reference</th>
              <th className="px-4 py-2.5">Details</th>
              <th className="px-4 py-2.5 text-right">Charged</th>
              <th className="px-4 py-2.5 text-right">Paid</th>
              <th className="px-4 py-2.5 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {data.ledger.map((entry) => (
              <tr key={`${entry.kind}-${entry.id}`}>
                <td className="whitespace-nowrap px-4 py-2">{format(new Date(entry.date), "d MMM yyyy")}</td>
                <td className="px-4 py-2 font-mono text-xs">{entry.reference}</td>
                <td className="px-4 py-2">{entry.description}</td>
                <td className="px-4 py-2 text-right font-mono">{entry.debit ? formatKes(entry.debit) : ""}</td>
                <td className="px-4 py-2 text-right font-mono text-emerald-700">{entry.credit ? formatKes(entry.credit) : ""}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold">{entry.balance < 0 ? `(${formatKes(-entry.balance)})` : formatKes(entry.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cancelling && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/50 p-4 sm:items-center" role="dialog" aria-modal="true">
          <form onSubmit={cancelInvoice} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-brand-800">Cancel invoice {cancelling.number}?</h2>
            <p className="text-sm text-brand-500">It stays on record marked as cancelled and drops out of the balance. Any money paid moves to the next invoice.</p>
            <input className="input" placeholder="Reason, e.g. Learner did not report this term" value={reason} onChange={(event) => setReason(event.target.value)} required minLength={5} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setCancelling(null)}>Keep it</button>
              <button className="btn bg-red-600 text-white hover:bg-red-700">Cancel invoice</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
