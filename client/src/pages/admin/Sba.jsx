import { AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/client";
import Loader from "../../components/Loader";

export default function Sba() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.get("/sba").then(({ data: result }) => setData(result));
  }, []);

  async function download(classroom) {
    const response = await api.get(`/sba/export/${classroom.classroom_id}`, { responseType: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(response.data);
    link.download = `SBA_${classroom.name.replace(" ", "_")}_${data.term.replace(/ /g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!data) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">KNEC school-based assessment</h1>
        <p className="mt-2 max-w-2xl text-brand-500">
          {data.term}. Grade 4 to 6 marks make up 60% of KPSEA, and Grade 7 to 8 marks count towards KJSEA. Check every learner has marks before uploading to the KNEC portal.
        </p>
      </div>

      {data.classes.map((classroom) => {
        const complete = classroom.areas.filter((area) => area.missing.length === 0).length;
        const ready = complete === classroom.areas.length && classroom.missing_assessment_numbers.length === 0;
        return (
          <div key={classroom.classroom_id} className="card">
            <div className="flex flex-wrap items-center gap-3">
              {ready ? <CheckCircle2 className="text-emerald-600" /> : <AlertTriangle className="text-amber-500" />}
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-brand-800">{classroom.name}</h2>
                <p className="text-sm text-brand-500">
                  {classroom.students} learners · {complete} of {classroom.areas.length} learning areas complete
                </p>
              </div>
              <button className="btn-ghost" onClick={() => setOpen(open === classroom.classroom_id ? null : classroom.classroom_id)}>
                {open === classroom.classroom_id ? "Hide details" : "Show details"}
              </button>
              <button className="btn-primary" onClick={() => download(classroom)}>
                <Download size={16} /> Export CSV
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {classroom.areas.map((area) => {
                const percent = Math.round((area.done / Math.max(classroom.students, 1)) * 100);
                return (
                  <div key={area.name} className="rounded-xl bg-brand-50 p-3">
                    <p className="truncate text-xs font-semibold text-brand-600" title={area.name}>{area.name}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-brand-100">
                      <div className={`h-1.5 rounded-full ${percent === 100 ? "bg-emerald-500" : "bg-gold-500"}`} style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-1 font-mono text-xs text-brand-500">{area.done}/{classroom.students}</p>
                  </div>
                );
              })}
            </div>

            {open === classroom.classroom_id && (
              <div className="mt-4 space-y-3 text-sm">
                {classroom.missing_assessment_numbers.length > 0 && (
                  <p className="rounded-xl bg-amber-50 p-3 text-amber-800">
                    No KNEC assessment number: {classroom.missing_assessment_numbers.join(", ")}
                  </p>
                )}
                {classroom.areas.filter((area) => area.missing.length).map((area) => (
                  <p key={area.name}>
                    <span className="font-semibold">{area.name}</span> is missing marks for: {area.missing.join(", ")}
                  </p>
                ))}
                {ready && <p className="text-emerald-700">Everything is in. This class is ready to upload.</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
