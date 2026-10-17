import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";

const blank = (kind = "choice") => ({ key: Math.random().toString(36).slice(2), kind, prompt: "", options: kind === "choice" ? ["", "", "", ""] : [], answer: kind === "choice" ? "" : "", explanation: "", points: 1 });

function QuestionEditor({ question, index, count, onChange, onRemove, onMove }) {
  const set = (changes) => onChange({ ...question, ...changes });
  const setOption = (position, value) => set({ options: question.options.map((item, place) => (place === position ? value : item)) });
  const removeOption = (position) => {
    const options = question.options.filter((_, place) => place !== position);
    const answer = question.answer === "" ? "" : Number(question.answer) === position ? "" : Number(question.answer) > position ? String(Number(question.answer) - 1) : question.answer;
    set({ options, answer });
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <p className="flex-1 font-semibold text-brand-800">Question {index + 1}</p>
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="grid h-10 w-10 place-items-center rounded-full text-brand-400 hover:bg-brand-50 disabled:opacity-30" aria-label="Move up"><ArrowUp size={18} /></button>
        <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className="grid h-10 w-10 place-items-center rounded-full text-brand-400 hover:bg-brand-50 disabled:opacity-30" aria-label="Move down"><ArrowDown size={18} /></button>
        <button type="button" onClick={onRemove} disabled={count === 1} className="grid h-10 w-10 place-items-center rounded-full text-brand-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" aria-label={`Remove question ${index + 1}`}><Trash2 size={18} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[["choice", "Multiple choice"], ["short", "Short answer"]].map(([kind, label]) => (
          <button key={kind} type="button" onClick={() => kind !== question.kind && set({ kind, options: kind === "choice" ? ["", "", "", ""] : [], answer: "" })}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${question.kind === kind ? "border-brand-700 bg-brand-700 text-white" : "border-brand-200 bg-white text-brand-700"}`}>{label}</button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor={`q-${question.key}`}>Question</label>
        <textarea id={`q-${question.key}`} rows={2} className="input" value={question.prompt} onChange={(event) => set({ prompt: event.target.value })} maxLength={2000} required />
      </div>
      {question.kind === "choice" ? (
        <div className="space-y-2">
          <p className="label">Choices · tap the circle next to the right answer</p>
          {question.options.map((option, position) => {
            const right = question.answer === String(position);
            return (
              <div key={position} className="flex items-center gap-2">
                <button type="button" onClick={() => set({ answer: String(position) })} aria-label={`Mark choice ${String.fromCharCode(65 + position)} as correct`} aria-pressed={right}
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${right ? "text-emerald-600" : "text-brand-300 hover:text-brand-500"}`}>
                  {right ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                <input className={`input ${right ? "border-emerald-400 ring-2 ring-emerald-100" : ""}`} value={option} maxLength={300} onChange={(event) => setOption(position, event.target.value)}
                  placeholder={`Choice ${String.fromCharCode(65 + position)}`} aria-label={`Choice ${String.fromCharCode(65 + position)}`} />
                <button type="button" onClick={() => removeOption(position)} disabled={question.options.length <= 2} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-brand-300 hover:text-red-600 disabled:opacity-30" aria-label={`Remove choice ${String.fromCharCode(65 + position)}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
          {question.options.length < 6 && (
            <button type="button" onClick={() => set({ options: [...question.options, ""] })} className="text-sm font-semibold text-brand-600"><Plus size={14} className="inline" /> Add a choice</button>
          )}
        </div>
      ) : (
        <div>
          <label className="label" htmlFor={`a-${question.key}`}>Accepted answers · one per line</label>
          <textarea id={`a-${question.key}`} rows={2} className="input" value={question.answer} onChange={(event) => set({ answer: event.target.value })} maxLength={500} placeholder={"13\nthirteen"} />
          <p className="mt-1 text-xs text-brand-400">Capital letters and extra spaces are ignored, and 0.5 matches .5.</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div>
          <label className="label" htmlFor={`e-${question.key}`}>Explanation shown after marking (optional)</label>
          <input id={`e-${question.key}`} className="input" value={question.explanation} onChange={(event) => set({ explanation: event.target.value })} maxLength={2000} />
        </div>
        <div>
          <label className="label" htmlFor={`p-${question.key}`}>Marks</label>
          <select id={`p-${question.key}`} className="input" value={question.points} onChange={(event) => set({ points: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function QuizBuilder() {
  const user = useSelector((state) => state.auth.user);
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [classes, setClasses] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [saving, setSaving] = useState(false);
  const placement = (quiz?.purpose || params.get("purpose")) === "placement";
  const back = placement ? `/${user.role}/placement` : `/${user.role}/quizzes`;

  useEffect(() => {
    Promise.all([api.get("/classes"), id ? api.get(`/quizzes/${id}`) : Promise.resolve(null)]).then(([classList, existing]) => {
      setClasses(classList.data);
      if (existing) {
        const data = existing.data;
        setQuiz({ ...data, topic: data.topic || "", instructions: data.instructions || "", time_limit: data.time_limit || "",
          questions: data.questions.map((item) => ({ ...item, key: String(item.id), options: item.options || [], explanation: item.explanation || "" })) });
      } else {
        const first = classList.data[0];
        const purpose = params.get("purpose") === "placement" ? "placement" : "practice";
        setQuiz({ classroom_id: first?.id || "", purpose, subject: purpose === "placement" ? "General" : first?.learning_areas[0] || "", topic: "", title: "", instructions: "", time_limit: purpose === "placement" ? 20 : "", is_published: true, questions: [blank()] });
      }
    });
  }, [id, params]);

  if (!classes || !quiz) return <Loader />;

  const classroom = classes.find((item) => item.id === Number(quiz.classroom_id));
  const areas = [...(placement ? ["General"] : []), ...(classroom?.learning_areas || [])];
  const locked = Boolean(id && quiz.attempt_count);
  const set = (changes) => setQuiz({ ...quiz, ...changes });
  const setQuestion = (index, value) => set({ questions: quiz.questions.map((item, place) => (place === index ? value : item)) });
  const move = (index, step) => {
    const questions = [...quiz.questions];
    [questions[index], questions[index + step]] = [questions[index + step], questions[index]];
    set({ questions });
  };

  const problem = () => {
    for (const [index, question] of quiz.questions.entries()) {
      if (!question.prompt.trim()) return `Question ${index + 1} needs the question text.`;
      if (question.kind === "choice") {
        const filled = question.options.filter((item) => item.trim());
        if (filled.length < 2) return `Question ${index + 1} needs at least two choices.`;
        if (question.answer === "" || !question.options[Number(question.answer)]?.trim()) return `Question ${index + 1}: tap the circle next to the right answer.`;
      } else if (!question.answer.trim()) return `Question ${index + 1} needs at least one accepted answer.`;
    }
    return null;
  };

  const save = async (publish) => {
    const found = locked ? null : problem();
    if (found) { setError(found); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setSaving(true);
    setError(null);
    const questions = quiz.questions.map((question) => {
      if (question.kind !== "choice") return { kind: "short", prompt: question.prompt, answer: question.answer, explanation: question.explanation || null, points: question.points };
      const kept = question.options.map((item, place) => ({ item: item.trim(), place })).filter(({ item }) => item);
      return { kind: "choice", prompt: question.prompt, options: kept.map(({ item }) => item), answer: String(kept.findIndex(({ place }) => place === Number(question.answer))), explanation: question.explanation || null, points: question.points };
    });
    const body = { classroom_id: Number(quiz.classroom_id), purpose: quiz.purpose, subject: quiz.subject, topic: quiz.topic || null, title: quiz.title,
      instructions: quiz.instructions || null, time_limit: quiz.time_limit ? Number(quiz.time_limit) : null, is_published: publish, questions };
    try {
      const { data } = id ? await api.put(`/quizzes/${id}`, body) : await api.post("/quizzes", body);
      if (data.note) { setNote(data.note); setSaving(false); return; }
      navigate(back);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <form onSubmit={(event) => { event.preventDefault(); save(true); }} className="mx-auto max-w-3xl space-y-5">
      <Link to={back} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline"><ArrowLeft size={16} /> Back</Link>
      <h1 className="page-title">{id ? "Edit" : "New"} {placement ? "placement test" : "quiz"}</h1>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {note && <p className="rounded-xl bg-gold-100 px-3 py-2 text-sm text-brand-800">{note} <Link to={back} className="font-semibold underline">Back to the list</Link></p>}
      {locked && <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">Learners have already taken this, so the questions are locked. You can still change the title, instructions, time limit and whether it is live.</p>}

      <div className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="quiz-class">{placement ? "Class the applicant is joining" : "Class"}</label>
            <select id="quiz-class" className="input" value={quiz.classroom_id} disabled={Boolean(id) || (user.role === "teacher" && classes.length === 1)}
              onChange={(event) => { const next = classes.find((item) => item.id === Number(event.target.value)); set({ classroom_id: Number(event.target.value), subject: placement ? "General" : next?.learning_areas[0] || "" }); }}>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="quiz-subject">Learning area</label>
            <select id="quiz-subject" className="input" value={quiz.subject} disabled={locked} onChange={(event) => set({ subject: event.target.value })}>
              {areas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="quiz-title">Title</label>
          <input id="quiz-title" className="input" value={quiz.title} onChange={(event) => set({ title: event.target.value })} required minLength={3} maxLength={150} placeholder={placement ? "e.g. Grade 4 entry test" : "e.g. Fractions check"} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="quiz-topic">Topic (optional)</label>
            <input id="quiz-topic" className="input" value={quiz.topic} disabled={locked} onChange={(event) => set({ topic: event.target.value })} maxLength={120} />
          </div>
          <div>
            <label className="label" htmlFor="quiz-time">Time limit in minutes (optional)</label>
            <input id="quiz-time" type="number" inputMode="numeric" min={1} max={180} className="input" value={quiz.time_limit} onChange={(event) => set({ time_limit: event.target.value })} placeholder="No limit" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="quiz-instructions">Instructions (optional)</label>
          <textarea id="quiz-instructions" rows={2} className="input" value={quiz.instructions} onChange={(event) => set({ instructions: event.target.value })} maxLength={2000} />
        </div>
      </div>

      {!locked && (
        <>
          {quiz.questions.map((question, index) => (
            <QuestionEditor key={question.key} question={question} index={index} count={quiz.questions.length}
              onChange={(value) => setQuestion(index, value)} onMove={(step) => move(index, step)}
              onRemove={() => set({ questions: quiz.questions.filter((_, place) => place !== index) })} />
          ))}
          {quiz.questions.length < 60 && (
            <button type="button" onClick={() => set({ questions: [...quiz.questions, blank(quiz.questions.at(-1)?.kind)] })} className="btn-ghost w-full border-dashed py-4">
              <Plus size={18} /> Add question
            </button>
          )}
        </>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t border-brand-100 bg-cream/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:flex-row sm:justify-end md:mx-0 md:rounded-2xl md:border md:px-3">
        <button type="button" onClick={() => save(false)} disabled={saving} className="btn-ghost">Save as draft</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : placement ? "Save test" : "Publish to parents"}</button>
      </div>
    </form>
  );
}
