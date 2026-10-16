import { format } from "date-fns";
import { ChevronDown, XCircle } from "lucide-react";
import { useState } from "react";
import { formatKes } from "../constants";
import { INVOICE_STYLES } from "../fees";

export default function InvoiceCard({ invoice, onCancel }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl ring-1 ring-brand-100">
      <button onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left text-sm">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-brand-800">{invoice.term}</span>
          <span className="block font-mono text-xs text-brand-400">{invoice.number}</span>
        </span>
        <span className={`badge ${INVOICE_STYLES[invoice.status]}`}>{invoice.status}</span>
        <span className="whitespace-nowrap text-right font-mono font-semibold">{formatKes(invoice.total)}</span>
        <ChevronDown size={16} className={`text-brand-300 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-brand-50 px-4 pb-4 pt-2 text-sm">
          <ul className="space-y-1">
            {invoice.lines.map((line) => (
              <li key={line.id} className={`flex justify-between ${line.amount < 0 ? "text-emerald-700" : ""}`}>
                <span>{line.description}</span>
                <span className="font-mono">{line.amount < 0 ? `- ${formatKes(-line.amount)}` : formatKes(line.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1 border-t border-dashed border-brand-100 pt-2">
            <p className="flex justify-between font-semibold"><span>Total</span><span className="font-mono">{formatKes(invoice.total)}</span></p>
            <p className="flex justify-between text-brand-500"><span>Paid</span><span className="font-mono">{formatKes(invoice.paid_amount)}</span></p>
            <p className="flex justify-between font-semibold text-amber-700"><span>Balance</span><span className="font-mono">{formatKes(invoice.balance)}</span></p>
          </div>
          <p className="mt-2 text-xs text-brand-400">Issued {format(new Date(invoice.issued_on), "d MMM yyyy")}{invoice.due_date ? ` · due ${format(new Date(invoice.due_date), "d MMM yyyy")}` : ""}</p>
          {invoice.status === "cancelled" && <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-500">Cancelled: {invoice.cancelled_reason}</p>}
          {onCancel && invoice.status !== "cancelled" && (
            <button onClick={() => onCancel(invoice)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"><XCircle size={13} /> Cancel invoice</button>
          )}
        </div>
      )}
    </div>
  );
}
