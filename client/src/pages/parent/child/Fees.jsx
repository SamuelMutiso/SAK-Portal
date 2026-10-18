import { format } from "date-fns";
import { Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api from "../../../api/client";
import InvoiceCard from "../../../components/InvoiceCard";
import Loader from "../../../components/Loader";
import MpesaPrompt from "../../../components/MpesaPrompt";
import PaybillSteps from "../../../components/PaybillSteps";
import SlipUpload from "../../../components/SlipUpload";
import { formatKes } from "../../../constants";
import { METHOD_STYLES, balanceLabel } from "../../../fees";

export default function Fees({ student, onBalanceChange }) {
  const user = useSelector((state) => state.auth.user);
  const [data, setData] = useState(null);

  const reload = useCallback(async () => {
    const { data: result } = await api.get(`/fees/students/${student.id}/statement`);
    setData(result);
    return result;
  }, [student.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function paid() {
    const fresh = await reload();
    onBalanceChange(fresh.balance);
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

        {data.balance > 0 && <MpesaPrompt student={student} balance={data.balance} defaultPhone={user.phone} onPaid={paid} />}
        <PaybillSteps paybill={data.paybill} account={student.admission_number} />
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
                {payment.status === "completed" || payment.status === "reversed" ? (
                  <Link to={`/parent/receipts/${payment.id}`} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-brand-50">
                    <span className="w-20 shrink-0 text-xs text-brand-500">{payment.paid_on ? format(new Date(payment.paid_on), "d MMM yy") : ""}</span>
                    <span className={`badge ${METHOD_STYLES[payment.method] || "bg-brand-100 text-brand-600"}`}>{payment.method}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-brand-600 underline">{payment.receipt_number}</span>
                    <span className={`font-mono font-semibold ${payment.status === "reversed" ? "line-through text-brand-400" : ""}`}>{formatKes(payment.amount)}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-5 py-2.5 text-sm text-brand-400">
                    <span className="w-20 shrink-0 text-xs">{payment.created_at ? format(new Date(`${payment.created_at}${payment.created_at.endsWith("Z") ? "" : "Z"}`), "d MMM yy") : ""}</span>
                    <span className="badge bg-brand-50 text-brand-500">{payment.method}</span>
                    <span className="min-w-0 flex-1 truncate text-xs">{payment.status === "failed" ? "Did not go through · no receipt" : "Waiting for M-Pesa"}</span>
                    <span className="font-mono">{formatKes(payment.amount)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
