import { BookOpenCheck, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import MaterialCard from "../../components/MaterialCard";

const KINDS = [
  { key: "notes", label: "Notes" },
  { key: "file", label: "PDF or photo" },
  { key: "link", label: "Link" },
  { key: "video", label: "Video link" },
];

const EMPTY = { subject: "", topic: "", title: "", kind: "notes", body: "", link_url: "" };

export default function Learning() {
  const user = useSelector((state) => state.auth.user);
  const canPost = user.role === "teacher" || user.role === "admin";
  const [classes, setClasses] = useState(null);
  const [classId, setClassId] = useState(null);
  const [items, setItems] = useState(null);
  const [subject, setSubject] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/classes").then(({ data }) => {
      setClasses(data);
      setClassId(data[0]?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setItems(null);
    setSubject("");
    api.get("/learning/materials", { params: { classroom_id: classId } }).then(({ data }) => setItems(data));
  }, [classId]);

  if (!classes) return <Loader />;

  const classroom = classes.find((item) => item.id === classId);
  const areas = classroom?.learning_areas || [];
  const shown = (items || []).filter((item) => !subject || item.subject === subject);
  const used = areas.filter((area) => (items || []).some((item) => item.subject === area));

  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const startAdding = () => {
    setForm({ ...EMPTY, subject: subject || areas[0] || "" });
    setFile(null);
    setError(null);
    setAdding(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const fields = { ...form, classroom_id: classId };
      let response;
      if (form.kind === "file") {
        if (!file) throw new Error("Choose a PDF or photo to upload");
        if (file.size > 5 * 1024 * 1024) throw new Error("That file is bigger than 5 MB. Try a smaller PDF or photo.");
        const body = new FormData();
        Object.entries(fields).forEach(([key, value]) => value && key !== "link_url" && body.append(key, value));
        body.append("file", file);
        response = await api.post("/learning/materials", body);
      } else {
        response = await api.post("/learning/materials", fields);
      }
      setItems([response.data, ...(items || [])]);
      setAdding(false);
    } catch (err) {
      setError(err.response ? errorMessage(err) : err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (material) => {
    if (!window.confirm(`Delete "${material.title}"? Parents will no longer see it.`)) return;
    await api.delete(`/learning/materials/${material.id}`);
    setItems(items.filter((item) => item.id !== material.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Learning materials</h1>
          <p className="mt-1 text-brand-500">
            {user.role === "teacher" ? `Notes, files and links for ${classroom?.name || "your class"}. Parents see them on their child's Learning tab.` : "What teachers have posted for each class."}
          </p>
        </div>
        {canPost && classroom && !adding && (
          <button type="button" onClick={startAdding} className="btn-primary"><Plus size={18} /> Add material</button>
        )}
      </div>

      {classes.length === 0 ? (
        <div className="card text-sm text-brand-500">You do not have a class yet.</div>
      ) : (
        <>
          {classes.length > 1 && (
            <div className="max-w-xs">
              <label htmlFor="learning-class" className="label">Class</label>
              <select id="learning-class" className="input" value={classId || ""} onChange={(event) => setClassId(Number(event.target.value))}>
                {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
          )}

          {adding && (
            <form onSubmit={save} className="card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-brand-800">New material for {classroom.name}</h2>
                <button type="button" onClick={() => setAdding(false)} className="grid h-10 w-10 place-items-center rounded-full text-brand-400 hover:bg-brand-50" aria-label="Cancel">
                  <X size={20} />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="m-subject">Learning area</label>
                  <select id="m-subject" name="subject" className="input" value={form.subject} onChange={change} required>
                    {areas.map((area) => <option key={area}>{area}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="m-topic">Topic (optional)</label>
                  <input id="m-topic" name="topic" className="input" value={form.topic} onChange={change} maxLength={120} placeholder="e.g. Fractions" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="m-title">Title</label>
                <input id="m-title" name="title" className="input" value={form.title} onChange={change} required minLength={3} maxLength={150} placeholder="e.g. Adding fractions with the same denominator" />
              </div>
              <div>
                <span className="label">Type</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {KINDS.map((item) => (
                    <button key={item.key} type="button" onClick={() => setForm({ ...form, kind: item.key })}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${form.kind === item.key ? "border-brand-700 bg-brand-700 text-white" : "border-brand-200 bg-white text-brand-700 hover:bg-brand-50"}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              {form.kind === "file" && (
                <div>
                  <label className="label" htmlFor="m-file">PDF or photo (up to 5 MB)</label>
                  <input id="m-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files[0] || null)}
                    className="block w-full text-base text-brand-700 file:mr-3 file:rounded-xl file:border-0 file:bg-brand-100 file:px-4 file:py-2.5 file:font-semibold file:text-brand-700 sm:text-sm" />
                </div>
              )}
              {(form.kind === "link" || form.kind === "video") && (
                <div>
                  <label className="label" htmlFor="m-link">Link</label>
                  <input id="m-link" name="link_url" type="url" inputMode="url" className="input" value={form.link_url} onChange={change} required placeholder="https://" />
                </div>
              )}
              <div>
                <label className="label" htmlFor="m-body">{form.kind === "notes" ? "Notes" : "Short description (optional)"}</label>
                <textarea id="m-body" name="body" rows={form.kind === "notes" ? 8 : 3} className="input" value={form.body} onChange={change} required={form.kind === "notes"} maxLength={20000}
                  placeholder={form.kind === "notes" ? "Write the notes. Start a line with - to make a list." : "What should learners do with this?"} />
              </div>
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setAdding(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? "Posting…" : "Post to parents"}</button>
              </div>
            </form>
          )}

          {used.length > 1 && (
            <div className="-mx-4 overflow-x-auto px-4">
              <div className="flex w-max gap-2">
                {["", ...used].map((area) => (
                  <button key={area || "all"} type="button" onClick={() => setSubject(area)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${subject === area ? "bg-brand-700 text-white" : "bg-white text-brand-600 ring-1 ring-brand-200 hover:bg-brand-50"}`}>
                    {area || "All"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!items ? <Loader /> : shown.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 py-10 text-center text-brand-500">
              <BookOpenCheck size={32} className="text-brand-300" />
              <p className="font-semibold text-brand-700">Nothing posted yet</p>
              {canPost && <p className="text-sm">Add notes, a worksheet or a helpful link and parents will see it straight away.</p>}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {shown.map((item) => (
                <MaterialCard key={item.id} material={item} onDelete={canPost && (user.role === "admin" || item.teacher_id === user.id) ? remove : null} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
