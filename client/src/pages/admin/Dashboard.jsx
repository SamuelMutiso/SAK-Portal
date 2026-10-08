import { format } from "date-fns";
import { BedDouble, BookX, ChevronRight, FileCheck2, MessageSquare, UserCheck, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/client";
import Loader from "../../components/Loader";
import NoticeCard from "../../components/NoticeCard";
import StatCard from "../../components/StatCard";
import { formatKes } from "../../constants";
import WelcomeBanner from "../../components/WelcomeBanner";
import { fetchNotices } from "../../store/slices/noticesSlice";

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const notices = useSelector((state) => state.notices.items);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then(({ data }) => setStats(data));
    dispatch(fetchNotices());
  }, [dispatch]);

  if (!stats) return <Loader />;

  const { present, marked } = stats.attendance_today;
  const attendanceRate = marked ? Math.round((present / marked) * 100) : 0;
  const week = stats.attendance_week.map((day) => ({ ...day, label: format(new Date(day.date), "EEE") }));

  return (
    <div className="space-y-6">
      <WelcomeBanner photo="/photos/assembly.jpg" title="Good day, Admin" subtitle="Here is what is happening at Success Academy today.">
        <Link to="/admin/notices" className="btn-gold self-start md:self-auto">Post a notice</Link>
      </WelcomeBanner>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Learners" value={stats.students} hint={`${stats.teachers} teachers`} />
        <StatCard icon={UserCheck} tone="green" label="Present today" value={`${attendanceRate}%`} hint={`${present} of ${marked} marked`} />
        <StatCard icon={BedDouble} tone="violet" label="Boarders" value={stats.boarders} hint={`${stats.clubs} active clubs`} />
        <StatCard icon={MessageSquare} tone="gold" label="SMS sent" value={stats.sms_sent} hint={`${stats.parents} parents reachable`} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: "/admin/leave", icon: BedDouble, text: `${stats.pending_leave} leave-out request${stats.pending_leave === 1 ? "" : "s"} waiting`, urgent: stats.pending_leave > 0 },
          { to: "/admin/library", icon: BookX, text: `${stats.overdue_books} overdue library book${stats.overdue_books === 1 ? "" : "s"}`, urgent: stats.overdue_books > 0 },
          { to: "/admin/sba", icon: FileCheck2, text: "Check KNEC SBA marks", urgent: false },
          { to: "/admin/fees", icon: Wallet, text: `${formatKes(stats.fees_collected)} paid via the portal`, urgent: false },
        ].map(({ to, icon: Icon, text, urgent }) => (
          <Link key={to} to={to} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition hover:shadow-sm ${urgent ? "border-amber-200 bg-amber-50 text-amber-800" : "border-brand-100 bg-white text-brand-700"}`}>
            <Icon size={18} />
            <span className="flex-1">{text}</span>
            <ChevronRight size={16} />
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <h2 className="font-semibold text-brand-800">Learners per class</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.students_by_class}>
                <CartesianGrid vertical={false} stroke="#E1EAF5" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#3D63A0" }} interval={0} angle={-35} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#3D63A0" }} width={28} />
                <Tooltip cursor={{ fill: "#F2F6FB" }} />
                <Bar dataKey="count" name="Learners" fill="#2C4C84" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-brand-800">Attendance this week</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={week}>
                <CartesianGrid vertical={false} stroke="#E1EAF5" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#3D63A0" }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#3D63A0" }} width={40} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Line type="monotone" dataKey="rate" name="Present" stroke="#DDA22E" strokeWidth={3} dot={{ r: 4, fill: "#DDA22E" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-800">Latest notices</h2>
          <Link to="/admin/notices" className="text-sm font-semibold text-brand-600 hover:underline">
            See all notices
          </Link>
        </div>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {notices.slice(0, 4).map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </div>
      </div>
    </div>
  );
}
