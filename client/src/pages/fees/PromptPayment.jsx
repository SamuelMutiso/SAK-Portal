import { Search, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/client";
import LearnerAvatar from "../../components/LearnerAvatar";
import MpesaPrompt from "../../components/MpesaPrompt";
import { formatKes } from "../../constants";

export default function PromptPayment() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [account, setAccount] = useState(null);

  const open = (studentId) => {
    api.get(`/fees/students/${studentId}/statement`).then(({ data }) => {
      setAccount(data);
      setMatches([]);
      setSearch("");
    });
  };

  useEffect(() => {
    const preset = params.get("student");
    if (preset) open(preset);
  }, [params]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setMatches([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      api.get("/students", { params: { search } }).then(({ data }) => setMatches(data.slice(0, 8)));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Send M-Pesa prompt</h1>
        <p className="mt-1 text-brand-500">For parents at the office or on the phone. Pick the learner, check the number, and the parent gets the M-Pesa PIN prompt on their phone. The payment is recorded and the receipt sent automatically.</p>
      </div>

      {!account ? (
        <div className="card space-y-3">
          <label htmlFor="prompt-search" className="label">Find the learner</label>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" />
            <input id="prompt-search" className="input pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or admission number" autoComplete="off" autoFocus />
          </div>
          {matches.length > 0 && (
            <ul className="divide-y divide-brand-50 overflow-hidden rounded-xl border border-brand-100">
              {matches.map((student) => (
                <li key={student.id}>
                  <button type="button" onClick={() => open(student.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-brand-50">
                    <LearnerAvatar student={student} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-brand-800">{student.full_name}</p>
                      <p className="truncate text-xs text-brand-400">{student.classroom_name} · {student.admission_number}</p>
                    </div>
                    <span className={`shrink-0 font-mono text-sm font-semibold ${student.fee_balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>{formatKes(student.fee_balance)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {search.trim().length >= 2 && matches.length === 0 && <p className="text-sm text-brand-400">No learner found.</p>}
        </div>
      ) : (
        <>
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
            <button type="button" onClick={() => setAccount(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-brand-400 hover:bg-brand-50" aria-label="Choose another learner"><X size={20} /></button>
          </div>
          <MpesaPrompt key={account.student.id} student={account.student} balance={account.balance} defaultPhone={account.student.parent_phone} staff onPaid={() => open(account.student.id)} />
          <p className="flex items-start gap-2 text-xs text-brand-400"><Smartphone size={14} className="mt-0.5 shrink-0" /> The number can be changed if the parent wants to pay from another phone.</p>
        </>
      )}
    </div>
  );
}
