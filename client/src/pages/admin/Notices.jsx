import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../../api/client";
import Loader from "../../components/Loader";
import NoticeCard from "../../components/NoticeCard";
import SmsPreview from "../../components/SmsPreview";
import { clearSms, createNotice, deleteNotice, fetchNotices } from "../../store/slices/noticesSlice";

const AUDIENCES = [
  { value: "all", label: "Whole school" },
  { value: "class", label: "A class" },
  { value: "club", label: "A club" },
  { value: "route", label: "A bus route" },
  { value: "boarders", label: "Boarders" },
];

const EMPTY_FORM = { title: "", body: "", audience: "all", target: "", send_sms: true };

export default function Notices() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { items, status, error, lastSms } = useSelector((state) => state.notices);
  const isTeacher = user.role === "teacher";
  const [options, setOptions] = useState({ class: [], club: [], route: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    dispatch(fetchNotices());
    Promise.all([api.get("/classes"), api.get("/clubs"), api.get("/transport")]).then(([classes, clubs, routes]) => {
      setOptions({ class: classes.data, club: clubs.data, route: routes.data });
      if (isTeacher && classes.data[0]) {
        setForm((current) => ({ ...current, audience: "class", target: String(classes.data[0].id) }));
      }
    });
  }, [dispatch, isTeacher]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    const next = { ...form, [name]: type === "checkbox" ? checked : value };
    if (name === "audience") next.target = "";
    setForm(next);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const target = Number(form.target) || null;
    const payload = {
      title: form.title,
      body: form.body,
      audience: form.audience,
      send_sms: form.send_sms,
      classroom_id: form.audience === "class" ? target : null,
      club_id: form.audience === "club" ? target : null,
      transport_route_id: form.audience === "route" ? target : null,
    };
    setSending(true);
    const result = await dispatch(createNotice(payload));
    setSending(false);
    if (createNotice.fulfilled.match(result)) {
      setForm({ ...EMPTY_FORM, audience: form.audience, target: isTeacher ? form.target : "" });
    }
  }

  const targetOptions = options[form.audience] || [];
  const charactersLeft = 160 - `Success Academy: ${form.title}. ${form.body}`.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{isTeacher ? "Class notices" : "Notices & SMS"}</h1>
        <p className="text-brand-500">Post a notice and text it straight to the parents who need it.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="card space-y-4 lg:col-span-2">
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" name="title" className="input" value={form.title} onChange={handleChange} placeholder="Swimming this Thursday" required />
          </div>
          <div>
            <label className="label" htmlFor="body">Message</label>
            <textarea id="body" name="body" rows={4} className="input" value={form.body} onChange={handleChange} placeholder="Members should carry costumes and towels." required />
            <p className={`mt-1 text-right font-mono text-xs ${charactersLeft < 0 ? "text-amber-600" : "text-brand-400"}`}>
              {charactersLeft < 0 ? `${Math.ceil((160 - charactersLeft) / 160)} SMS parts` : `${charactersLeft} characters left`}
            </p>
          </div>

          {!isTeacher && (
            <div>
              <label className="label" htmlFor="audience">Send to</label>
              <select id="audience" name="audience" className="input" value={form.audience} onChange={handleChange}>
                {AUDIENCES.map((audience) => (
                  <option key={audience.value} value={audience.value}>{audience.label}</option>
                ))}
              </select>
            </div>
          )}

          {["class", "club", "route"].includes(form.audience) && (
            <div>
              <label className="label" htmlFor="target">Which one</label>
              <select id="target" name="target" className="input" value={form.target} onChange={handleChange} disabled={isTeacher} required>
                <option value="">Select...</option>
                {targetOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-3 rounded-xl bg-brand-50 p-3 text-sm font-semibold">
            <input type="checkbox" name="send_sms" checked={form.send_sms} onChange={handleChange} className="h-4 w-4 accent-brand-700" />
            Also send as SMS to parents
          </label>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={sending}>
            <Send size={16} />
            {sending ? "Posting..." : "Post notice"}
          </button>
        </form>

        <div className="space-y-4 lg:col-span-3">
          {lastSms && <SmsPreview sms={lastSms} onClose={() => dispatch(clearSms())} />}
          {status === "loading" && !items.length ? (
            <Loader />
          ) : (
            items.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                onDelete={user.role === "admin" ? (id) => dispatch(deleteNotice(id)) : null}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
