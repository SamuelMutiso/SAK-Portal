import { Lightbulb } from "lucide-react";
import { termShort } from "../constants";
import { showValue } from "../insights";
import Change from "./Change";
import GradeBadge from "./GradeBadge";

export default function StudentInsights({ data }) {
  const { scale } = data;
  if (data.empty) return <p className="card text-brand-500">{data.headlines[0]}</p>;

  const stats = [
    { label: `${data.label} average`, value: data.mean, grade: data.grade },
    { label: `${termShort(data.term)} average`, value: data.term_mean, grade: data.term_grade },
    { label: "Year average", value: data.year_mean, grade: data.year_grade },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-brand-800 p-6 text-white">
        <p className="flex items-center gap-2 text-sm font-semibold text-gold-400"><Lightbulb size={16} /> At a glance · {data.label}</p>
        <ul className="mt-3 space-y-1.5 text-brand-50">
          {data.headlines.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl bg-brand-50 px-4 py-3">
            <p className="text-xs font-semibold text-brand-500">{item.label}</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="font-mono text-xl font-semibold text-brand-800">{showValue(item.value, scale)}</p>
              <GradeBadge grade={item.grade} />
            </div>
          </div>
        ))}
        <div className="rounded-2xl bg-gold-100 px-4 py-3">
          <p className="text-xs font-semibold text-gold-600">Position in class</p>
          <p className="mt-1 font-mono text-xl font-semibold text-brand-800">{data.position ? `${data.position} of ${data.class_size}` : "-"}</p>
        </div>
      </div>

      {data.needs_improvement.length > 0 && (
        <div className="card border-l-4 border-amber-400">
          <h3 className="font-semibold text-amber-700">Needs improvement</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.needs_improvement.map((item) => (
              <li key={item.subject}><span className="font-semibold">{item.subject}</span>: {item.note}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-brand-50 text-left text-xs text-brand-500">
            <tr>
              <th className="px-4 py-2.5">Subject</th>
              <th className="px-4 py-2.5 text-right">Score</th>
              <th className="px-4 py-2.5">Level</th>
              <th className="px-4 py-2.5">{data.previous_label ? `vs ${data.previous_label}` : "Change"}</th>
              <th className="px-4 py-2.5 text-right">Class avg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {data.subjects.map((item) => (
              <tr key={item.subject}>
                <td className="px-4 py-2.5 font-semibold">{item.subject}</td>
                <td className="px-4 py-2.5 text-right font-mono">{showValue(item.value, scale)}</td>
                <td className="px-4 py-2.5"><GradeBadge grade={item.grade} /></td>
                <td className="px-4 py-2.5"><Change value={item.change} /></td>
                <td className="px-4 py-2.5 text-right font-mono text-brand-500">{showValue(item.class_mean, scale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
