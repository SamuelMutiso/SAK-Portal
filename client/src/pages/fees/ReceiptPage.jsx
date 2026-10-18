import { ArrowLeft, Printer, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import Receipt from "../../components/Receipt";
import { feesBase } from "../../roles";

export default function ReceiptPage() {
  const { id } = useParams();
  const role = useSelector((state) => state.auth.user.role);
  const canReverse = role === "admin" || role === "bursar";
  const [data, setData] = useState(null);
  const [reason, setReason] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);

  const [missing, setMissing] = useState(null);

  function load() {
    api.get(`/fees/payments/${id}`).then(({ data: result }) => setData(result)).catch((err) => setMissing(errorMessage(err)));
  }

  useEffect(load, [id]);

  async function reverse(event) {
    event.preventDefault();
    try {
      await api.post(`/fees/payments/${id}/reverse`, { reason });
      setAsking(false);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <p className="text-lg font-semibold text-brand-800">No receipt for this payment</p>
        <p className="text-brand-500">{missing}</p>
        <button type="button" onClick={() => window.history.back()} className="btn-ghost">Go back</button>
      </div>
    );
  }
  if (!data) return <Loader />;
  const back = role === "parent" ? `/parent/children/${data.payment.student_id}` : `${feesBase(role)}/students/${data.payment.student_id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link to={back} className="inline-flex flex-1 items-center gap-2 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft size={16} /> {role === "parent" ? "Back" : "Fee statement"}</Link>
        <button className="btn-ghost" onClick={() => window.print()}><Printer size={16} /> Print</button>
        {canReverse && data.payment.status === "completed" && <button className="btn-ghost text-red-600" onClick={() => setAsking(true)}><Undo2 size={16} /> Reverse</button>}
      </div>
      <Receipt payment={data.payment} student={data.student} balance={data.balance} />

      {asking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/50 p-4 sm:items-center" role="dialog" aria-modal="true">
          <form onSubmit={reverse} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-brand-800">Reverse receipt {data.payment.receipt_number}?</h2>
            <p className="text-sm text-brand-500">The receipt stays on record marked as reversed, and the learner&apos;s balance goes back up. Use this for a payment entered by mistake or a bounced cheque.</p>
            <input className="input" placeholder="Reason, e.g. Cheque bounced" value={reason} onChange={(event) => setReason(event.target.value)} required minLength={5} />
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setAsking(false)}>Cancel</button>
              <button className="btn bg-red-600 text-white hover:bg-red-700">Reverse payment</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
