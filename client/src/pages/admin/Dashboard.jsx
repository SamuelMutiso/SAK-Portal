import { format } from "date-fns";
import { BedDouble, MessageSquare, UserCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/client";
import Loader from "../../components/Loader";
import NoticeCard from "../../components/NoticeCard";
import StatCard from "../../components/StatCard";
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
      <div>
        <h1 className="page-title">Good day, Admin</h1>
        <p className="text-brand-500">Here is what is happening at Success Academy today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Learners" value={stats.students} hint={`${stats.teachers} teachers`} />
        <StatCard icon={UserCheck} label="Present today" value={`${attendanceRate}%`} hint={`${present} of ${marked} marked`} />
        <StatCard icon={BedDouble} label="Boarders" value={stats.boarders} hint={`${stats.clubs} active clubs`} />
        <StatCard icon={MessageSquare} label="SMS sent" value={stats.sms_sent} hint={`${stats.parents} parents reachable`} />
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
                <Line type="monotone" dataKey="rate" name="Present" stroke="#C8962E" strokeWidth={3} dot={{ r: 4, fill: "#C8962E" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-800">Latest notices</h2>
          <Link to="/admin/notices" className="text-sm font-semibold text-brand-600 hover:underline">
            Post a notice
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
