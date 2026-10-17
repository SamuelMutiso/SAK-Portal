import { CheckCircle2, ClipboardCheck, Clock, ListChecks, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../../../api/client";
import Loader from "../../../components/Loader";
import QuizReview from "../../../components/QuizReview";
import QuizTaker from "../../../components/QuizTaker";

export default function Quizzes({ student }) {
  const [items, setItems] = useState(null);
  const [session, setSession] = useState(null);
  const [shown, setShown] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(null);

  const load = useCallback(() => {
    api.get("/quizzes", { params: { student_id: student.id } }).then(({ data }) => setItems(data));
  }, [student.id]);

  useEffect(load, [load]);

  const start = async (quiz) => {
    setError(null);
    setStarting(quiz.id);
    try {
      const { data } = await api.post(`/quizzes/${quiz.id}/start`, { student_id: student.id });
      setSession(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setStarting(null);
    }
  };

  const finished = useCallback((data) => {
    setSession(null);
    setShown({ ...data, title: session?.quiz.title });
    load();
    window.scrollTo({ top: 0 });
  }, [load, session]);

  const openLatest = async (quiz) => {
    const { data } = await api.get(`/attempts/${quiz.my_latest.id}`);
    setShown({ ...data, title: quiz.title });
  };

  if (!items) return <Loader />;

  if (shown) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setShown(null)} className="btn-ghost">Back to quizzes</button>
        {shown.title && <h2 className="text-lg font-semibold text-brand-800">{shown.title}</h2>}
        <QuizReview result={shown.result} review={shown.review} name={student.full_name} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {session && <QuizTaker session={session} takerName={student.first_name} onDone={finished} onClose={() => { if (window.confirm("Leave this quiz? Answers so far will not be saved.")) setSession(null); }} />}
      <p className="text-sm text-brand-500">Short practice quizzes from {student.first_name}'s teachers. They are marked straight away and do not count on the report card.</p>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-10 text-center text-brand-500">
          <ListChecks size={32} className="text-brand-300" />
          <p className="font-semibold text-brand-700">No quizzes yet</p>
          <p className="text-sm">When {student.first_name}'s teacher sets a quiz, it will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((quiz) => (
            <article key={quiz.id} className="card flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${quiz.my_latest ? "bg-emerald-100 text-emerald-700" : "bg-gold-100 text-gold-600"}`}>
                  {quiz.my_latest ? <CheckCircle2 size={20} /> : <ClipboardCheck size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{quiz.subject}{quiz.topic ? ` · ${quiz.topic}` : ""}</p>
                  <h3 className="mt-0.5 font-semibold text-brand-800">{quiz.title}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-400">
                    <span>{quiz.question_count} questions</span>
                    {quiz.time_limit && <span className="inline-flex items-center gap-1"><Clock size={12} /> {quiz.time_limit} min</span>}
                    {quiz.teacher_name && <span>{quiz.teacher_name}</span>}
                  </p>
                </div>
              </div>
              {quiz.my_latest ? (
                <p className="text-sm text-brand-600">
                  Last score <span className="font-semibold text-brand-800">{quiz.my_latest.percent}%</span>
                  {quiz.my_attempts > 1 && <> · best {quiz.my_best}% · {quiz.my_attempts} tries</>}
                </p>
              ) : (
                <p className="text-sm font-semibold text-gold-600">Not done yet</p>
              )}
              <div className="mt-auto flex flex-wrap gap-2">
                <button type="button" onClick={() => start(quiz)} disabled={starting === quiz.id} className={quiz.my_latest ? "btn-ghost" : "btn-gold"}>
                  {quiz.my_latest ? <><RotateCcw size={16} /> Try again</> : starting === quiz.id ? "Opening…" : "Start quiz"}
                </button>
                {quiz.my_latest && <button type="button" onClick={() => openLatest(quiz)} className="btn-primary">See answers</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
