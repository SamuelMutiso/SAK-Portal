import { Bus, CalendarDays, ChevronRight, GraduationCap, Trophy, UserCheck, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/client";
import LearnerList from "../../components/LearnerList";
import Loader from "../../components/Loader";
import NoticeCard from "../../components/NoticeCard";
import StatCard from "../../components/StatCard";
import WelcomeBanner from "../../components/WelcomeBanner";
import { formatKes } from "../../constants";

export default function DirectorHome() {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/analytics/summary"), api.get("/analytics/performance"), api.get("/notices"), api.get("/clubs"), api.get("/events")]).then(
      ([summary, performance, notices, clubs, events]) =>
        setData({ summary: summary.data, performance: performance.data, notices: notices.data, clubs: clubs.data, events: events.data })
    );
  }, []);

  if (!data) return <Loader />;

  const { summary, performance } = data;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = data.events.filter((event) => event.start_date >= today).slice(0, 4);
  const busiestClubs = [...data.clubs].sort((a, b) => b.member_count - a.member_count).slice(0, 5);

  return (
    <div className="space-y-6">
      <WelcomeBanner photo="/photos/graduation.jpg" title="Good day, Director" subtitle="How Success Academy is doing today: learners, results, clubs and school life.">
        <Link to="/director/performance" className="btn-gold self-start md:self-auto">See performance</Link>
      </WelcomeBanner>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Learners" value={summary.learners} hint={`${summary.boarders} boarders`} />
        <StatCard icon={UserCheck} tone="green" label="Attendance" value={`${summary.attendance_rate}%`} hint="Across recent school days" />
        <StatCard icon={Trophy} tone="violet" label="Club places" value={summary.club_members} hint={`${summary.clubs} clubs`} />
        <StatCard icon={Wallet} tone="gold" label="Fees outstanding" value={formatKes(summary.fees_outstanding)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card">
          <h2 className="flex items-center gap-2 font-semibold text-brand-800"><GraduationCap size={18} className="text-gold-600" /> Top learners, Grade 4 to 9</h2>
          <div className="mt-3"><LearnerList learners={performance.school_top} scale="marks" /></div>
        </div>
        <div className="card">
          <h2 className="font-semibold text-brand-800">Most improved this year</h2>
          <div className="mt-3"><LearnerList learners={performance.school_improved} scale="marks" showChange /></div>
        </div>
        <div className="card">
          <h2 className="font-semibold text-brand-800">Class averages</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance.class_ranking} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke="#E1EAF5" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#3D63A0" }} />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11, fill: "#3D63A0" }} />
                <Tooltip formatter={(value) => [`${value}%`, "Class mean"]} />
                <Bar dataKey="mean" fill="#2C4C84" radius={[0, 6, 6, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-brand-800">Latest notices to parents</h2>
            <Link to="/director/notices" className="text-sm font-semibold text-brand-600 hover:underline">All notices</Link>
          </div>
          {data.notices.slice(0, 3).map((notice) => <NoticeCard key={notice.id} notice={notice} />)}
        </div>
        <div className="space-y-6">
          <div className="card">
            <h2 className="flex items-center gap-2 font-semibold text-brand-800"><Trophy size={18} /> Biggest clubs</h2>
            <ul className="mt-3 divide-y divide-brand-50">
              {busiestClubs.map((club) => (
                <li key={club.id}>
                  <Link to={`/director/clubs/${club.id}`} className="flex items-center gap-2 py-2 text-sm hover:text-brand-900">
                    <span className="flex-1 font-semibold">{club.name}</span>
                    <span className="text-xs text-brand-400">{club.member_count} members</span>
                    <ChevronRight size={14} className="text-brand-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2 className="flex items-center gap-2 font-semibold text-brand-800"><CalendarDays size={18} /> Coming up</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {upcoming.map((event) => (
                <li key={event.id} className="flex gap-3"><span className="w-14 font-mono text-xs text-gold-600">{event.start_date.slice(5)}</span>{event.title}</li>
              ))}
            </ul>
          </div>
          <Link to="/director/transport" className="card flex items-center gap-3 font-semibold text-brand-700 hover:bg-brand-50"><Bus size={18} /> Bus routes and drivers <ChevronRight size={16} className="ml-auto" /></Link>
        </div>
      </div>
    </div>
  );
}
