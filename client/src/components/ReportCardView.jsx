import { format } from "date-fns";
import { Printer } from "lucide-react";
import { EXAMS, LEVELS, levelForScore } from "../constants";
import SeenButton from "./SeenButton";

function LevelBadge({ level }) {
  if (!level) return <span className="text-brand-300">--</span>;
  return (
    <span className={`badge font-mono ${LEVELS[level].style}`} title={LEVELS[level].label}>
      {level}
    </span>
  );
}

function formatDate(value) {
  return value ? format(new Date(value), "EEEE d MMMM yyyy") : "To be announced";
}

export default function ReportCardView({ data, competencies, values, seenKeys, onSeen }) {
  const { student, term, assessments, report, attendance } = data;
  const exams = EXAMS.filter((exam) => assessments.some((record) => record.exam === exam));

  function recordFor(area, exam) {
    return assessments.find((record) => record.subject === area && record.exam === exam);
  }

  function latestLevel(area) {
    const latest = [...exams].reverse().map((exam) => recordFor(area, exam)).find(Boolean);
    return latest?.level;
  }

  const latestExam = exams[exams.length - 1];
  const latestScores = data.learning_areas.map((area) => recordFor(area, latestExam)?.score).filter((score) => score !== undefined && score !== null);
  const mean = latestScores.length ? Math.round(latestScores.reduce((sum, score) => sum + score, 0) / latestScores.length) : null;

  return (
    <div className="card space-y-6 print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-center gap-4 border-b border-brand-100 pb-4">
        <img src="/logo.png" alt="Success Academy crest" className="h-16 w-16 object-contain" />
        <div className="flex-1">
          <p className="font-headline text-2xl font-extrabold uppercase leading-none text-brand-800">Success Academy Kitengela</p>
          <p className="mt-1 text-sm text-brand-500">Learner progress report · {term}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {seenKeys && report && <SeenButton itemType="report" itemId={report.id} seen={seenKeys.includes(`report:${report.id}`)} onSeen={onSeen} />}
          <button onClick={() => window.print()} className="btn-ghost px-3 py-1.5">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div><dt className="text-brand-400">Learner</dt><dd className="font-semibold">{student.full_name}</dd></div>
        <div><dt className="text-brand-400">Class</dt><dd className="font-semibold">{student.classroom_name}</dd></div>
        <div><dt className="text-brand-400">Admission no.</dt><dd className="font-mono font-semibold">{student.admission_number}</dd></div>
        <div><dt className="text-brand-400">Assessment no.</dt><dd className="font-mono font-semibold">{student.assessment_number || student.upi || "--"}</dd></div>
      </dl>

      <section>
        <h3 className="font-semibold text-brand-800">Learning areas</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left text-brand-400">
                <th className="py-2 font-semibold">Learning area</th>
                {data.uses_marks && exams.map((exam) => <th key={exam} className="py-2 text-right font-semibold">{exam}</th>)}
                <th className="py-2 text-right font-semibold">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {data.learning_areas.map((area) => (
                <tr key={area}>
                  <td className="py-2">{area}</td>
                  {data.uses_marks && exams.map((exam) => (
                    <td key={exam} className="py-2 text-right font-mono">{recordFor(area, exam)?.score ?? "--"}</td>
                  ))}
                  <td className="py-2 text-right"><LevelBadge level={latestLevel(area)} /></td>
                </tr>
              ))}
            </tbody>
            {mean !== null && (
              <tfoot>
                <tr className="border-t-2 border-brand-200">
                  <td className="py-2.5 font-semibold" colSpan={exams.length}>Mean score ({latestExam})</td>
                  <td className="py-2.5 text-right font-mono text-base font-semibold">{mean}%</td>
                  <td className="py-2.5 text-right"><LevelBadge level={levelForScore(mean)} /></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h3 className="font-semibold text-brand-800">Core competencies</h3>
          <ul className="mt-2 divide-y divide-brand-50 text-sm">
            {competencies.map((name) => (
              <li key={name} className="flex items-center justify-between py-1.5">
                <span>{name}</span>
                <LevelBadge level={report?.competencies?.[name]} />
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="font-semibold text-brand-800">Values</h3>
          <ul className="mt-2 divide-y divide-brand-50 text-sm">
            {values.map((name) => (
              <li key={name} className="flex items-center justify-between py-1.5">
                <span>{name}</span>
                <LevelBadge level={report?.values?.[name]} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-brand-50 p-4">
          <p className="text-brand-400">Co-curricular activities</p>
          <p className="mt-1 font-semibold">{report?.co_curricular || "--"}</p>
        </div>
        <div className="rounded-xl bg-brand-50 p-4">
          <p className="text-brand-400">Attendance</p>
          <p className="mt-1 font-semibold">{attendance.present} of {attendance.total} school days</p>
        </div>
      </div>

      <section className="space-y-3 text-sm">
        <div>
          <p className="text-brand-400">Class teacher&apos;s comment{data.class_teacher ? ` (${data.class_teacher})` : ""}</p>
          <p className="mt-1 italic">{report?.teacher_comment || "Not written yet."}</p>
        </div>
        <div>
          <p className="text-brand-400">Head teacher&apos;s comment</p>
          <p className="mt-1 italic">{report?.head_comment || "Not written yet."}</p>
        </div>
      </section>

      <div className="grid gap-2 border-t border-brand-100 pt-4 text-sm sm:grid-cols-2">
        <p><span className="text-brand-400">Closing date: </span><span className="font-semibold">{formatDate(report?.closing_date)}</span></p>
        <p><span className="text-brand-400">Next term opens: </span><span className="font-semibold">{formatDate(report?.opening_date)}</span></p>
      </div>
    </div>
  );
}
