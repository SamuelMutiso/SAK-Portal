import { format } from "date-fns";
import { History } from "lucide-react";
import { termShort } from "../constants";

function mark(score, level) {
  return score !== null && score !== undefined ? `${score}%` : level;
}

export default function MarkChanges({ changes, showClass = false }) {
  return (
    <div className="card">
      <h3 className="flex items-center gap-2 font-semibold text-brand-800"><History size={17} /> Marks changed after entry</h3>
      <p className="mt-1 text-xs text-brand-400">Every change to a mark that was already saved, with the reason the teacher gave.</p>
      {changes.length === 0 ? (
        <p className="mt-3 text-sm text-brand-400">No marks have been changed.</p>
      ) : (
        <ul className="mt-3 divide-y divide-brand-50">
          {changes.map((item) => (
            <li key={item.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">{item.student_name}</span>
                {showClass && <span className="text-xs text-brand-400">{item.classroom_name}</span>}
                <span className="text-brand-500">{item.subject} · {termShort(item.term)} {item.exam}</span>
                <span className="ml-auto font-mono">
                  <span className="text-brand-400 line-through">{mark(item.old_score, item.old_level)}</span>
                  <span className="mx-1.5 text-brand-300">→</span>
                  <span className="font-semibold text-brand-800">{mark(item.new_score, item.new_level)}</span>
                </span>
              </div>
              <p className="mt-1 rounded-lg bg-gold-100 px-3 py-1.5 text-brand-800">“{item.reason}”</p>
              <p className="mt-1 text-xs text-brand-400">{item.changed_by} · {format(new Date(`${item.changed_at}Z`), "d MMM yyyy, h:mm a")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
