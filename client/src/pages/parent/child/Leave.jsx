import { format } from "date-fns";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../../../api/client";
import Loader from "../../../components/Loader";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
};

const EMPTY = { leave_date: "", return_date: "", reason: "", picked_by: "" };

export default function Leave({ student }) {
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/leave").then(({ data }) => setItems(data.filter((item) => item.student_id === student.id)));
  }, [student.id]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const { data } = await api.post("/leave", { ...form, student_id: student.id });
      setItems([data, ...items]);
      setForm(EMPTY);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!items) return <Loader />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="card space-y-3">
        <h3 className="font-semibold text-brand-800">Request leave-out</h3>
        <p className="text-sm text-brand-500">The office will approve or decline and send you an SMS.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="leave">Leaving on</label>
            <input id="leave" type="date" className="input" value={form.leave_date} onChange={(event) => setForm({ ...form, leave_date: event.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="return">Returning on</label>
            <input id="return" type="date" className="input" value={form.return_date} onChange={(event) => setForm({ ...form, return_date: event.target.value })} required />
          </div>
        </div>
        <input className="input" placeholder="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} required />
        <input className="input" placeholder="Who will pick them up?" value={form.picked_by} onChange={(event) => setForm({ ...form, picked_by: event.target.value })} required />
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full">Send request</button>
      </form>

      <div className="space-y-3">
        {items.length === 0 && <p className="card text-sm text-brand-500">No requests yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="card flex items-center gap-3">
            <div className="flex-1 text-sm">
              <p className="font-semibold">{format(new Date(item.leave_date), "EEE d MMM")} to {format(new Date(item.return_date), "EEE d MMM")}</p>
              <p className="text-brand-500">{item.reason} · {item.picked_by}</p>
            </div>
            <span className={`badge capitalize ${STATUS_STYLES[item.status]}`}>{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
