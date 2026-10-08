import { ArrowLeft, BedDouble, Bus, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/client";
import Loader from "../../components/Loader";
import ReportCardView from "../../components/ReportCardView";
import { formatKes } from "../../constants";
import Attendance from "./child/Attendance";
import Diary from "./child/Diary";
import Fees from "./child/Fees";
import Leave from "./child/Leave";
import Library from "./child/Library";
import Portfolio from "./child/Portfolio";
import Safety from "./child/Safety";

function ReportTab({ student }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([api.get(`/reports/student/${student.id}`), api.get("/meta"), api.get("/acknowledgements/mine")]).then(
      ([report, meta, seen]) => setData({ report: report.data, meta: meta.data, seen: seen.data })
    );
  }, [student.id]);

  if (!data) return <Loader />;

  return (
    <ReportCardView
      data={data.report}
      competencies={data.meta.competencies}
      values={data.meta.values}
      seenKeys={data.seen}
      onSeen={(key) => setData({ ...data, seen: [...data.seen, key] })}
    />
  );
}

export default function Child() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [tab, setTab] = useState("report");

  useEffect(() => {
    api.get(`/students/${id}`).then(({ data }) => setStudent(data));
  }, [id]);

  if (!student) return <Loader />;

  const tabs = [
    { key: "report", label: "Report card" },
    { key: "fees", label: "Fees" },
    { key: "attendance", label: student.route_name ? "Attendance & bus" : "Attendance" },
    student.level === "Pre-Primary" && { key: "diary", label: "Daily diary" },
    { key: "portfolio", label: "Portfolio" },
    { key: "safety", label: "Pick-up & safety" },
    { key: "library", label: "Library" },
    student.is_boarder && { key: "leave", label: "Leave-out" },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <Link to="/parent" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline print:hidden">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="card flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-400 font-headline text-3xl font-extrabold text-brand-900">
          {student.first_name.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="page-title">{student.full_name}</h1>
          <p className="mt-1 text-brand-500">
            {student.classroom_name} · <span className="font-mono">{student.admission_number}</span>
            {student.fee_balance > 0 && <span className="ml-2 font-mono text-sm font-semibold text-amber-700">Balance {formatKes(student.fee_balance)}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {student.is_boarder && <span className="badge bg-violet-100 text-violet-700"><BedDouble size={12} /> Boarder</span>}
          {student.route_name && <span className="badge bg-amber-100 text-amber-700"><Bus size={12} /> {student.route_name}</span>}
          {student.clubs.map((club) => (
            <span key={club} className="badge bg-emerald-100 text-emerald-700"><Trophy size={12} /> {club}</span>
          ))}
        </div>
      </div>

      <nav className="-mx-4 overflow-x-auto px-4 print:hidden" aria-label="Child sections">
        <div className="flex w-max gap-1 rounded-xl bg-brand-100/60 p-1">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === item.key ? "bg-white text-brand-800 shadow-sm" : "text-brand-500 hover:text-brand-800"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {tab === "report" && <ReportTab student={student} />}
      {tab === "fees" && <Fees student={student} onBalanceChange={(balance) => setStudent({ ...student, fee_balance: balance })} />}
      {tab === "attendance" && <Attendance student={student} />}
      {tab === "diary" && <Diary student={student} />}
      {tab === "portfolio" && <Portfolio student={student} />}
      {tab === "safety" && <Safety student={student} />}
      {tab === "library" && <Library student={student} />}
      {tab === "leave" && <Leave student={student} />}
    </div>
  );
}
