export default function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon size={22} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{label}</p>
        <p className="font-mono text-2xl font-semibold text-brand-800">{value}</p>
        {hint && <p className="text-xs text-brand-400">{hint}</p>}
      </div>
    </div>
  );
}
