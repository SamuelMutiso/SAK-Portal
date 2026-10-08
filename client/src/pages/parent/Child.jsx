import { format } from "date-fns";
import { ArrowLeft, BedDouble, Bus, Printer, Trophy, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/client";
import Loader from "../../components/Loader";
import RouteMap from "../../components/RouteMap";
import { EXAMS, LEVELS, formatKes, levelForScore } from "../../constants";

const STATUS_STYLES = {
  present: "bg-emerald-500",
  late: "bg-amber-400",
  absent: "bg-red-500",
};

function ReportCard({ student, assessments }) {
  const exams = EXAMS.filter((exam) => assessments.some((record) => record.exam === exam));
  const [exam, setExam] = useState(exams[exams.length - 1]);

  if (!exams.length) {
    return (
      <div className="card">
        <h2 className="font-semibold text-brand-800">Report card</h2>
        <p className="mt-3 text-sm text-brand-400">No marks have been entered yet.</p>
      </div>
    );
  }

  const records = assessments.filter((record) => record.exam === exam);
  const scored = records.filter((record) => record.score !== null);
  const mean = scored.length ? Math.round(scored.reduce((sum, record) => sum + record.score, 0) / scored.length) : null;
  const previous = EXAMS[EXAMS.indexOf(exam) - 1];

  function previousScore(subject) {
    return assessments.find((record) => record.exam === previous && record.subject === subject)?.score;
  }

  return (
    <div className="card print:border-0 print:shadow-none">
      <div className="hidden items-center gap-4 border-b border-brand-100 pb-4 print:flex">
        <img src="/logo.png" alt="Success Academy logo" className="h-16 w-16 object-contain" />
        <div>
          <p className="font-display text-lg font-bold">Success Academy Kitengela</p>
          <p className="text-sm">{student.full_name} · {student.classroom_name} · {student.admission_number}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center print:mt-4">
        <h2 className="flex-1 font-semibold text-brand-800">Report card · {records[0]?.term}</h2>
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex gap-1 rounded-xl bg-brand-50 p-1">
            {exams.map((item) => (
              <button
                key={item}
                onClick={() => setExam(item)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${exam === item ? "bg-brand-700 text-white" : "text-brand-600 hover:bg-white"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <button onClick={() => window.print()} className="btn-ghost px-3 py-1.5 print:hidden">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>
      <p className="mt-1 hidden text-sm print:block">{exam} exam</p>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-brand-400">
            <th className="py-2">Learning area</th>
            <th className="py-2 text-right">Marks</th>
            <th className="py-2 text-right">Level</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-100">
          {records.map((record) => {
            const before = previousScore(record.subject);
            const change = before !== undefined && record.score !== null ? record.score - before : null;
            return (
              <tr key={record.id}>
                <td className="py-2.5 font-semibold">{record.subject}</td>
                <td className="py-2.5 text-right font-mono">
                  {record.score ?? "--"}
                  {change !== null && change !== 0 && (
                    <span className={`ml-2 text-xs ${change > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {change > 0 ? "▲" : "▼"}{Math.abs(change)}
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-right">
                  <span className={`badge font-mono ${LEVELS[record.level].style}`} title={LEVELS[record.level].label}>{record.level}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
        {mean !== null && (
          <tfoot>
            <tr className="border-t-2 border-brand-200">
              <td className="py-3 font-display font-bold">Mean score</td>
              <td className="py-3 text-right font-mono text-lg font-semibold">{mean}%</td>
              <td className="py-3 text-right">
                <span className={`badge font-mono ${LEVELS[levelForScore(mean)].style}`}>{levelForScore(mean)}</span>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      {previous && <p className="mt-2 text-xs text-brand-400 print:hidden">Arrows compare with the {previous} exam.</p>}
    </div>
  );
}

export default function Child() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/students/${id}`),
      api.get(`/attendance/student/${id}`),
      api.get(`/assessments/student/${id}`),
      api.get("/transport"),
    ]).then(([student, attendance, assessments, routes]) => {
      const route = routes.data.find((item) => item.id === student.data.transport_route_id);
      setData({ student: student.data, attendance: attendance.data, assessments: assessments.data, route });
    });
  }, [id]);

  if (!data) return <Loader />;

  const { student, attendance, assessments, route } = data;
  const attended = attendance.filter((record) => record.status !== "absent").length;
  const rate = attendance.length ? Math.round((attended / attendance.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link to="/parent" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline print:hidden">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="card flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-400 font-display text-2xl font-bold text-brand-900">
          {student.first_name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="page-title">{student.full_name}</h1>
          <p className="text-brand-500">{student.classroom_name} · <span className="font-mono">{student.admission_number}</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          {student.is_boarder && <span className="badge bg-violet-100 text-violet-700"><BedDouble size={12} /> Boarder</span>}
          {student.route_name && <span className="badge bg-amber-100 text-amber-700"><Bus size={12} /> {student.route_name}</span>}
          {student.clubs.map((club) => (
            <span key={club} className="badge bg-emerald-100 text-emerald-700"><Trophy size={12} /> {club}</span>
          ))}
        </div>
      </div>

      <div className={`card flex items-center gap-4 print:hidden ${student.fee_balance > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
        <Wallet className={student.fee_balance > 0 ? "text-amber-600" : "text-emerald-600"} />
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Fee balance</p>
          <p className="font-mono text-xl font-semibold text-brand-800">{formatKes(student.fee_balance)}</p>
          <p className="text-xs text-brand-500">
            {student.fee_balance > 0 ? `Pay via M-Pesa using account ${student.admission_number}` : "All fees cleared. Thank you!"}
          </p>
        </div>
      </div>

      <ReportCard student={student} assessments={assessments} />

      <div className="card print:hidden">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-brand-800">Attendance</h2>
          <span className="font-mono text-2xl font-semibold text-brand-700">{rate}%</span>
        </div>
        <p className="text-xs text-brand-400">Last {attendance.length} school days</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {[...attendance].reverse().map((record) => (
            <div key={record.id} title={`${format(new Date(record.date), "EEE d MMM")}: ${record.status}`} className="flex flex-col items-center gap-1">
              <span className={`h-7 w-7 rounded-lg ${STATUS_STYLES[record.status]}`} />
              <span className="font-mono text-[10px] text-brand-400">{format(new Date(record.date), "d")}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-brand-500">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" /> Present</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" /> Late</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500" /> Absent</span>
        </div>
      </div>

      {route && (
        <div className="card print:hidden">
          <h2 className="font-semibold text-brand-800">School bus: {route.name}</h2>
          <p className="mb-4 text-sm text-brand-500">Driver {route.driver_name} · {route.driver_phone} · {route.vehicle}</p>
          <RouteMap stops={route.stops} />
        </div>
      )}
    </div>
  );
}
