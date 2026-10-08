import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import api, { assetUrl, errorMessage } from "../../api/client";
import Loader from "../../components/Loader";

export default function Portfolio() {
  const [classroom, setClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", learning_area: "", description: "" });
  const [image, setImage] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/classes"), api.get("/students")]).then(([classes, list]) => {
      setClassroom(classes.data[0]);
      setForm((current) => ({ ...current, learning_area: classes.data[0]?.learning_areas[0] || "" }));
      setStudents(list.data);
      if (list.data[0]) setStudentId(String(list.data[0].id));
    });
  }, []);

  useEffect(() => {
    if (!studentId) return;
    api.get(`/portfolio/student/${studentId}`).then(({ data }) => setItems(data));
  }, [studentId]);

  async function handleSubmit(event) {
    event.preventDefault();
    const body = new FormData();
    body.append("student_id", studentId);
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append("image", image);
    setSaving(true);
    try {
      const { data } = await api.post("/portfolio", body);
      setItems([data, ...items]);
      setForm({ ...form, title: "", description: "" });
      setImage(null);
      event.target.reset();
      setMessage({ type: "success", text: "Added to the portfolio. The parent can see it now." });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    await api.delete(`/portfolio/${id}`);
    setItems(items.filter((item) => item.id !== id));
  }

  if (!classroom) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Learner portfolio</h1>
        <p className="mt-2 text-brand-500">Snap a photo of a project, model or performance. It goes straight to the learner&apos;s portfolio.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit} className="card space-y-4 lg:col-span-2">
          <div>
            <label className="label" htmlFor="learner">Learner</label>
            <select id="learner" className="input" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              {students.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="area">Learning area</label>
            <select id="area" className="input" value={form.learning_area} onChange={(event) => setForm({ ...form, learning_area: event.target.value })}>
              {classroom.learning_areas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" className="input" placeholder="Clay pot model" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </div>
          <div>
            <label className="label" htmlFor="description">What did they do?</label>
            <textarea id="description" rows={2} className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-brand-200 p-5 text-sm text-brand-500 hover:bg-brand-50">
            <ImagePlus size={24} />
            {image ? image.name : "Choose or take a photo (max 5 MB)"}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => setImage(event.target.files[0])} required />
          </label>
          {message && (
            <p className={`rounded-xl px-3 py-2 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
          )}
          <button className="btn-primary w-full" disabled={saving || !image}>{saving ? "Uploading..." : "Add to portfolio"}</button>
        </form>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
          {items.length === 0 && <p className="card text-sm text-brand-500 sm:col-span-2">No portfolio items for this learner yet.</p>}
          {items.map((item) => (
            <figure key={item.id} className="card overflow-hidden p-0">
              <img src={assetUrl(item.image_url)} alt={item.title} className="h-44 w-full object-cover" />
              <figcaption className="flex items-start gap-2 p-4">
                <div className="flex-1">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-brand-500">{item.learning_area}</p>
                </div>
                <button onClick={() => handleDelete(item.id)} className="rounded-lg p-1.5 text-brand-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove from portfolio">
                  <Trash2 size={16} />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
