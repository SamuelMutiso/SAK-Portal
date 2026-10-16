import { format } from "date-fns";
import { AlertTriangle, ArrowRight, Banknote, FileText, Hash, Landmark, ListChecks, Receipt, Settings2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/client";
import ExamPicker from "../../components/ExamPicker";
import Loader from "../../components/Loader";
import { TERM, formatKes } from "../../constants";
import { METHOD_STYLES } from "../../fees";
import { feesBase } from "../../roles";

function Tile({ label, value, hint, tone = "text-brand-800" }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold text-brand-500">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-brand-400">{hint}</p>}
    </div>
  );
}

export default function FeesHome() {
  const role = useSelector((state) => state.auth.user.role);
  const base = feesBase(role);
  const readOnly = role === "director";
  const [term, setTerm] = useState(TERM);
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    api.get("/fees/summary", { params: { term } }).then(({ data: result }) => setData(result));
  }, [term]);

  const actions = [
    { to: `${base}/record`, label: "Record a payment", icon: Banknote },
    { to: `${base}/invoices`, label: "Term invoices", icon: FileText },
    { to: `${base}/payments`, label: "All payments", icon: Receipt },
    { to: `${base}/balances`, label: "Balances & reminders", icon: ListChecks },
    { to: `${base}/structure`, label: "Fee structure", icon: Settings2 },
    { to: `${base}/paybill`, label: "M-Pesa Paybill", icon: Hash },
    { to: `${base}/slips`, label: "Bank slips", icon: Landmark },
  ].filter((action) => !readOnly || !["Record a payment", "Fee structure"].includes(action.label));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="page-title">Fees</h1>
          <p className="mt-2 text-brand-500">What the school expects, what has come in and who still owes, term by term.</p>
        </div>
        <ExamPicker term={term} showExam={false} onChange={(next) => setTerm(next.term)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="card flex items-center gap-3 py-4 font-semibold text-brand-800 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-100 text-gold-600"><Icon size={18} /></span>
            {label}
          </Link>
        ))}
      </div>

      {!data ? <Loader /> : (
        <>
          {data.paybill_unmatched > 0 && (
            <Link to={`${base}/paybill`} className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 hover:bg-emerald-100">
              <Hash size={20} />
              <span className="flex-1 font-semibold">{data.paybill_unmatched} Paybill {data.paybill_unmatched === 1 ? "payment needs" : "payments need"} a learner. The parent typed the wrong account number.</span>
              <span className="flex items-center gap-1 text-sm font-semibold">Match now <ArrowRight size={16} /></span>
            </Link>
          )}
          {data.slips_pending > 0 && (
            <Link to={`${base}/slips`} className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sky-800 hover:bg-sky-100">
              <Landmark size={20} />
              <span className="flex-1 font-semibold">{data.slips_pending} bank {data.slips_pending === 1 ? "slip is" : "slips are"} waiting to be checked.</span>
              <span className="flex items-center gap-1 text-sm font-semibold">Check slips <ArrowRight size={16} /></span>
            </Link>
          )}
          {data.not_invoiced > 0 && !readOnly && (
            <Link to={`${base}/invoices`} className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 hover:bg-amber-100">
              <AlertTriangle size={20} />
              <span className="flex-1 font-semibold">{data.not_invoiced} learners have no invoice for {data.term} yet.</span>
              <span className="flex items-center gap-1 text-sm font-semibold">Generate invoices <ArrowRight size={16} /></span>
            </Link>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label={`Expected for ${data.term}`} value={formatKes(data.expected)} hint={`${data.invoiced} invoices`} />
            <Tile label="Collected" value={formatKes(data.collected)} hint={`${data.rate}% of expected · ${data.cleared} cleared`} tone="text-emerald-700" />
            <Tile label="Still owed this term" value={formatKes(data.outstanding)} tone="text-amber-700" />
            <Tile label="Collected today" value={formatKes(data.today)} hint={`${formatKes(data.week)} in the last 7 days`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="card lg:col-span-3">
              <h2 className="font-semibold text-brand-800">Collection by class</h2>
              <ul className="mt-4 space-y-3">
                {data.classes.map((row) => {
                  const rate = row.expected ? Math.round((row.collected / row.expected) * 100) : 0;
                  return (
                    <li key={row.name} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
                      <span className="font-semibold text-brand-700">{row.name}</span>
                      <div className="h-3 overflow-hidden rounded-full bg-brand-50">
                        <div className={`h-full rounded-full ${rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-gold-500" : "bg-red-400"}`} style={{ width: `${rate}%` }} />
                      </div>
                      <span className="w-40 text-right font-mono text-xs text-brand-500"><span className="font-semibold text-brand-800">{rate}%</span> · {formatKes(row.outstanding)} owed</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="card lg:col-span-2">
              <h2 className="font-semibold text-brand-800">Last 7 days</h2>
              <div className="mt-3 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.days.map((day) => ({ ...day, label: format(new Date(day.date), "EEE") }))} margin={{ left: -10 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={(value) => formatKes(value)} />
                    <Bar dataKey="amount" fill="#1E3A6B" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(data.by_method).map(([method, amount]) => (
                  <span key={method} className={`badge ${METHOD_STYLES[method] || "bg-brand-100 text-brand-700"}`}>{method} {formatKes(amount)}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-0">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="font-semibold text-brand-800">Latest payments</h2>
              <Link to={`${base}/payments`} className="text-sm font-semibold text-brand-600 hover:underline">See all</Link>
            </div>
            <ul className="mt-2 divide-y divide-brand-50">
              {data.recent.map((payment) => (
                <li key={payment.id}>
                  <Link to={`${base}/receipts/${payment.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm hover:bg-brand-50">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Wallet size={16} /></span>
                    <span className="min-w-40 flex-1">
                      <span className="block font-semibold">{payment.student_name}</span>
                      <span className="text-xs text-brand-400">{payment.classroom_name} · {format(new Date(payment.paid_on), "d MMM")}</span>
                    </span>
                    <span className={`badge ${METHOD_STYLES[payment.method]}`}>{payment.method}</span>
                    <span className="w-28 text-right font-mono font-semibold">{formatKes(payment.amount)}</span>
                    <span className="hidden w-32 text-right font-mono text-xs text-brand-400 sm:block">{payment.receipt_number}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-brand-500">All terms together, {data.learners_owing} learners owe <span className="font-mono font-semibold text-brand-800">{formatKes(data.all_outstanding)}</span>.</p>
        </>
      )}
    </div>
  );
}
