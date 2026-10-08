import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { BellRing, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SmsPreview from "../../components/SmsPreview";
import { clearEventSms, createEvent, deleteEvent, fetchEvents, remindEvent } from "../../store/slices/eventsSlice";

const CATEGORY_STYLES = {
  academic: "bg-sky-100 text-sky-700",
  sports: "bg-emerald-100 text-emerald-700",
  club: "bg-gold-100 text-gold-600",
  trip: "bg-violet-100 text-violet-700",
  holiday: "bg-red-100 text-red-700",
  meeting: "bg-brand-100 text-brand-700",
};

const EMPTY_FORM = { title: "", category: "academic", location: "", start_date: "", notify_parents: true };

export default function Calendar() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { items, error, lastSms } = useSelector((state) => state.events);
  const [month, setMonth] = useState(new Date());
  const [form, setForm] = useState(EMPTY_FORM);
  const isAdmin = user.role === "admin";

  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  function eventsOn(day) {
    const key = format(day, "yyyy-MM-dd");
    return items.filter((event) => key >= event.start_date && key <= (event.end_date || event.start_date));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const result = await dispatch(createEvent({ ...form, location: form.location || null }));
    if (createEvent.fulfilled.match(result)) setForm(EMPTY_FORM);
  }

  const monthEvents = items.filter((event) => event.start_date.startsWith(format(month, "yyyy-MM")));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="page-title flex-1">School Calendar</h1>
        <button className="btn-ghost px-2.5" onClick={() => setMonth(subMonths(month, 1))} aria-label="Previous month"><ChevronLeft size={18} /></button>
        <span className="w-36 text-center font-display font-semibold">{format(month, "MMMM yyyy")}</span>
        <button className="btn-ghost px-2.5" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month"><ChevronRight size={18} /></button>
      </div>

      {lastSms && <SmsPreview sms={lastSms} onClose={() => dispatch(clearEventSms())} />}

      <div className="card p-3">
        <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase text-brand-400">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`min-h-16 rounded-lg p-1 md:min-h-24 md:p-1.5 ${isSameMonth(day, month) ? "bg-brand-50/60" : "opacity-40"} ${isToday(day) ? "ring-2 ring-gold-500" : ""}`}
            >
              <p className="font-mono text-xs text-brand-500">{format(day, "d")}</p>
              {eventsOn(day).map((event) => (
                <p key={event.id} className={`mt-1 truncate rounded px-1 text-[10px] font-semibold md:text-xs ${CATEGORY_STYLES[event.category]}`} title={event.title}>
                  {event.title}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold text-brand-800">This month</h2>
          <ul className="mt-3 divide-y divide-brand-100">
            {monthEvents.length === 0 && <li className="py-2 text-sm text-brand-400">No events this month.</li>}
            {monthEvents.map((event) => (
              <li key={event.id} className="flex items-center gap-3 py-2.5">
                <span className="w-14 font-mono text-xs font-semibold text-gold-600">{format(new Date(event.start_date), "d MMM")}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{event.title}</p>
                  {event.location && <p className="text-xs text-brand-400">{event.location}</p>}
                </div>
                <span className={`badge ${CATEGORY_STYLES[event.category]}`}>{event.category}</span>
                {isAdmin && event.start_date >= format(new Date(), "yyyy-MM-dd") && (
                  <button onClick={() => dispatch(remindEvent(event.id))} className="rounded-lg p-1 text-brand-400 hover:text-gold-600" aria-label="SMS reminder to parents" title="SMS reminder to parents">
                    <BellRing size={15} />
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => dispatch(deleteEvent(event.id))} className="rounded-lg p-1 text-brand-400 hover:text-red-600" aria-label="Delete event">
                    <Trash2 size={15} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isAdmin && (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <h2 className="font-semibold text-brand-800">Add an event</h2>
            <input className="input" placeholder="Event title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {Object.keys(CATEGORY_STYLES).map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <input type="date" className="input" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} required />
            </div>
            <input className="input" placeholder="Location (optional)" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            <label className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 text-sm font-semibold">
              <input type="checkbox" checked={form.notify_parents} onChange={(event) => setForm({ ...form, notify_parents: event.target.checked })} className="h-4 w-4 accent-brand-700" />
              SMS all parents about this event
            </label>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="btn-primary w-full">Add to calendar</button>
          </form>
        )}
      </div>
    </div>
  );
}
