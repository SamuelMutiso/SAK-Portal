import { BookOpen, BookOpenCheck, Bus, CalendarCheck, ChevronRight, ListChecks, Megaphone, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { formatKes } from "../constants";

function Row({ icon: Icon, tone, title, detail, to }) {
  const body = (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-brand-800">{title}</p>
        {detail && <p className="truncate text-sm text-brand-500">{detail}</p>}
      </div>
      {to && <ChevronRight size={18} className="shrink-0 text-brand-300" />}
    </>
  );
  return (
    <li>
      {to?.startsWith("#") ? (
        <a href={to} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-brand-50">{body}</a>
      ) : to ? (
        <Link to={to} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-brand-50">{body}</Link>
      ) : (
        <div className="flex items-center gap-3 px-2 py-2.5">{body}</div>
      )}
    </li>
  );
}

function show(value, scale) {
  return scale === "marks" ? `${value}%` : `${value} pts`;
}

export default function CatchUp({ child, showNotices = true }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/catch-up/${child.id}`).then(({ data: result }) => setData(result)).catch(() => setData(false));
  }, [child.id]);

  if (data === false) return null;
  if (!data) return <div className="card h-64 animate-pulse bg-brand-50/60" />;

  const page = `/parent/children/${child.id}`;
  const { unread_notices: notices, attendance, homework_due: homework, results } = data;
  const rows = [];

  if (data.bus) rows.push({ icon: Bus, tone: data.bus.event === "arrived" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700",
    title: `${data.bus.label} at ${format(new Date(`${data.bus.at}Z`), "h:mm a")}`, detail: data.bus.event === "arrived" ? "Safely at school today" : data.bus.stop ? `Stop: ${data.bus.stop}` : "School bus", to: `${page}?tab=attendance` });
  if (showNotices && notices.count) rows.push({ icon: Megaphone, tone: "bg-red-50 text-red-600", title: `${notices.count} notice${notices.count > 1 ? "s" : ""} you haven't opened`, detail: notices.titles.join(" · "), to: "#notices" });
  if (homework.count) rows.push({ icon: BookOpen, tone: "bg-gold-100 text-gold-600", title: `${homework.count} homework to do`, detail: homework.titles.join(" · ") });
  if (data.quizzes_waiting?.count) rows.push({ icon: ListChecks, tone: "bg-sky-100 text-sky-700", title: `${data.quizzes_waiting.count} quiz${data.quizzes_waiting.count > 1 ? "zes" : ""} to try`, detail: data.quizzes_waiting.titles.join(" · "), to: `${page}?tab=quizzes` });
  if (data.new_materials) rows.push({ icon: BookOpenCheck, tone: "bg-violet-100 text-violet-700", title: `${data.new_materials} new learning material${data.new_materials > 1 ? "s" : ""} this week`, detail: "Notes and worksheets from the teacher", to: `${page}?tab=learning` });
  if (attendance.rate !== null) rows.push({
    icon: CalendarCheck, tone: attendance.rate >= 90 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
    title: `Attendance ${attendance.rate}% this term`,
    detail: attendance.absent || attendance.late ? `${attendance.absent} day${attendance.absent === 1 ? "" : "s"} absent, ${attendance.late} late` : "Not missed a day. Well done!",
    to: `${page}?tab=attendance`,
  });
  if (results) rows.push({
    icon: results.change !== null && results.change < 0 ? TrendingDown : TrendingUp,
    tone: results.change !== null && results.change < 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700",
    title: `${results.label}: ${show(results.mean, results.scale)} (${results.grade})`,
    detail: results.change !== null
      ? `${results.change >= 0 ? "Up" : "Down"} ${Math.abs(results.change)} from ${results.previous_label}${results.needs_improvement.length ? ` · Work on ${results.needs_improvement.join(", ")}` : ""}`
      : results.needs_improvement.length ? `Work on ${results.needs_improvement.join(", ")}` : "",
    to: `${page}?tab=progress`,
  });
  rows.push(data.fee_balance > 0
    ? { icon: Wallet, tone: "bg-amber-100 text-amber-700", title: `Fee balance ${formatKes(data.fee_balance)}`, detail: "Tap to pay with M-Pesa", to: `${page}?tab=fees` }
    : { icon: Wallet, tone: "bg-emerald-100 text-emerald-700", title: "Fees fully paid", detail: "Thank you", to: `${page}?tab=fees` });

  return (
    <section className="card min-w-0">
      <h2 className="font-semibold text-brand-800">Catch me up: {data.first_name}</h2>
      <ul className="mt-2 divide-y divide-brand-50">
        {rows.map((row) => <Row key={row.title} {...row} />)}
      </ul>
    </section>
  );
}
