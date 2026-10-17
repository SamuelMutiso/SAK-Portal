import { format } from "date-fns";
import { AlertTriangle, Ban, FileText, HandCoins, Plus, Receipt, TrendingDown, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import { formatKes } from "../../constants";

const iso = (day) => format(day, "yyyy-MM-dd");
const daysAgo = (count) => { const day = new Date(); day.setDate(day.getDate() - count); return day; };
const PERIODS = [
  { key: "today", label: "Today", range: () => [iso(new Date()), iso(new Date())] },
  { key: "week", label: "Last 7 days", range: () => [iso(daysAgo(6)), iso(new Date())] },
  { key: "month", label: "This month", range: () => { const now = new Date(); return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)]; } },
  { key: "custom", label: "Pick dates", range: null },
];
const EMPTY = { spent_on: iso(new Date()), category: "", description: "", amount: "", paid_to: "", method: "Cash", reference: "" };

function AddExpense({ categories, methods, onSaved, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, category: categories[0] });
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const save = async (event) => {
    event.preventDefault();
    setError(null);
    if (receipt && receipt.size > 5 * 1024 * 1024) { setError("The receipt photo is bigger than 5 MB."); return; }
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => value !== "" && body.append(key, String(value).trim()));
      if (receipt) body.append("receipt", receipt);
      const { data } = await api.post("/expenses", body);
      onSaved(data);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-brand-900/50 sm:place-items-center" role="dialog" aria-label="Record an expense">
      <form onSubmit={save} className="max-h-[100dvh] w-full space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-800">Record an expense</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-brand-50" aria-label="Cancel"><X size={20} /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="x-amount">Amount (KES)</label>
            <input id="x-amount" name="amount" type="number" inputMode="numeric" min={1} className="input font-mono" value={form.amount} onChange={change} required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="x-date">Date spent</label>
            <input id="x-date" name="spent_on" type="date" max={iso(new Date())} min={iso(daysAgo(90))} className="input" value={form.spent_on} onChange={change} required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="x-category">Category</label>
          <select id="x-category" name="category" className="input" value={form.category} onChange={change}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="x-description">What was it for?</label>
          <input id="x-description" name="description" className="input" value={form.description} onChange={change} required minLength={3} maxLength={200} placeholder="e.g. Diesel for school bus KCA 123X" />
        </div>
        <div>
          <label className="label" htmlFor="x-paid-to">Paid to</label>
          <input id="x-paid-to" name="paid_to" className="input" value={form.paid_to} onChange={change} required minLength={2} maxLength={120} placeholder="e.g. Rubis Kitengela" />
        </div>
        <div>
          <span className="label">Paid by</span>
          <div className="grid grid-cols-4 gap-2">
            {methods.map((method) => (
              <button key={method} type="button" onClick={() => setForm({ ...form, method })} className={`rounded-xl px-2 py-2.5 text-sm font-semibold ${form.method === method ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700"}`}>{method}</button>
            ))}
          </div>
        </div>
        {form.method !== "Cash" && (
          <div>
            <label className="label" htmlFor="x-reference">{form.method === "M-Pesa" ? "M-Pesa code" : form.method === "Bank" ? "Bank reference" : "Cheque number"}</label>
            <input id="x-reference" name="reference" className="input font-mono uppercase" value={form.reference} onChange={change} required maxLength={60} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="x-receipt">Receipt photo or PDF (recommended)</label>
          <input id="x-receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(event) => setReceipt(event.target.files[0] || null)}
            className="block w-full text-base text-brand-700 file:mr-3 file:rounded-xl file:border-0 file:bg-brand-100 file:px-4 file:py-2.5 file:font-semibold file:text-brand-700 sm:text-sm" />
        </div>
        <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-600">Expenses cannot be edited or deleted once saved. If you make a mistake, cancel it with a reason and record it again. The director sees both.</p>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Saving…" : `Save ${form.amount ? formatKes(Number(form.amount)) : "expense"}`}</button>
      </form>
    </div>
  );
}

