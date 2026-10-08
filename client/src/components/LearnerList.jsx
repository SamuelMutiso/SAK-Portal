import { ArrowUpRight } from "lucide-react";

export default function LearnerList({ learners, scale, showChange = false, empty = "No data yet." }) {
  if (!learners.length) return <p className="text-sm text-brand-400">{empty}</p>;
  const marks = scale === "marks";

  return (
    <ol className="space-y-1.5">
      {learners.map((learner, index) => (
        <li key={learner.id} className="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2 text-sm">
          <span className="w-5 font-mono text-xs text-brand-400">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-brand-800">{learner.full_name}</p>
            {learner.classroom_name && <p className="text-xs text-brand-400">{learner.classroom_name}</p>}
          </div>
          {showChange ? (
            <span className="inline-flex items-center gap-0.5 font-mono text-sm font-semibold text-emerald-600">
              <ArrowUpRight size={14} />{marks ? `+${learner.change}` : `+${learner.change.toFixed(1)}`}
            </span>
          ) : (
            <span className="font-mono font-semibold text-brand-800">{marks ? `${learner.latest}%` : learner.latest.toFixed(1)}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
