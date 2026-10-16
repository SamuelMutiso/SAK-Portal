import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/client";
import CompletionCertificate from "../../components/documents/CompletionCertificate";
import IdCard from "../../components/documents/IdCard";
import { printDocument } from "../../components/documents/print";
import Loader from "../../components/Loader";

export default function PrintCentre() {
  const [classes, setClasses] = useState([]);
  const [classroomId, setClassroomId] = useState("");
  const [kind, setKind] = useState("id");
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/classes").then(({ data: result }) => {
      setClasses(result);
      if (result.length) setClassroomId(String(result[0].id));
    });
  }, []);

  useEffect(() => {
    if (!classroomId) return undefined;
    let active = true;
    setData(null);
    api.get("/students/documents", { params: { classroom_id: classroomId } }).then(({ data: result }) => active && setData(result));
    return () => {
      active = false;
    };
  }, [classroomId]);

  const certificates = data ? data.documents.flatMap((doc) => doc.completions.filter((item) => item.upcoming).map((completion) => ({ doc, completion }))) : [];
  const kinds = [{ key: "id", label: "ID cards" }, ...(certificates.length ? [{ key: "certificates", label: certificates[0].completion.key === "pp2" ? "Graduation certificates" : "Completion certificates" }] : [])];
  const current = kinds.find((item) => item.key === kind) ? kind : "id";
  const cards = data ? data.documents : [];

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="page-title">Print centre</h1>
        <p className="mt-2 text-brand-500">Print ID cards or end-of-year certificates for a whole class at once.</p>
      </div>

      <div className="card flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label className="label" htmlFor="print-class">Class</label>
          <select id="print-class" className="input" value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>
            {classes.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {kinds.map((item) => (
            <button key={item.key} onClick={() => setKind(item.key)} className={`rounded-full px-4 py-2 text-sm font-semibold ${current === item.key ? "bg-brand-700 text-white" : "bg-white text-brand-600 ring-1 ring-brand-100 hover:bg-brand-50"}`}>{item.label}</button>
          ))}
        </div>
        {data && (
          <button className="btn-gold ml-auto" onClick={() => printDocument(current === "id" ? "portrait" : "landscape")}>
            <Printer size={16} /> Print {current === "id" ? `${cards.length} ID cards` : `${certificates.length} certificates`}
          </button>
        )}
      </div>

      {!data ? <Loader /> : (
        <div className="doc-print space-y-6">
          {current === "id" && cards.length === 0 && <p className="card text-sm text-brand-400">No learners in this class.</p>}
          {current === "id" && cards.map((doc) => (
            <div key={doc.student.id} className="break-inside-avoid">
              <IdCard doc={doc} />
            </div>
          ))}
          {current === "certificates" && certificates.map(({ doc, completion }) => (
            <div key={doc.student.id} className="doc-page">
              <CompletionCertificate doc={doc} completion={completion} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