export default function Expenses() {
  const [period, setPeriod] = useState("week");
  const [range, setRange] = useState(PERIODS[1].range());
  const [category, setCategory] = useState("");
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(() => {
    api.get("/expenses", { params: { start: range[0], end: range[1], category: category || undefined } }).then(({ data: result }) => setData(result));
  }, [range, category]);

  useEffect(load, [load]);

  const choose = (item) => {
    setPeriod(item.key);
    if (item.range) setRange(item.range());
  };

  const openReceipt = async (expense) => {
    const tab = window.open("", "_blank");
    try {
      const { data: file } = await api.get(`/expenses/${expense.id}/receipt`, { responseType: "blob" });
      const url = URL.createObjectURL(file);
      if (tab) tab.location.href = url; else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      if (tab) tab.close();
      setNotice({ type: "error", text: "The receipt could not be opened." });
    }
  };

  const cancel = async (expense) => {
    const reason = window.prompt(`Why are you cancelling "${expense.description}" (${formatKes(expense.amount)})? The director will see this.`);
    if (reason === null) return;
    try {
      await api.post(`/expenses/${expense.id}/void`, { reason });
      setNotice({ type: "success", text: "Expense cancelled. It stays on the record, crossed out." });
      load();
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err) });
    }
  };

  if (!data) return <Loader />;

  const days = [...new Set(data.items.map((item) => item.spent_on))];
  const biggest = Math.max(1, ...Object.values(data.by_category));
  const balance = data.fees_collected - data.total;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="page-title">Expenses</h1>
          <p className="mt-1 text-brand-500">Every shilling spent, who recorded it and the receipt. {data.can_add ? "Record spending the same day." : "Recorded by the bursar."}</p>
        </div>
        {data.can_add && <button type="button" onClick={() => setAdding(true)} className="btn-primary"><Plus size={18} /> Record expense</button>}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((item) => (
            <button key={item.key} type="button" onClick={() => choose(item)} className={`rounded-full px-4 py-2 text-sm font-semibold ${period === item.key ? "bg-brand-700 text-white" : "bg-white text-brand-600 ring-1 ring-brand-200 hover:bg-brand-50"}`}>{item.label}</button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex flex-wrap gap-2">
            <input type="date" className="input w-auto" value={range[0]} max={range[1]} onChange={(event) => setRange([event.target.value, range[1]])} aria-label="From" />
            <input type="date" className="input w-auto" value={range[1]} max={iso(new Date())} onChange={(event) => setRange([range[0], event.target.value])} aria-label="To" />
          </div>
        )}
      </div>

      {notice && <p className={`rounded-xl px-3 py-2 text-sm ${notice.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{notice.text}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card"><p className="text-sm font-semibold text-brand-500">Spent</p><p className="mt-1 font-mono text-2xl font-semibold text-red-600">{formatKes(data.total)}</p><p className="text-xs text-brand-400">{data.count} entries</p></div>
        <div className="card"><p className="text-sm font-semibold text-brand-500">Fees collected</p><p className="mt-1 font-mono text-2xl font-semibold text-emerald-700">{formatKes(data.fees_collected)}</p><p className="text-xs text-brand-400">Same dates</p></div>
        <div className="card">
          <p className="text-sm font-semibold text-brand-500">Collected minus spent</p>
          <p className={`mt-1 flex items-center gap-1 font-mono text-2xl font-semibold ${balance >= 0 ? "text-brand-800" : "text-red-600"}`}>{balance >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}{formatKes(Math.abs(balance))}</p>
          <p className="text-xs text-brand-400">{balance >= 0 ? "More came in than went out" : "More went out than came in"}</p>
        </div>
        <div className="card">
          <p className="text-sm font-semibold text-brand-500">Needs checking</p>
          <p className={`mt-1 font-mono text-2xl font-semibold ${data.without_receipt ? "text-amber-700" : "text-emerald-700"}`}>{data.without_receipt}</p>
          <p className="text-xs text-brand-400">without a receipt{data.voided ? ` · ${data.voided} cancelled` : ""}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-brand-800">By category</h2>
          {Object.keys(data.by_category).length === 0 ? <p className="mt-3 text-sm text-brand-400">Nothing spent in these dates.</p> : (
            <ul className="mt-3 space-y-2.5">
              {Object.entries(data.by_category).map(([name, amount]) => (
                <li key={name}>
                  <button type="button" onClick={() => setCategory(category === name ? "" : name)} className={`w-full rounded-lg px-2 py-1 text-left text-sm ${category === name ? "bg-brand-50" : "hover:bg-brand-50"}`}>
                    <div className="flex justify-between gap-3"><span className="font-semibold text-brand-700">{name}</span><span className="font-mono text-brand-800">{formatKes(amount)}</span></div>
                    <div className="mt-1 h-2 rounded-full bg-brand-50"><div className="h-2 rounded-full bg-gold-500" style={{ width: `${(amount / biggest) * 100}%` }} /></div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {category && <button type="button" onClick={() => setCategory("")} className="mt-3 text-sm font-semibold text-brand-600">Show all categories</button>}
        </div>

        <div className="space-y-4 lg:col-span-3">
          {days.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 py-10 text-center text-brand-500">
              <HandCoins size={32} className="text-brand-300" />
              <p className="font-semibold text-brand-700">No expenses in these dates</p>
            </div>
          ) : days.map((day) => {
            const entries = data.items.filter((item) => item.spent_on === day);
            return (
              <section key={day} className="card overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-brand-50 bg-brand-50/50 px-5 py-3">
                  <span className="font-semibold text-brand-800">{format(new Date(`${day}T00:00`), "EEEE d MMMM")}</span>
                  <span className="font-mono text-sm font-semibold text-brand-700">{formatKes(entries.filter((item) => !item.voided).reduce((sum, item) => sum + item.amount, 0))}</span>
                </div>
                <ul className="divide-y divide-brand-50">
                  {entries.map((item) => (
                    <li key={item.id} className={`px-5 py-3 ${item.voided ? "bg-red-50/40" : ""}`}>
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold text-brand-800 ${item.voided ? "line-through opacity-60" : ""}`}>{item.description}</p>
                          <p className="text-xs text-brand-400">{item.category} · {item.paid_to} · {item.method}{item.reference ? ` ${item.reference}` : ""}</p>
                          <p className="text-xs text-brand-400">Recorded by {item.recorded_by} at {format(new Date(`${item.created_at}Z`), "HH:mm, d MMM")}</p>
                          {item.voided && <p className="mt-1 flex items-start gap-1 text-xs font-semibold text-red-700"><Ban size={13} className="mt-0.5 shrink-0" /> Cancelled by {item.voided_by}: {item.void_reason}</p>}
                        </div>
                        <span className={`shrink-0 font-mono font-semibold ${item.voided ? "text-brand-300 line-through" : "text-brand-800"}`}>{formatKes(item.amount)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {item.has_receipt ? (
                          <button type="button" onClick={() => openReceipt(item)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                            {item.receipt_name?.endsWith(".pdf") ? <FileText size={13} /> : <Receipt size={13} />} View receipt
                          </button>
                        ) : !item.voided && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"><AlertTriangle size={13} /> No receipt</span>
                        )}
                        {data.can_add && !item.voided && (
                          <button type="button" onClick={() => cancel(item)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Cancel entry</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      {adding && (
        <AddExpense categories={data.categories} methods={data.methods} onClose={() => setAdding(false)}
          onSaved={(saved) => { setAdding(false); setNotice({ type: "success", text: `Saved ${formatKes(saved.amount)} for ${saved.description}.` }); load(); }} />
      )}
    </div>
  );
}
