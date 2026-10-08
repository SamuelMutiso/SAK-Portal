import { Ban, KeyRound, LogIn, Pencil, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import AuditEntry from "../../components/AuditEntry";
import Loader from "../../components/Loader";
import StatCard from "../../components/StatCard";

export default function Security() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/owner/overview").then(({ data: result }) => setData(result));
  }, []);

  if (!data) return <Loader />;

  const { integrity } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Security overview</h1>
        <p className="mt-2 text-brand-500">Everything staff, parents and drivers did in the last 7 days.</p>
      </div>

      {integrity.ok ? (
        <div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={28} />
          <div>
            <p className="font-semibold text-emerald-900">The audit trail is intact</p>
            <p className="text-sm text-emerald-800">All {integrity.checked} records were checked against their fingerprints. Nobody has edited or deleted any record.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4 rounded-2xl border border-red-300 bg-red-50 p-5">
          <ShieldAlert className="mt-0.5 shrink-0 text-red-600" size={28} />
          <div>
            <p className="font-semibold text-red-900">The audit trail has been tampered with</p>
            <p className="text-sm text-red-800">Record #{integrity.broken_at} no longer matches its fingerprint. Someone changed the database directly. Contact your developer immediately.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Pencil} label="Changes made" value={data.counts.change} />
        <StatCard icon={LogIn} tone="green" label="Sign-ins" value={data.counts.login} />
        <StatCard icon={KeyRound} tone="violet" label="Failed sign-ins" value={data.counts.login_failed} />
        <StatCard icon={Ban} tone="gold" label="Blocked attempts" value={data.counts.blocked} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold text-brand-800">Failed sign-in attempts</h2>
          <p className="text-sm text-brand-500">Repeated failures from one place can mean someone is guessing a password.</p>
          <ul className="mt-3 divide-y divide-brand-50">
            {data.failed_logins.length === 0 && <li className="py-2 text-sm text-brand-400">None this week.</li>}
            {data.failed_logins.map((item) => (
              <li key={`${item.name}${item.ip}`} className="flex items-center gap-3 py-2.5 text-sm">
                <div className="flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-brand-400"><span className="font-mono">{item.ip}</span> · {item.location}</p>
                </div>
                <span className={`badge ${item.count >= 3 ? "bg-red-100 text-red-700" : "bg-brand-50 text-brand-600"}`}>{item.count} tries</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="font-semibold text-brand-800">Most active this week</h2>
          <ul className="mt-3 divide-y divide-brand-50">
            {data.most_active.map((item) => (
              <li key={item.name} className="flex items-center justify-between py-2.5 text-sm">
                <span><span className="font-semibold">{item.name}</span> <span className="text-brand-400">({item.role})</span></span>
                <span className="font-mono text-brand-600">{item.count} changes</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-800">Latest changes and blocked attempts</h2>
          <Link to="/owner/audit" className="text-sm font-semibold text-brand-600 hover:underline">Open full audit trail</Link>
        </div>
        <ul className="mt-3 space-y-2">
          {data.latest.map((entry) => <AuditEntry key={entry.id} entry={entry} />)}
        </ul>
      </div>
    </div>
  );
}
