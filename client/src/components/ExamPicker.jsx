import { EXAMS, YEARS } from "../constants";

export default function ExamPicker({ term, exam, onChange, showExam = true }) {
  const [, number, year] = term.split(" ");

  function set(nextNumber, nextYear, nextExam) {
    onChange({ term: `Term ${nextNumber} ${nextYear}`, exam: nextExam });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="label" htmlFor="exam-year">Year</label>
        <select id="exam-year" className="input w-28" value={year} onChange={(event) => set(number, event.target.value, exam)}>
          {YEARS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div>
        <p className="label">Term</p>
        <div className="flex gap-1 rounded-xl bg-brand-50 p-1">
          {["1", "2", "3"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => set(item, year, exam)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${number === item ? "bg-brand-700 text-white" : "text-brand-600 hover:bg-white"}`}
            >
              Term {item}
            </button>
          ))}
        </div>
      </div>
      {showExam && (
        <div>
          <p className="label">Exam</p>
          <div className="flex gap-1 rounded-xl bg-brand-50 p-1">
            {EXAMS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => set(number, year, item)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${exam === item ? "bg-gold-500 text-brand-900" : "text-brand-600 hover:bg-white"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
