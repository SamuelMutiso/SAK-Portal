import { format } from "date-fns";
import { BookOpen, CalendarDays, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api from "../../api/client";
import Loader from "../../components/Loader";
import WelcomeBanner from "../../components/WelcomeBanner";
import { formatKes } from "../../constants";
import NoticeCard from "../../components/NoticeCard";
import { fetchEvents } from "../../store/slices/eventsSlice";
import { fetchNotices } from "../../store/slices/noticesSlice";
import { fetchStudents } from "../../store/slices/studentsSlice";

export default function ParentDashboard() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const children = useSelector((state) => state.students.items);
  const notices = useSelector((state) => state.notices.items);
  const events = useSelector((state) => state.events.items);
  const [homework, setHomework] = useState(null);

  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchNotices());
    dispatch(fetchEvents());
    api.get("/homework").then(({ data }) => setHomework(data));
  }, [dispatch]);

  if (!homework) return <Loader />;

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = events.filter((event) => event.start_date >= today).slice(0, 4);
  const dueHomework = homework.filter((item) => item.due_date >= today);

  return (
    <div className="space-y-6">
      <WelcomeBanner
        photo="/photos/swings.jpg"
        title={`Hello, ${user.full_name.split(" ")[0]}`}
        subtitle="Tap your child to see their report card, attendance and fees."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {children.map((child) => (
          <Link key={child.id} to={`/parent/children/${child.id}`} className="card flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-400 font-display text-xl font-bold text-brand-900">
              {child.first_name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-brand-800">{child.full_name}</p>
              <p className="text-sm text-brand-500">{child.classroom_name}{child.clubs.length ? ` · ${child.clubs.join(", ")}` : ""}</p>
              {child.fee_balance > 0 && <p className="mt-1 font-mono text-xs font-semibold text-amber-700">Balance {formatKes(child.fee_balance)}</p>}
            </div>
            <ChevronRight className="text-brand-300" />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-brand-800">Notices for you</h2>
          {notices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} showSms={false} />
          ))}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="flex items-center gap-2 font-semibold text-brand-800"><CalendarDays size={18} /> Coming up</h2>
            <ul className="mt-3 space-y-3">
              {upcoming.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <span className="w-12 shrink-0 font-mono text-xs font-semibold text-gold-600">{format(new Date(event.start_date), "d MMM")}</span>
                  <span className="text-sm">{event.title}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="flex items-center gap-2 font-semibold text-brand-800"><BookOpen size={18} /> Homework due</h2>
            <ul className="mt-3 space-y-3">
              {dueHomework.length === 0 && <li className="text-sm text-brand-400">Nothing due.</li>}
              {dueHomework.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-brand-500">{item.classroom_name} · {item.subject} · due {format(new Date(item.due_date), "EEE d MMM")}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
