import { format } from "date-fns";
import { amountInWords } from "../fees";
import { formatKes } from "../constants";

export default function Receipt({ payment, student, balance }) {
  const reversed = payment.status === "reversed";
  return (
    <div className={`relative mx-auto max-w-lg overflow-hidden rounded-3xl bg-white p-7 shadow-xl ring-1 ring-brand-100 print:shadow-none print:ring-0 ${reversed ? "opacity-80" : ""}`}>
      {reversed && <p className="absolute right-6 top-6 rotate-12 rounded-lg border-4 border-red-500 px-3 py-1 font-headline text-2xl font-extrabold uppercase text-red-500">Reversed</p>}
      <div className="flex items-center gap-3 border-b border-brand-100 pb-4">
        <img src="/logo.png" alt="" className="h-14 w-14 object-contain mix-blend-multiply" />
        <div className="flex-1">
          <p className="font-headline text-2xl font-extrabold uppercase leading-none text-brand-800">Success Academy</p>
          <p className="text-xs text-brand-500">Prison Road, Kitengela · 0748 065 956</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">Official receipt</p>
          <p className="whitespace-nowrap font-mono text-sm font-semibold text-brand-800 sm:text-lg">{payment.receipt_number}</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div><dt className="text-xs text-brand-400">Received from</dt><dd className="font-semibold">{student.parent_name || "Parent"}</dd></div>
        <div><dt className="text-xs text-brand-400">Date</dt><dd className="font-semibold">{format(new Date(payment.paid_on), "d MMMM yyyy")}</dd></div>
        <div><dt className="text-xs text-brand-400">For learner</dt><dd className="font-semibold">{student.full_name}</dd></div>
        <div><dt className="text-xs text-brand-400">Admission no. · Class</dt><dd className="font-mono font-semibold">{student.admission_number} · <span className="font-body">{student.classroom_name}</span></dd></div>
        <div><dt className="text-xs text-brand-400">Paid by</dt><dd className="font-semibold">{payment.method}{payment.bank_name ? `, ${payment.bank_name}` : ""}</dd></div>
        <div><dt className="text-xs text-brand-400">Reference</dt><dd className="font-mono font-semibold">{payment.reference || "-"}</dd></div>
      </dl>

      <div className="mt-6 rounded-2xl bg-brand-50 p-4">
        <p className="text-xs text-brand-400">Amount received</p>
        <p className="font-mono text-3xl font-semibold text-brand-800">{formatKes(payment.amount)}</p>
        <p className="mt-1 text-sm italic text-brand-600">{amountInWords(payment.amount)}</p>
      </div>

      {balance !== undefined && (
        <p className="mt-4 flex justify-between text-sm">
          <span className="text-brand-500">Fee balance now</span>
          <span className="font-mono font-semibold">{balance < 0 ? `Credit ${formatKes(-balance)}` : formatKes(balance)}</span>
        </p>
      )}
      {reversed && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Reversed by {payment.reversed_by}: {payment.reversed_reason}</p>}

      <div className="mt-6 flex items-end justify-between border-t border-dashed border-brand-200 pt-4 text-xs text-brand-400">
        <p>Received by {payment.recorded_by || "School bursar"}</p>
        <p>Thank you</p>
      </div>
      <div className="uniform-check absolute inset-x-0 bottom-0 h-1.5 opacity-60" />
    </div>
  );
}
