import { ArrowLeft, ArrowRight, Clock, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api/client";

function clock(seconds) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export default function QuizTaker({ session, onDone, onClose, takerName }) {
  const { quiz, questions } = session;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(session.seconds_left);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const sent = useRef(false);
  const latest = useRef(answers);
  latest.current = answers;
  const question = questions[index];
  const answered = questions.filter((item) => String(answers[item.id] ?? "").trim() !== "").length;

  const handIn = useCallback(async () => {
    if (sent.current) return;
    sent.current = true;
    setSending(true);
    setError(null);
    try {
      const { data } = await api.post(`/attempts/${session.attempt_id}/submit`, { answers: latest.current });
      onDone(data);
    } catch (err) {
      sent.current = false;
      setError(errorMessage(err));
      setSending(false);
    }
  }, [onDone, session.attempt_id]);

  useEffect(() => {
    if (left === null || left === undefined) return undefined;
    if (left <= 0) {
      handIn();
      return undefined;
    }
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, handIn]);

  useEffect(() => {
    const warn = (event) => {
      if (sent.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.body.style.overflow = "";
    };
  }, []);

  const set = (value) => setAnswers({ ...answers, [question.id]: value });
  const last = index === questions.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-cream" role="dialog" aria-label={quiz.title}>
      <header className="border-b border-brand-100 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-brand-500 hover:bg-brand-50" aria-label="Leave quiz">
            <X size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-brand-800">{quiz.title}</p>
            <p className="truncate text-xs text-brand-400">{takerName ? `${takerName} · ` : ""}{quiz.subject}</p>
          </div>
          {left !== null && left !== undefined && (
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-semibold ${left <= 60 ? "bg-red-100 text-red-700" : "bg-brand-100 text-brand-700"}`} aria-live="polite">
              <Clock size={15} /> {clock(left)}
            </span>
          )}
        </div>
        <div className="mx-auto mt-3 flex max-w-2xl gap-1" aria-hidden="true">
          {questions.map((item, position) => (
            <button key={item.id} type="button" tabIndex={-1} onClick={() => setIndex(position)}
              className={`h-1.5 flex-1 rounded-full ${position === index ? "bg-gold-500" : String(answers[item.id] ?? "").trim() ? "bg-brand-600" : "bg-brand-100"}`} />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-5">
          {index === 0 && quiz.instructions && <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">{quiz.instructions}</p>}
          <p className="text-sm font-semibold text-brand-400">Question {index + 1} of {questions.length}{question.points > 1 ? ` · ${question.points} marks` : ""}</p>
          <h2 className="whitespace-pre-line break-words text-xl font-semibold leading-snug text-brand-900">{question.prompt}</h2>
          {question.kind === "choice" ? (
            <div className="space-y-3" role="radiogroup" aria-label="Choices">
              {question.options.map((option, position) => {
                const picked = String(answers[question.id]) === String(position);
                return (
                  <button key={position} type="button" role="radio" aria-checked={picked} onClick={() => set(String(position))}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left text-base font-medium transition ${picked ? "border-brand-700 bg-brand-700 text-white" : "border-brand-100 bg-white text-brand-800 hover:border-brand-300"}`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${picked ? "bg-gold-500 text-brand-900" : "bg-brand-50 text-brand-500"}`}>{String.fromCharCode(65 + position)}</span>
                    <span className="break-words">{option}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <label htmlFor="quiz-answer" className="label">Your answer</label>
              <input id="quiz-answer" className="input text-lg" autoComplete="off" autoCapitalize="off" maxLength={300} value={answers[question.id] ?? ""}
                onChange={(event) => set(event.target.value)} onKeyDown={(event) => event.key === "Enter" && !last && setIndex(index + 1)} />
            </div>
          )}
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {confirming && (
            <div className="rounded-2xl border border-gold-400 bg-gold-100 p-4 text-sm text-brand-800">
              <p className="font-semibold">{questions.length - answered} question{questions.length - answered === 1 ? " is" : "s are"} not answered.</p>
              <p className="mt-1">Hand in anyway, or go back and answer {questions.length - answered === 1 ? "it" : "them"}?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={handIn} disabled={sending} className="btn-primary">Hand in anyway</button>
                <button type="button" onClick={() => { setConfirming(false); setIndex(questions.findIndex((item) => String(answers[item.id] ?? "").trim() === "")); }} className="btn-ghost">Go back</button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-brand-100 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0} className="btn-ghost h-12 px-4" aria-label="Previous question">
            <ArrowLeft size={18} /> <span className="hidden sm:inline">Back</span>
          </button>
          <span className="flex-1 text-center text-sm text-brand-400">{answered} of {questions.length} answered</span>
          {last ? (
            <button type="button" disabled={sending} onClick={() => (answered < questions.length ? setConfirming(true) : handIn())} className="btn-gold h-12 px-5">
              <Send size={18} /> {sending ? "Marking…" : "Hand in"}
            </button>
          ) : (
            <button type="button" onClick={() => setIndex(index + 1)} className="btn-primary h-12 px-5">
              Next <ArrowRight size={18} />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
