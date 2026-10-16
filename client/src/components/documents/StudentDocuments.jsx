import { Award, FileText, IdCard as IdCardIcon, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/client";
import Loader from "../Loader";
import CompletionCertificate from "./CompletionCertificate";
import IdCard from "./IdCard";
import LeavingCertificate from "./LeavingCertificate";
import { printDocument } from "./print";

export default function StudentDocuments({ studentId, staff = false }) {
  const [doc, setDoc] = useState(null);
  const [choice, setChoice] = useState(null);
  const [remarks, setRemarks] = useState("A disciplined and hardworking learner who took part fully in school life. We wish them well.");

  useEffect(() => {
    let active = true;
    api.get(`/students/${studentId}/documents`).then(({ data }) => active && setDoc(data));
    return () => {
      active = false;
    };
  }, [studentId]);

  if (!doc) return <Loader />;

  const options = [
    ...(doc.student.status === "active" ? [{ key: "id", label: "Learner ID card", icon: IdCardIcon }] : []),
    ...doc.completions.map((item) => ({ key: item.key, label: item.key === "pp2" ? "PP2 graduation certificate" : `${item.class} completion certificate`, icon: Award, completion: item })),
    ...(doc.can_leave_certificate ? [{ key: "leaving", label: "Leaving certificate", icon: FileText }] : []),
  ];
  const selected = options.find((option) => option.key === choice) || options[0];
  const landscape = Boolean(selected.completion);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {options.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setChoice(key)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${selected.key === key ? "bg-brand-700 text-white" : "bg-white text-brand-600 ring-1 ring-brand-100 hover:bg-brand-50"}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
        <button className="btn-gold ml-auto" onClick={() => printDocument(landscape ? "landscape" : "portrait")}><Printer size={16} /> Print</button>
      </div>

      {selected.completion?.upcoming && (
        <p className="rounded-xl bg-gold-100 px-4 py-2 text-sm text-gold-600 print:hidden">{doc.student.first_name} is in {selected.completion.class} now. Print this for the end-of-year {selected.completion.key === "pp2" ? "graduation" : "closing"} ceremony.</p>
      )}
      {selected.key === "id" && <p className="text-sm text-brand-500 print:hidden">Prints at real card size (85.6 × 54 mm). Cut out both sides and laminate them back to back, or take the printout to a card printer.</p>}
      {selected.key === "leaving" && staff && (
        <div className="print:hidden">
          <label className="label" htmlFor="remarks">Head Teacher&apos;s remarks (printed on the certificate)</label>
          <textarea id="remarks" rows={3} className="input" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
        </div>
      )}

      <div className="doc-print overflow-x-auto">
        {selected.key === "id" && <IdCard doc={doc} />}
        {selected.completion && <CompletionCertificate doc={doc} completion={selected.completion} />}
        {selected.key === "leaving" && <LeavingCertificate doc={doc} remarks={staff ? remarks : ""} />}
      </div>
    </div>
  );
}
