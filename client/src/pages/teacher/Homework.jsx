import { format } from "date-fns";
import { CheckCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";

export default function Homework() {
  const [classroom, setClassroom] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ subject: "", title: "", details: "", due_date: "" });
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/classes").then(({ data }) => {
      setClassroom(data[0]);
      setForm((current) => ({ ...current, subject: data[0]?.learning_areas[0] || "" }));
    });
    api.get("/homework").then(({ data }) => setItems(data));
  }, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const { data } = await api.post("/homework", { ...form, classroom_id: classroom.id });
      setItems([data, ...items]);
      setForm({ ...form, title: "", details: "", due_date: "" });
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleDelete(id) {
    await api.delete(`/homework/${id}`);
    setItems(items.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Homework</h1>
        <p className="text-brand-500">Parents of {classroom?.name || "your class"} see this as soon as you post it.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="card space-y-4 lg:col-span-2">
          <div>
            <label className="label" htmlFor="subject">Subject</label>
            <select id="subject" name="subject" className="input" value={form.subject} onChange={handleChange}>
              {(classroom?.learning_areas || []).map((subject) => (
                <option key={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" name="title" className="input" value={form.title} onChange={handleChange} required />
          </div>
          <div>
            <label className="label" htmlFor="details">Details</label>
            <textarea id="details" name="details" rows={3} className="input" value={form.details} onChange={handleChange} />
          </div>
          <div>
            <label className="label" htmlFor="due_date">Due date</label>
            <input id="due_date" name="due_date" type="date" className="input" value={form.due_date} onChange={handleChange} required />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={!classroom}>Post homework</button>
        </form>

        <div className="space-y-3 lg:col-span-3">
          {items.map((item) => (
            <div key={item.id} className="card flex gap-4">
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gold-100 text-gold-600">
                <span className="text-xs font-semibold uppercase">{format(new Date(item.due_date), "MMM")}</span>
                <span className="font-mono text-lg font-semibold">{format(new Date(item.due_date), "d")}</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{item.subject}</p>
                <h3 className="font-semibold text-brand-800">{item.title}</h3>
                {item.details && <p className="text-sm text-brand-600">{item.details}</p>}
                {item.parent_count !== undefined && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCheck size={14} /> Seen by {item.seen_count} of {item.parent_count} parents
                  </p>
                )}
              </div>
              <button onClick={() => handleDelete(item.id)} className="self-start rounded-lg p-1.5 text-brand-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete homework">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
