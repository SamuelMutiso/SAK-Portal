import { format, subDays } from "date-fns";
import { Download, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api from "../../api/client";
import Loader from "../../components/Loader";
import { formatKes } from "../../constants";
import { METHODS, METHOD_STYLES } from "../../fees";
import { feesBase } from "../../roles";

const day = (date) => format(date, "yyyy-MM-dd");

export default function Payments() {
  const role = useSelector((state) => state.auth.user.role);
  const base = feesBase(role);
  const [range, setRange] = useState({ from: day(subDays(new Date(), 30)), to: day(new Date()) });
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("completed");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      api.get("/fees/payments", { params: { ...range, method: method || undefined, status, search: search || undefined } }).then(({ data: result }) => setData(result));
    }, 250);
    return () => clearTimeout(timer);
  }, [range, method, status, search]);

  function download() {
    const rows = [["Date", "Receipt", "Learner", "Admission", "Class", "Method", "Reference", "Amount", "Status"]];
    data.payments.forEach((item) => rows.push([item.paid_on, item.receipt_number, item.student_name, item.admission_number, item.classroom_name, item.method, item.reference || "", item.amount, item.status]));
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `payments-${range.from}-to-${range.to}.csv`;
    link.click();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="page-title">Payments</h1>
          <p className="mt-2 text-brand-500">Every shilling received, with its receipt. Reversed payments stay on record.</p>
        </div>
        {data && <button className="btn-ghost" onClick={download}><Download size={16} /> Download CSV</button>}
      </div>

      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="from">From</label>
          <input id="from" type="date" className="input" value={range.from} onChange={(event) => setRange({ ...range, from: event.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="to">To</label>
          <input id="to" type="date" className="input" value={range.to} onChange={(event) => setRange({ ...range, to: event.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="method">Method</label>
          <select id="method" className="input" value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="">All methods</option>
            {METHODS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="completed">Received</option>
            <option value="reversed">Reversed</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="relative min-w-56 flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pl-10" placeholder="Learner, receipt or reference" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      {!data ? <Loader /> : (
        <>
          <p className="text-sm text-brand-600">{data.payments.length} payments · <span className="font-mono font-semibold text-brand-800">{formatKes(data.total)}</span> received</p>
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-xs text-brand-500">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Receipt</th>
                  <th className="px-4 py-2.5">Learner</th>
                  <th className="px-4 py-2.5">Method</th>
                  <th className="px-4 py-2.5">Reference</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {data.payments.map((payment) => (
                  <tr key={payment.id} className={`hover:bg-brand-50 ${payment.status === "reversed" ? "text-brand-400" : ""}`}>
                    <td className="whitespace-nowrap px-4 py-2.5">{format(new Date(payment.paid_on), "d MMM yyyy")}</td>
                    <td className="px-4 py-2.5 font-mono text-xs"><Link to={`${base}/receipts/${payment.id}`} className="hover:underline">{payment.receipt_number}</Link></td>
                    <td className="px-4 py-2.5"><Link to={`${base}/students/${payment.student_id}`} className="font-semibold hover:underline">{payment.student_name}</Link> <span className="text-xs text-brand-400">{payment.classroom_name}</span></td>
                    <td className="px-4 py-2.5"><span className={`badge ${METHOD_STYLES[payment.method]}`}>{payment.method}</span>{payment.status === "reversed" && <span className="badge ml-1 bg-red-100 text-red-700">reversed</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{payment.reference}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${payment.status === "reversed" ? "line-through" : ""}`}>{formatKes(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
