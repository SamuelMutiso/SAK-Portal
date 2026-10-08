import { useState } from "react";
import { lessonsFor } from "../timetable";

export default function TimetableGrid({ timetable, editable = false, onChange, highlightDay }) {
  const [mobileDay, setMobileDay] = useState(highlightDay ?? 0);

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="w-24 text-left text-xs font-semibold text-brand-400">Time</th>
              {timetable.days.map((day, index) => (
                <th key={day} className={`rounded-lg py-2 text-xs font-semibold ${index === highlightDay ? "bg-gold-400 text-brand-900" : "text-brand-500"}`}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timetable.bells.map((bell) => (
              <tr key={bell.start}>
                <td className="whitespace-nowrap font-mono text-xs text-brand-400">{bell.start}–{bell.end}</td>
                {bell.period ? (
                  timetable.days.map((day, dayIndex) => {
                    const slot = timetable.slots.find((item) => item.day === dayIndex && item.period === bell.period);
                    return (
                      <td key={day} className={`rounded-lg p-0 ${dayIndex === highlightDay ? "bg-gold-100" : "bg-brand-50"}`}>
                        {editable ? (
                          <select
                            value={slot?.subject || ""}
                            onChange={(event) => onChange(dayIndex, bell.period, event.target.value)}
                            className="w-full cursor-pointer rounded-lg bg-transparent px-2 py-2 text-xs font-semibold text-brand-800 outline-none focus:ring-2 focus:ring-brand-300"
                            aria-label={`${day} lesson ${bell.period}`}
                          >
                            <option value="">Free</option>
                            {timetable.subjects.map((subject) => <option key={subject}>{subject}</option>)}
                          </select>
                        ) : (
                          <p className="px-2 py-2 text-xs font-semibold text-brand-800">{slot?.subject || <span className="text-brand-300">Free</span>}</p>
                        )}
                      </td>
                    );
                  })
                ) : (
                  <td colSpan={timetable.days.length} className="rounded-lg bg-brand-100/50 py-1 text-center text-xs font-semibold text-brand-500">{bell.label}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-brand-50 p-1">
          {timetable.days.map((day, index) => (
            <button
              key={day}
              onClick={() => setMobileDay(index)}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold ${mobileDay === index ? "bg-brand-700 text-white" : "text-brand-600"}`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        <ul className="mt-3 space-y-1.5">
          {lessonsFor(timetable, mobileDay).map((lesson) => (
            <li key={lesson.start} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${lesson.isBreak ? "bg-brand-100/50 text-brand-500" : "bg-white shadow-sm"}`}>
              <span className="w-24 font-mono text-xs text-brand-400">{lesson.start}–{lesson.end}</span>
              <span className="font-semibold">{lesson.isBreak ? lesson.label : lesson.subject || "Free"}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
