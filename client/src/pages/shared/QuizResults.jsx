import { ArrowLeft, BarChart3, Clock3, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import api from "../../api/client";
import Loader from "../../components/Loader";
import QuizReview from "../../components/QuizReview";
import StatCard from "../../components/StatCard";

const TONE = { EE: "bg-emerald-100 text-emerald-700", ME: "bg-brand-100 text-brand-700", AE: "bg-amber-100 text-amber-700", BE: "bg-red-100 text-red-700" };

export default function QuizResults() {
  const user = useSelector((state) => state.auth.user);
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.get(`/quizzes/${id}/results`).then(({ data: result }) => setData(result));
  }, [id]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => event.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  if (!data) return <Loader />;

  const { quiz } = data;
  const placement = quiz.purpose === "placement";
  const back = placement ? `/${user.role}/placement` : `/${user.role}/quizzes`;

  const show = async (row) => {
    const { data: attempt } = await api.get(`/attempts/${row.id}`);
    setOpen({ ...attempt, name: row.name });
  };

  return (
    <div className="space-y-6">
      <Link to={back} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft size={16} /> Back</Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{quiz.classroom_name} · {quiz.subject}</p>
        <h1 className="page-title mt-1">{quiz.title}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label={placement ? "Applicants tested" : "Learners done"} value={data.learners.length} hint={placement ? "" : `${data.not_yet.length} not yet`} />
        <StatCard icon={BarChart3} tone="gold" label="Average score" value={data.average === null ? "-" : `${data.average}%`} />
        <StatCard icon={Clock3} tone="violet" label="Questions" value={quiz.question_count} hint={quiz.time_limit ? `${quiz.time_limit} minute limit` : "No time limit"} />
      </div>

      {data.hardest.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-brand-800">Questions most got wrong</h2>
          <p className="text-sm text-brand-500">Worth going over again in class.</p>
          <ul className="mt-3 space-y-3">
            {data.hardest.map((item) => (
              <li key={item.id}>
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words text-brand-800">{item.prompt}</span>
                  <span className="shrink-0 font-mono font-semibold text-brand-700">{item.percent_right}% right</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-brand-50"><div className={`h-2 rounded-full ${item.percent_right < 50 ? "bg-red-400" : "bg-gold-500"}`} style={{ width: `${Math.max(item.percent_right, 2)}%` }} /></div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <h2 className="px-5 pt-5 font-semibold text-brand-800">{placement ? "Applicants" : "Learners"}</h2>
        {data.learners.length === 0 ? (
          <p className="px-5 pb-5 pt-2 text-sm text-brand-500">No results yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-brand-50">
            {data.learners.map((row) => (
              <li key={row.id}>
                <button type="button" onClick={() => show(row)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-brand-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-brand-800">{row.name}</p>
                    <p className="text-xs text-brand-400">
                      {row.score} of {row.total} marks{row.attempts > 1 ? ` · ${row.attempts} tries` : ""}{row.late ? " · late" : ""}{row.candidate_phone ? ` · ${row.candidate_phone}` : ""}
                    </p>
                  </div>
                  <span className={`badge ${TONE[row.level]}`}>{row.level}</span>
                  <span className="w-12 text-right font-mono font-semibold text-brand-800">{row.percent}%</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!placement && data.not_yet.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-brand-800">Not done yet ({data.not_yet.length})</h2>
          <p className="mt-2 text-sm text-brand-600">{data.not_yet.join(", ")}</p>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-cream" role="dialog" aria-label={`Answers from ${open.name}`}>
          <header className="flex items-center gap-3 border-b border-brand-100 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <p className="min-w-0 flex-1 truncate font-semibold text-brand-800">{open.name}</p>
            <button type="button" onClick={() => setOpen(null)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-brand-50" aria-label="Close"><X size={20} /></button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-5"><div className="mx-auto max-w-2xl"><QuizReview result={open.result} review={open.review} /></div></div>
        </div>
      )}
    </div>
  );
}
