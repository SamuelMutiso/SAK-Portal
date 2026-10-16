import { Printer, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import Receipt from "../../components/Receipt";
import SmsPreview from "../../components/SmsPreview";
import { formatKes } from "../../constants";
import { INVOICE_STYLES, METHODS } from "../../fees";
import { feesBase } from "../../roles";

const BANKS = ["Equity Bank", "KCB", "Co-operative Bank", "Family Bank", "NCBA", "Absa", "Stanbic", "I&M Bank"];
const today = () => new Date().toISOString().slice(0, 10);

export default function RecordPayment() {
  const role = useSelector((state) => state.auth.user.role);
  const base = feesBase(role);
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState({ amount: "", method: "Cash", reference: "", bank_name: "Equity Bank", paid_on: today(), note: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function open(studentId) {
    api.get(`/fees/students/${studentId}/statement`).then(({ data }) => {
      setAccount(data);
      setForm((current) => ({ ...current, amount: data.balance > 0 ? String(data.balance) : "" }));
      setMatches([]);
      setSearch("");
    });
  }

  useEffect(() => {
    const preset = params.get("student");
    if (preset) open(preset);
  }, [params]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setMatches([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      api.get("/students", { params: { search, status: "all" } }).then(({ data }) => setMatches(data.slice(0, 8)));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const needsReference = form.method !== "Cash";
      const { data } = await api.post("/fees/payments", {
        student_id: account.student.id,
        amount: Number(form.amount),
        method: form.method,
        reference: needsReference ? form.reference : form.reference || null,
        bank_name: form.method === "Bank" || form.method === "Cheque" ? form.bank_name : null,
        paid_on: form.paid_on,
        note: form.note || null,
      });
      setResult({ ...data, student: account.student });
    } catch (err) {
      setError(errorMessage(err));
    }
    setSaving(false);
  }

  function reset() {
    setResult(null);
    setAccount(null);
    setForm({ amount: "", method: "Cash", reference: "", bank_name: "Equity Bank", paid_on: today(), note: "" });
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <h1 className="page-title flex-1">Payment recorded</h1>
          <button className="btn-ghost" onClick={() => window.print()}><Printer size={16} /> Print receipt</button>
          <button className="btn-primary" onClick={reset}>Record another</button>
        </div>
        <Receipt payment={result.payment} student={{ ...result.student, parent_name: result.student.parent_name }} balance={result.balance} />
        <div className="print:hidden"><SmsPreview sms={result.sms} onClose={() => setResult({ ...result, sms: { ...result.sms, message: null } })} /></div>
      </div>
    );
  }

  const openInvoices = account ? account.invoices.filter((invoice) => invoice.status === "unpaid" || invoice.status === "partial") : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="page-title">Record a payment</h1>
        <p className="mt-2 text-brand-500">For cash, bank slips and cheques brought to the office. M-Pesa and Paybill payments come in by themselves.</p>
      </div>

      {!account ? (
        <div className="card space-y-3">
          <label className="label" htmlFor="find">Find the learner</label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
            <input id="find" autoFocus className="input pl-10" placeholder="Name or admission number" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <ul className="divide-y divide-brand-50">
            {matches.map((student) => (
              <li key={student.id}>
                <button onClick={() => open(student.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-brand-50">
                  <UserRound size={18} className="text-brand-400" />
                  <span className="flex-1">
                    <span className="block font-semibold">{student.full_name}</span>
                    <span className="text-xs text-brand-400"><span className="font-mono">{student.admission_number}</span> · {student.classroom_name || student.last_classroom_name} · {student.parent_name}</span>
                  </span>
                  <span className={`font-mono text-sm font-semibold ${student.fee_balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{formatKes(student.fee_balance)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="card flex flex-wrap items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500 font-headline text-2xl font-extrabold text-brand-900">{account.student.full_name[0]}</span>
            <div className="flex-1">
              <p className="text-lg font-semibold text-brand-800">{account.student.full_name}</p>
              <p className="text-sm text-brand-500"><span className="font-mono">{account.student.admission_number}</span> · {account.student.classroom_name} · {account.student.parent_name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-brand-400">Balance</p>
              <p className={`font-mono text-2xl font-semibold ${account.balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{account.balance < 0 ? `Credit ${formatKes(-account.balance)}` : formatKes(account.balance)}</p>
            </div>
            <button className="text-sm font-semibold text-brand-600 hover:underline" onClick={() => setAccount(null)}>Change</button>
          </div>

          {openInvoices.length > 0 && (
            <div className="card">
              <p className="text-sm font-semibold text-brand-700">Unpaid invoices</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {openInvoices.map((invoice) => (
                  <li key={invoice.id} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-brand-400">{invoice.number}</span>
                    <span className="flex-1">{invoice.term}</span>
                    <span className={`badge ${INVOICE_STYLES[invoice.status]}`}>{invoice.status}</span>
                    <span className="w-28 text-right font-mono">{formatKes(invoice.balance)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-brand-400">Payments clear the oldest invoice first.</p>
            </div>
          )}

          <form onSubmit={submit} className="card space-y-4">
            <div>
              <p className="label">Paid by</p>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((method) => (
                  <button key={method} type="button" onClick={() => setForm({ ...form, method })} className={`rounded-xl px-4 py-2 text-sm font-semibold ${form.method === method ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-600 hover:bg-brand-100"}`}>{method}</button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="amount">Amount (KES)</label>
                <input id="amount" inputMode="numeric" className="input font-mono text-lg" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/\D/g, "") })} required />
              </div>
              <div>
                <label className="label" htmlFor="paid_on">Date paid</label>
                <input id="paid_on" type="date" className="input" max={today()} value={form.paid_on} onChange={(event) => setForm({ ...form, paid_on: event.target.value })} required />
              </div>
              {form.method !== "Cash" && (
                <div>
                  <label className="label" htmlFor="reference">{form.method === "Cheque" ? "Cheque number" : form.method === "Bank" ? "Bank slip / transaction number" : "M-Pesa code"}</label>
                  <input id="reference" className="input font-mono uppercase" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value.toUpperCase() })} required />
                </div>
              )}
              {(form.method === "Bank" || form.method === "Cheque") && (
                <div>
                  <label className="label" htmlFor="bank">Bank</label>
                  <select id="bank" className="input" value={form.bank_name} onChange={(event) => setForm({ ...form, bank_name: event.target.value })}>
                    {BANKS.map((bank) => <option key={bank}>{bank}</option>)}
                  </select>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="label" htmlFor="note">Note (optional)</label>
                <input id="note" className="input" placeholder="e.g. Paid by grandmother" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
              </div>
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-gold px-6 py-3" disabled={saving || !form.amount}>{saving ? "Saving..." : `Record ${form.amount ? formatKes(form.amount) : "payment"}`}</button>
              <Link to={`${base}/students/${account.student.id}`} className="text-sm font-semibold text-brand-600 hover:underline">Open fee statement</Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
