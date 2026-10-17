import { ChevronRight, Search, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";
import LearnerAvatar from "../../components/LearnerAvatar";
import Loader from "../../components/Loader";
import MpesaPrompt from "../../components/MpesaPrompt";
import { formatKes } from "../../constants";

export default function PromptPayment() {
  const [params, setParams] = useSearchParams();
  const [classes, setClasses] = useState(null);
  const [learners, setLearners] = useState(null);
  const [classId, setClassId] = useState(null);
  const [owingOnly, setOwingOnly] = useState(true);
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/classes"), api.get("/students")]).then(([classList, students]) => {
      setClasses(classList.data);
      setLearners(students.data);
    });
  }, []);

  const open = (studentId) => {
    api.get(`/fees/students/${studentId}/statement`).then(({ data }) => {
      setAccount(data);
      setSearch("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  useEffect(() => {
    const preset = params.get("student");
    if (preset) open(preset);
  }, [params]);

  const refresh = (studentId) => {
    open(studentId);
    api.get("/students").then(({ data }) => setLearners(data));
  };

  if (!classes || !learners) return <Loader />;

  const owing = (list) => list.filter((student) => student.fee_balance > 0);
  const counts = Object.fromEntries(classes.map((item) => {
    const inClass = learners.filter((student) => student.classroom_id === item.id);
    return [item.id, { owing: owing(inClass).length, total: owing(inClass).reduce((sum, student) => sum + student.fee_balance, 0) }];
  }));
  const words = search.trim().toLowerCase();
  let shown = words.length >= 2
    ? learners.filter((student) => `${student.full_name} ${student.admission_number}`.toLowerCase().includes(words))
    : learners.filter((student) => !classId || student.classroom_id === classId);
  if (owingOnly && words.length < 2) shown = owing(shown);
  shown = [...shown].sort((a, b) => b.fee_balance - a.fee_balance || a.full_name.localeCompare(b.full_name));

  if (account) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <button type="button" onClick={() => { setAccount(null); setParams({}); }} className="btn-ghost">Back to the list</button>
        <div className="card flex items-center gap-4">
          <LearnerAvatar student={account.student} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-brand-800">{account.student.full_name}</p>
            <p className="truncate text-sm text-brand-500">{account.student.classroom_name} · <span className="font-mono">{account.student.admission_number}</span></p>
            <p className="mt-1 text-sm">
              Balance <span className={`font-mono font-semibold ${account.balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{formatKes(account.balance)}</span>
              {account.student.parent_name && <span className="text-brand-400"> · Parent: {account.student.parent_name}</span>}
            </p>
          </div>
          <button type="button" onClick={() => { setAccount(null); setParams({}); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-brand-400 hover:bg-brand-50" aria-label="Choose another learner"><X size={20} /></button>
        </div>
        <MpesaPrompt key={account.student.id} student={account.student} balance={account.balance} defaultPhone={account.student.parent_phone} staff onPaid={() => refresh(account.student.id)} />
        <p className="flex items-start gap-2 text-xs text-brand-400"><Smartphone size={14} className="mt-0.5 shrink-0" /> Change the amount for a part payment, or the number if the parent wants to pay from another phone.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Send M-Pesa prompt</h1>
        <p className="mt-1 text-brand-500">Pick a class, tap the learner, and the parent gets the M-Pesa PIN prompt on their phone. The payment is recorded and the receipt sent automatically.</p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2">
          <button type="button" onClick={() => setClassId(null)} className={`rounded-2xl px-4 py-2.5 text-left text-sm font-semibold ${!classId ? "bg-brand-700 text-white" : "bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"}`}>
            All classes
            <span className={`block text-xs font-normal ${!classId ? "text-brand-100" : "text-brand-400"}`}>{owing(learners).length} owing</span>
          </button>
          {classes.map((item) => (
            <button key={item.id} type="button" onClick={() => setClassId(item.id)} className={`rounded-2xl px-4 py-2.5 text-left text-sm font-semibold ${classId === item.id ? "bg-brand-700 text-white" : "bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"}`}>
              {item.name}
              <span className={`block text-xs font-normal ${classId === item.id ? "text-brand-100" : counts[item.id].owing ? "text-amber-700" : "text-emerald-700"}`}>{counts[item.id].owing ? `${counts[item.id].owing} owing` : "All paid"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" />
          <input className="input pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Or search any learner by name or admission number" aria-label="Search learner" autoComplete="off" />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-brand-700">
          <input type="checkbox" checked={owingOnly} onChange={(event) => setOwingOnly(event.target.checked)} className="h-5 w-5 accent-brand-700" />
          Only learners with a balance
        </label>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-brand-50 px-5 py-3 text-sm">
          <span className="font-semibold text-brand-800">{words.length >= 2 ? "Search results" : classId ? classes.find((item) => item.id === classId)?.name : "All classes"}</span>
          <span className="text-brand-400">{shown.length} learner{shown.length === 1 ? "" : "s"}{!words && classId && counts[classId].total ? ` · ${formatKes(counts[classId].total)} owed` : ""}</span>
        </div>
        {shown.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-brand-500">{owingOnly ? "Everyone here has paid in full. 🎉" : "No learners found."}</p>
        ) : (
          <ul className="divide-y divide-brand-50">
            {shown.map((student) => (
              <li key={student.id}>
                <button type="button" onClick={() => open(student.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-brand-50">
                  <LearnerAvatar student={student} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-brand-800">{student.full_name}</p>
                    <p className="truncate text-xs text-brand-400">{!classId || words ? `${student.classroom_name} · ` : ""}{student.parent_name || "No parent linked"}{student.parent_phone ? ` · ${student.parent_phone}` : ""}</p>
                  </div>
                  <span className={`shrink-0 font-mono text-sm font-semibold ${student.fee_balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{student.fee_balance > 0 ? formatKes(student.fee_balance) : "Paid"}</span>
                  <ChevronRight size={18} className="shrink-0 text-brand-300" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
