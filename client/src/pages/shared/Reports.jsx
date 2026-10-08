import { CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import ReportCardView from "../../components/ReportCardView";
import { RUBRIC_CODES } from "../../constants";

function RubricRow({ name, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <span className="text-sm">{name}</span>
      <div className="flex gap-1">
        {RUBRIC_CODES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            className={`w-10 rounded-lg py-1 font-mono text-xs font-semibold ${value === code ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-500 hover:bg-brand-100"}`}
          >
            {code}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Reports() {
  const user = useSelector((state) => state.auth.user);
  const isAdmin = user.role === "admin";
  const [meta, setMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    api.get("/meta").then(({ data: result }) => setMeta(result));
    api.get("/reports/class").then(({ data: result }) => setRows(result));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    api.get(`/reports/student/${selectedId}`).then(({ data: result }) => {
      setData(result);
      const report = result.report || {};
      setForm({
        competencies: report.competencies || {},
        values: report.values || {},
        co_curricular: report.co_curricular || result.student.clubs.join(", "),
        teacher_comment: report.teacher_comment || "",
        head_comment: report.head_comment || "",
        closing_date: report.closing_date || "",
        opening_date: report.opening_date || "",
      });
      setMessage(null);
      setPreview(false);
    });
  }, [selectedId]);

  async function handleSave() {
    const payload = { ...form, closing_date: form.closing_date || null, opening_date: form.opening_date || null };
    try {
      const { data: report } = await api.put(`/reports/student/${selectedId}`, payload);
      setData({ ...data, report });
      setRows(rows.map((row) => (row.student_id === selectedId ? {
        ...row,
        has_teacher_comment: Boolean(report.teacher_comment),
        competencies_done: Object.keys(report.competencies || {}).length,
        has_head_comment: Boolean(report.head_comment),
      } : row)));
      setMessage({ type: "success", text: "Report saved. Parents can see it now." });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error) });
    }
  }

  if (!meta) return <Loader />;

  const classes = [...new Set(rows.map((row) => row.classroom_name))];
  const visible = rows.filter((row) => !filter || row.classroom_name === filter);
  const isDone = (row) => (isAdmin ? row.has_head_comment : row.has_teacher_comment && row.competencies_done === meta.competencies.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Report cards</h1>
        <p className="mt-2 text-brand-500">
          {meta.term} · {isAdmin ? "Add the head teacher's comment and term dates." : "Rate competencies and values, then write your comment."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card h-fit p-0">
          {isAdmin && (
            <div className="border-b border-brand-100 p-3">
              <select className="input" value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="">All classes</option>
                {classes.map((name) => <option key={name}>{name}</option>)}
              </select>
            </div>
          )}
          <ul className="max-h-[70vh] divide-y divide-brand-50 overflow-y-auto">
            {visible.map((row) => (
              <li key={row.student_id}>
                <button
                  onClick={() => setSelectedId(row.student_id)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-brand-50 ${selectedId === row.student_id ? "bg-gold-100" : ""}`}
                >
                  {isDone(row) ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="text-brand-300" />}
                  <span className="flex-1 font-semibold">{row.full_name}</span>
                  {isAdmin && <span className="text-xs text-brand-400">{row.classroom_name}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {!selectedId && <p className="card text-sm text-brand-500">Pick a learner to fill in their report.</p>}
          {selectedId && !form && <Loader />}
          {data && form && (
            <>
              <div className="flex gap-1 rounded-xl bg-brand-50 p-1 print:hidden">
                <button onClick={() => setPreview(false)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${!preview ? "bg-white shadow-sm" : "text-brand-500"}`}>Edit</button>
                <button onClick={() => setPreview(true)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${preview ? "bg-white shadow-sm" : "text-brand-500"}`}>Preview</button>
              </div>

              {preview ? (
                <ReportCardView data={data} competencies={meta.competencies} values={meta.values} />
              ) : (
                <div className="card space-y-5">
                  <h2 className="text-lg font-semibold text-brand-800">{data.student.full_name} · {data.student.classroom_name}</h2>

                  {!isAdmin && (
                    <>
                      <div>
                        <p className="label">Core competencies</p>
                        <div className="divide-y divide-brand-50">
                          {meta.competencies.map((name) => (
                            <RubricRow key={name} name={name} value={form.competencies[name]} onChange={(code) => setForm({ ...form, competencies: { ...form.competencies, [name]: code } })} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="label">Values</p>
                        <div className="divide-y divide-brand-50">
                          {meta.values.map((name) => (
                            <RubricRow key={name} name={name} value={form.values[name]} onChange={(code) => setForm({ ...form, values: { ...form.values, [name]: code } })} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="label" htmlFor="co">Co-curricular activities</label>
                        <input id="co" className="input" value={form.co_curricular} onChange={(event) => setForm({ ...form, co_curricular: event.target.value })} />
                      </div>
                      <div>
                        <label className="label" htmlFor="tc">Class teacher&apos;s comment</label>
                        <textarea id="tc" rows={3} className="input" value={form.teacher_comment} onChange={(event) => setForm({ ...form, teacher_comment: event.target.value })} />
                      </div>
                    </>
                  )}

                  {isAdmin && (
                    <>
                      <div className="rounded-xl bg-brand-50 p-4 text-sm">
                        <p className="text-brand-400">Class teacher&apos;s comment</p>
                        <p className="mt-1 italic">{data.report?.teacher_comment || "The class teacher has not written a comment yet."}</p>
                      </div>
                      <div>
                        <label className="label" htmlFor="hc">Head teacher&apos;s comment</label>
                        <textarea id="hc" rows={3} className="input" value={form.head_comment} onChange={(event) => setForm({ ...form, head_comment: event.target.value })} />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label" htmlFor="close">Closing date</label>
                          <input id="close" type="date" className="input" value={form.closing_date} onChange={(event) => setForm({ ...form, closing_date: event.target.value })} />
                        </div>
                        <div>
                          <label className="label" htmlFor="open">Next term opens</label>
                          <input id="open" type="date" className="input" value={form.opening_date} onChange={(event) => setForm({ ...form, opening_date: event.target.value })} />
                        </div>
                      </div>
                    </>
                  )}

                  {message && (
                    <p className={`rounded-xl px-3 py-2 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
                  )}
                  <button className="btn-primary w-full sm:w-auto" onClick={handleSave}>Save report</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
