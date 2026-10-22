import { format } from "date-fns";
import { CheckCircle2, FileText, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import ExamPicker from "../../components/ExamPicker";
import Loader from "../../components/Loader";
import { TERM, formatKes } from "../../constants";
import { INVOICE_STYLES } from "../../fees";
import { feesBase } from "../../roles";

export default function Invoices() {
  const role = useSelector((state) => state.auth.user.role);
  const base = feesBase(role);
  const readOnly = role === "director";
  const [term, setTerm] = useState(TERM);
  const [preview, setPreview] = useState(null);
  const [picked, setPicked] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState(null);
  const [invoices, setInvoices] = useState(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState(null);
  const list = useRef(null);

  const loadPreview = useCallback(() => {
    api.get("/fees/invoices/preview", { params: { term } }).then(({ data }) => {
      setPreview(data);
      setDueDate(data.due_date || "");
      setPicked(data.rows.filter((row) => row.to_invoice > 0).map((row) => row.classroom_id));
    });
  }, [term]);

  const loadInvoices = useCallback(() => {
    api.get("/fees/invoices", { params: { term, status: status || undefined, search: search || undefined, classroom_id: classFilter?.id } }).then(({ data }) => setInvoices(data));
  }, [term, status, search, classFilter]);

  function showClass(row) {
    setClassFilter({ id: row.classroom_id, name: row.name });
    list.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(loadPreview, [loadPreview]);
  useEffect(() => {
    const timer = setTimeout(loadInvoices, 250);
    return () => clearTimeout(timer);
  }, [loadInvoices]);

  async function generate() {
    try {
      const { data } = await api.post("/fees/invoices/generate", { term, classroom_ids: picked, due_date: dueDate || null });
      setMessage({ type: "success", text: `${data.created} invoices created for ${term}, ${formatKes(data.total)} in total. Parents see them in the portal now.` });
      setConfirming(false);
      loadPreview();
      loadInvoices();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  if (!preview) return <Loader />;
  const chosen = preview.rows.filter((row) => picked.includes(row.classroom_id));
  const missing = chosen.reduce((sum, row) => sum + row.missing_fees, 0);
  const count = chosen.reduce((sum, row) => sum + row.to_invoice, 0) - missing;
  const total = chosen.reduce((sum, row) => sum + row.total, 0);
  const allDone = preview.rows.length > 0 && preview.rows.every((row) => row.to_invoice === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="page-title">Term invoices</h1>
          <p className="mt-2 text-brand-500">Bill every learner for the term in one go, from the fee structure. Learners already invoiced are skipped.</p>
        </div>
        <ExamPicker term={term} showExam={false} onChange={(next) => setTerm(next.term)} />
      </div>

      {message && <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>}

      {!readOnly && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-brand-800">Generate invoices for {term}</h2>
          {allDone && (
            <div className="flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
              <p>Every class already has its {term} invoices, so there is nothing new to bill. Learners admitted later show up here to invoice. To bill a learner again, cancel their invoice first from their fee statement. Tap a class to see its invoices.</p>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {preview.rows.map((row) => {
              const done = row.to_invoice === 0;
              if (done) {
                return (
                  <button key={row.classroom_id} type="button" onClick={() => showClass(row)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-emerald-100 ${classFilter?.id === row.classroom_id ? "bg-emerald-100 ring-2 ring-emerald-500" : "bg-emerald-50"}`}>
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                    <span className="flex-1 font-semibold">{row.name}</span>
                    <span className="text-xs font-semibold text-emerald-700">All {row.learners} invoiced · View</span>
                  </button>
                );
              }
              return (
                <label key={row.classroom_id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-brand-50 px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-700"
                    checked={picked.includes(row.classroom_id)}
                    onChange={(event) => setPicked(event.target.checked ? [...picked, row.classroom_id] : picked.filter((value) => value !== row.classroom_id))}
                  />
                  <span className="flex-1 font-semibold">{row.name}</span>
                  {row.missing_fees === row.to_invoice ? <span className="text-xs text-amber-700">No fees set</span> : <span className="font-mono text-xs text-brand-500">{row.to_invoice} · {formatKes(row.total)}</span>}
                </label>
              );
            })}
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="label" htmlFor="due">Fees due by</label>
              <input id="due" type="date" className="input" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <p className="flex-1 text-sm text-brand-600">{allDone ? "Nothing new to invoice" : <>{count} learners · <span className="font-mono font-semibold">{formatKes(total)}</span></>}</p>
            <button className="btn-gold" disabled={!count} onClick={() => setConfirming(true)}><FileText size={16} /> {count ? `Generate ${count} invoice${count === 1 ? "" : "s"}` : allDone || picked.length ? "Nothing to invoice" : "Pick a class first"}</button>
          </div>
          {missing > 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{missing} learners have no fees set for {term} and will be skipped. Set the fee structure for {term} first.</p>}
        </div>
      )}

      <div ref={list} className="scroll-mt-24 space-y-3">
        {classFilter && (
          <p className="flex items-center gap-2 text-sm text-brand-600">
            Showing {term} invoices for <span className="font-semibold text-brand-800">{classFilter.name}</span>
            <button type="button" onClick={() => setClassFilter(null)} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"><X size={12} /> Show all classes</button>
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
            <input className="input pl-10" placeholder="Learner, admission or invoice number" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="flex gap-1 rounded-xl bg-brand-50 p-1">
            {[["", "All"], ["unpaid", "Unpaid"], ["partial", "Part paid"], ["paid", "Paid"], ["cancelled", "Cancelled"]].map(([value, label]) => (
              <button key={value} onClick={() => setStatus(value)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${status === value ? "bg-brand-700 text-white" : "text-brand-600 hover:bg-white"}`}>{label}</button>
            ))}
          </div>
        </div>
        {!invoices ? <Loader /> : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-xs text-brand-500">
                <tr>
                  <th className="px-4 py-2.5">Invoice</th>
                  <th className="px-4 py-2.5">Learner</th>
                  <th className="px-4 py-2.5">Class</th>
                  <th className="px-4 py-2.5">Issued</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                  <th className="px-4 py-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {invoices.length === 0 && <tr><td colSpan={7} className="px-4 py-4 text-brand-400">No invoices found.</td></tr>}
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-brand-50">
                    <td className="px-4 py-2.5 font-mono text-xs"><Link to={`${base}/students/${invoice.student_id}`} className="hover:underline">{invoice.number}</Link></td>
                    <td className="px-4 py-2.5"><Link to={`${base}/students/${invoice.student_id}`} className="font-semibold hover:underline">{invoice.student_name}</Link></td>
                    <td className="px-4 py-2.5 text-brand-500">{invoice.classroom_name}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-brand-500">{format(new Date(invoice.issued_on), "d MMM yyyy")}</td>
                    <td className="px-4 py-2.5"><span className={`badge ${INVOICE_STYLES[invoice.status]}`}>{invoice.status}</span></td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatKes(invoice.total)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">{formatKes(invoice.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-900/50 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-brand-800">Create {count} invoices for {term}?</h2>
            <p className="text-sm text-brand-600">Classes: {chosen.map((row) => row.name).join(", ")}. Total <span className="font-mono font-semibold">{formatKes(total)}</span>{dueDate ? `, due ${format(new Date(dueDate), "d MMM yyyy")}` : ""}.</p>
            <p className="text-sm text-brand-500">Parents see the invoice in the portal straight away. A wrong invoice can be cancelled later, never deleted.</p>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="btn-primary" onClick={generate}>Create invoices</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
