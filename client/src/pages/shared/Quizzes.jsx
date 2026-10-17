import { BarChart3, Clock, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api from "../../api/client";
import Loader from "../../components/Loader";

export function QuizCard({ quiz, base, canEdit, onDelete, children }) {
  return (
    <article className="card flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-600"><ListChecks size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{quiz.subject}{quiz.topic ? ` · ${quiz.topic}` : ""}</p>
          <h3 className="mt-0.5 font-semibold text-brand-800">{quiz.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-400">
            <span>{quiz.classroom_name}</span>
            <span>{quiz.question_count} questions</span>
            {quiz.time_limit && <span className="inline-flex items-center gap-1"><Clock size={12} /> {quiz.time_limit} min</span>}
          </p>
        </div>
        <span className={`badge shrink-0 ${quiz.is_published ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-600"}`}>{quiz.is_published ? "Live" : "Draft"}</span>
      </div>
      <p className="text-sm text-brand-600">
        {quiz.learners_done ? <>{quiz.learners_done} done · average <span className="font-semibold text-brand-800">{quiz.average}%</span></> : "Nobody has taken it yet"}
      </p>
      <div className="mt-auto flex flex-wrap gap-2">
        <Link to={`${base}/${quiz.id}/results`} className="btn-primary"><BarChart3 size={16} /> Results</Link>
        {canEdit && <Link to={`${base}/${quiz.id}/edit`} className="btn-ghost"><Pencil size={16} /> Edit</Link>}
        {canEdit && (
          <button type="button" onClick={() => onDelete(quiz)} className="btn-ghost text-red-600" aria-label={`Delete ${quiz.title}`}><Trash2 size={16} /></button>
        )}
        {children}
      </div>
    </article>
  );
}

export default function Quizzes() {
  const user = useSelector((state) => state.auth.user);
  const base = `/${user.role}/quizzes`;
  const canCreate = user.role === "teacher" || user.role === "admin";
  const [classes, setClasses] = useState(null);
  const [classId, setClassId] = useState("");
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get("/classes").then(({ data }) => {
      setClasses(data);
      if (user.role === "teacher") setClassId(data[0]?.id || "");
    });
  }, [user.role]);

  useEffect(() => {
    setItems(null);
    api.get("/quizzes", { params: classId ? { classroom_id: classId } : {} }).then(({ data }) => setItems(data));
  }, [classId]);

  const remove = async (quiz) => {
    if (!window.confirm(`Delete "${quiz.title}" and all its results?`)) return;
    await api.delete(`/quizzes/${quiz.id}`);
    setItems(items.filter((item) => item.id !== quiz.id));
  };

  if (!classes) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Quizzes</h1>
          <p className="mt-1 text-brand-500">Short practice quizzes, marked automatically. Parents open them on their child's Quizzes tab.</p>
        </div>
        {canCreate && <Link to={`${base}/new`} className="btn-primary"><Plus size={18} /> New quiz</Link>}
      </div>

      {user.role !== "teacher" && (
        <div className="max-w-xs">
          <label htmlFor="quiz-class" className="label">Class</label>
          <select id="quiz-class" className="input" value={classId} onChange={(event) => setClassId(event.target.value ? Number(event.target.value) : "")}>
            <option value="">All classes</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      )}

      {!items ? <Loader /> : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-10 text-center text-brand-500">
          <ListChecks size={32} className="text-brand-300" />
          <p className="font-semibold text-brand-700">No quizzes yet</p>
          {canCreate && <p className="text-sm">Create one in a few minutes. Learners get their score the moment they hand in.</p>}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} base={base} canEdit={canCreate} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
