import { format } from "date-fns";
import { BookOpen, ClipboardCheck, GraduationCap, Megaphone, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import Loader from "../../components/Loader";
import StatCard from "../../components/StatCard";
import TrendChart from "../../components/TrendChart";
import WelcomeBanner from "../../components/WelcomeBanner";

const ACTIONS = [
  { to: "/teacher/attendance", label: "Mark today's register", icon: ClipboardCheck },
  { to: "/teacher/homework", label: "Set homework", icon: BookOpen },
  { to: "/teacher/assessments", label: "Enter exam marks", icon: GraduationCap },
  { to: "/teacher/notices", label: "Message class parents", icon: Megaphone },
];

export default function TeacherDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    api.get("/classes").then(async ({ data: classes }) => {
      const classroom = classes[0];
      if (!classroom) {
        setData({ classroom: null });
        return;
      }
      const [students, attendance, homework, trend] = await Promise.all([
        api.get("/students"),
        api.get("/attendance", { params: { classroom_id: classroom.id, date: today } }),
        api.get("/homework"),
        api.get("/reports/class-trend"),
      ]);
      setData({ classroom, students: students.data, attendance: attendance.data, homework: homework.data, trend: trend.data });
    });
  }, []);

  if (!data) return <Loader />;
  if (!data.classroom) return <p className="card">You have not been assigned a class yet.</p>;

  const absent = data.attendance.filter((record) => record.status === "absent");

  return (
    <div className="space-y-6">
      <WelcomeBanner photo="/photos/class-teacher.jpg" title={data.classroom.name} subtitle={`${data.classroom.level} class register, homework and grades.`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Learners" value={data.students.length} />
        <StatCard
          icon={ClipboardCheck}
          label="Register today"
          value={data.attendance.length ? `${data.attendance.length - absent.length}/${data.attendance.length}` : "Not marked"}
          hint={absent.length ? `${absent.length} absent` : null}
        />
        <StatCard icon={BookOpen} label="Homework set" value={data.homework.length} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="card flex items-center gap-3 font-semibold text-brand-700 transition hover:bg-brand-50">
            <Icon size={20} className="text-gold-500" />
            {label}
          </Link>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold text-brand-800">Class performance this year</h2>
        <p className="text-sm text-brand-500">{data.trend.scale === "marks" ? "Class mean mark at every assessment" : "Class average level at every assessment"}</p>
        <div className="mt-4">
          <TrendChart points={data.trend.overall} scale={data.trend.scale} />
        </div>
      </div>

      {absent.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-brand-800">Absent today</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {absent.map((record) => (
              <li key={record.id}>{record.student_name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
