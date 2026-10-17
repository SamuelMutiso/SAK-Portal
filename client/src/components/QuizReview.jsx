import { CheckCircle2, XCircle } from "lucide-react";

const LEVELS = {
  EE: { label: "Exceeding expectation", tone: "bg-emerald-100 text-emerald-700" },
  ME: { label: "Meeting expectation", tone: "bg-brand-100 text-brand-700" },
  AE: { label: "Approaching expectation", tone: "bg-amber-100 text-amber-700" },
  BE: { label: "Below expectation", tone: "bg-red-100 text-red-700" },
};

export function cheer(percent) {
  if (percent >= 90) return "Excellent work! 🌟";
  if (percent >= 75) return "Great job! 👏";
  if (percent >= 50) return "Good effort. Keep practising!";
  return "Keep going. Look at the answers below and try again.";
}

export default function QuizReview({ result, review, name }) {
  const level = LEVELS[result.level] || LEVELS.ME;
  return (
    <div className="space-y-5">
      <div className="card flex flex-col items-center gap-2 py-8 text-center">
        {name && <p className="text-sm font-semibold text-brand-400">{name}</p>}
        <p className="font-headline text-6xl font-extrabold text-brand-800">{result.percent}%</p>
        <p className="font-mono text-sm text-brand-500">{result.score} out of {result.total} marks</p>
        <span className={`badge ${level.tone}`}>{result.level} · {level.label}</span>
        <p className="mt-1 font-semibold text-brand-700">{cheer(result.percent)}</p>
        {result.late && <p className="text-xs text-amber-700">Handed in after the time limit.</p>}
      </div>
      <ol className="space-y-3">
        {review.map((item, index) => (
          <li key={item.id} className={`card border-l-4 ${item.correct ? "border-l-emerald-500" : "border-l-red-400"}`}>
            <div className="flex items-start gap-3">
              {item.correct ? <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" aria-label="Correct" /> : <XCircle size={22} className="mt-0.5 shrink-0 text-red-500" aria-label="Wrong" />}
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-xs font-semibold text-brand-400">Question {index + 1}</p>
                <p className="whitespace-pre-line break-words font-semibold text-brand-800">{item.prompt}</p>
                <p className="break-words text-sm"><span className="text-brand-400">Answer given: </span><span className={item.correct ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>{item.given || "No answer"}</span></p>
                {!item.correct && <p className="break-words text-sm"><span className="text-brand-400">Right answer: </span><span className="font-semibold text-emerald-700">{item.right_answer}</span></p>}
                {item.explanation && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{item.explanation}</p>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
