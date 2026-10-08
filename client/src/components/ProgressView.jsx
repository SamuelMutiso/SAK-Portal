import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import TrendChart from "./TrendChart";

function Sparkline({ points, scale }) {
  if (points.length < 2) return null;
  const max = scale === "marks" ? 100 : 4;
  const min = scale === "marks" ? 0 : 1;
  const width = 96;
  const height = 28;
  const coords = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.value - min) / (max - min)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <polyline points={coords} fill="none" stroke="#3D63A0" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function Change({ value, scale }) {
  if (value === null || value === undefined) return <span className="text-xs text-brand-300">--</span>;
  const threshold = scale === "marks" ? 2 : 0.25;
  if (value >= threshold) {
    return <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-600"><ArrowUpRight size={16} />{scale === "marks" ? `+${value}` : "Up"}</span>;
  }
  if (value <= -threshold) {
    return <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-red-600"><ArrowDownRight size={16} />{scale === "marks" ? value : "Down"}</span>;
  }
  return <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-brand-400"><ArrowRight size={16} />Steady</span>;
}

export default function ProgressView({ trend, name }) {
  const marks = trend.scale === "marks";
  const overall = trend.overall;
  const first = overall[0];
  const last = overall[overall.length - 1];
  const improving = trend.subjects.filter((subject) => subject.change !== null && subject.change >= (marks ? 2 : 0.25));
  const dropping = trend.subjects.filter((subject) => subject.change !== null && subject.change <= -(marks ? 2 : 0.25));

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-brand-800">{name ? `${name}'s progress this year` : "Progress this year"}</h3>
            <p className="text-sm text-brand-500">{marks ? "Mean mark across all learning areas, every assessment" : "Average performance level, every assessment"}</p>
          </div>
          {first && last && marks && (
            <p className="text-sm text-brand-600">
              <span className="font-mono text-lg font-semibold text-brand-800">{first.value}%</span> in {first.label} to{" "}
              <span className="font-mono text-lg font-semibold text-brand-800">{last.value}%</span> in {last.label}
            </p>
          )}
        </div>
        <div className="mt-4">
          <TrendChart points={overall} scale={trend.scale} />
        </div>
      </div>

      {(improving.length > 0 || dropping.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-emerald-800">Improving since last assessment</p>
            <p className="mt-1 text-emerald-700">{improving.map((subject) => subject.name).join(", ") || "No big changes"}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
            <p className="font-semibold text-red-800">Needs attention</p>
            <p className="mt-1 text-red-700">{dropping.map((subject) => subject.name).join(", ") || "Nothing dropping"}</p>
          </div>
        </div>
      )}

      <div className="card p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-100 text-left text-brand-400">
              <th className="px-5 py-3 font-semibold">Learning area</th>
              <th className="hidden px-3 py-3 font-semibold sm:table-cell">Across the year</th>
              <th className="px-3 py-3 text-right font-semibold">Latest</th>
              <th className="px-5 py-3 text-right font-semibold">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {trend.subjects.map((subject) => (
              <tr key={subject.name}>
                <td className="px-5 py-2.5 font-semibold">{subject.name}</td>
                <td className="hidden px-3 py-2.5 sm:table-cell"><Sparkline points={subject.points} scale={trend.scale} /></td>
                <td className="px-3 py-2.5 text-right font-mono">{subject.latest === null ? "--" : marks ? subject.latest : subject.latest.toFixed(1)}</td>
                <td className="px-5 py-2.5 text-right"><Change value={subject.change} scale={trend.scale} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
