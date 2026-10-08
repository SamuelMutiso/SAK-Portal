const TONES = {
  navy: "bg-brand-100 text-brand-700",
  gold: "bg-gold-100 text-gold-600",
  green: "bg-emerald-100 text-emerald-700",
  violet: "bg-violet-100 text-violet-700",
};

export default function StatCard({ icon: Icon, label, value, hint, tone = "navy" }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${TONES[tone]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm font-semibold text-brand-500">{label}</p>
        <p className="font-mono text-2xl font-semibold text-brand-800">{value}</p>
        {hint && <p className="text-xs text-brand-400">{hint}</p>}
      </div>
    </div>
  );
}
