import {
  Baby,
  BedDouble,
  BookOpen,
  Bus,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  FileText,
  GraduationCap,
  Images,
  LayoutDashboard,
  Library,
  Megaphone,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useSelector } from "react-redux";
import { NavLink } from "react-router-dom";

const LINKS = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/notices", label: "Notices & SMS", icon: Megaphone },
    { to: "/admin/students", label: "Students", icon: Users },
    { to: "/admin/reports", label: "Report cards", icon: FileText },
    { to: "/admin/sba", label: "KNEC SBA", icon: FileCheck2 },
    { to: "/admin/fees", label: "Fees", icon: Wallet },
    { to: "/admin/leave", label: "Leave-out", icon: BedDouble },
    { to: "/admin/pickup", label: "Pick-up check", icon: ShieldCheck },
    { to: "/admin/timetable", label: "Timetable", icon: CalendarClock },
    { to: "/admin/clubs", label: "Clubs", icon: Trophy },
    { to: "/admin/library", label: "Library", icon: Library },
    { to: "/admin/transport", label: "Transport", icon: Bus },
    { to: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  ],
  teacher: [
    { to: "/teacher", label: "My Class", icon: LayoutDashboard },
    { to: "/teacher/attendance", label: "Attendance", icon: ClipboardCheck },
    { to: "/teacher/timetable", label: "Timetable", icon: CalendarClock },
    { to: "/teacher/assessments", label: "Grades", icon: GraduationCap },
    { to: "/teacher/reports", label: "Report cards", icon: FileText },
    { to: "/teacher/homework", label: "Homework", icon: BookOpen },
    { to: "/teacher/diary", label: "Daily diary", icon: Baby },
    { to: "/teacher/portfolio", label: "Portfolio", icon: Images },
    { to: "/teacher/clubs", label: "Clubs", icon: Trophy },
    { to: "/teacher/pickup", label: "Pick-up check", icon: ShieldCheck },
    { to: "/teacher/notices", label: "Class notices", icon: Megaphone },
    { to: "/teacher/calendar", label: "Calendar", icon: CalendarDays },
  ],
  parent: [
    { to: "/parent", label: "Home", icon: LayoutDashboard },
    { to: "/parent/calendar", label: "Calendar", icon: CalendarDays },
  ],
  driver: [{ to: "/driver", label: "My bus", icon: Bus }],
};

export default function Sidebar({ open, onClose }) {
  const user = useSelector((state) => state.auth.user);
  const links = LINKS[user.role];

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-brand-900/40 md:hidden print:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 print:hidden flex-col bg-brand-900 text-brand-100 transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-brand-800 px-5 py-5">
          <img src="/logo.png" alt="Success Academy crest" className="h-12 w-12 rounded-full bg-white object-contain p-1" />
          <div className="leading-tight">
            <p className="font-headline text-lg font-bold uppercase tracking-wide text-white">Success Academy</p>
            <p className="text-xs text-gold-400">Kitengela Portal</p>
          </div>
          <button onClick={onClose} className="ml-auto md:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive ? "bg-gold-500 text-brand-900" : "text-brand-200 hover:bg-brand-800 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="uniform-check h-2 opacity-60" />
        <p className="px-5 py-4 text-xs italic text-brand-300">In pursuit of excellence</p>
      </aside>
    </>
  );
}
