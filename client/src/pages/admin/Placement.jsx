import { ClipboardList, Plus, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import QuizReview from "../../components/QuizReview";
import QuizTaker from "../../components/QuizTaker";
import { QuizCard } from "../shared/Quizzes";

export default function Placement() {
  const user = useSelector((state) => state.auth.user);
  const office = user.role === "admin";
  const [items, setItems] = useState(null);
  const [asking, setAsking] = useState(null);
  const [applicant, setApplicant] = useState({ name: "", phone: "" });
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api.get("/quizzes", { params: { purpose: "placement" } }).then(({ data }) => setItems(data));
  }, []);

  useEffect(load, [load]);

  const remove = async (quiz) => {
    if (!window.confirm(`Delete "${quiz.title}" and all its results?`)) return;
    await api.delete(`/quizzes/${quiz.id}`);
    load();
  };

  const begin = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      const { data } = await api.post(`/quizzes/${asking.id}/start`, { candidate_name: applicant.name.trim(), candidate_phone: applicant.phone.replace(/[\s-]/g, "") || null });
      setSession({ ...data, name: applicant.name.trim() });
      setAsking(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const finished = useCallback((data) => {
    setResult({ ...data, name: session?.name, title: session?.quiz.title });
    setSession(null);
    load();
  }, [load, session]);

  if (!items) return <Loader />;

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="page-title">{result.title}</h1>
        <QuizReview result={result.result} review={result.review} name={result.name} />
        <button type="button" onClick={() => setResult(null)} className="btn-primary w-full">Done</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {session && <QuizTaker session={session} takerName={session.name} onDone={finished} onClose={() => { if (window.confirm("Stop this test? The applicant's answers will not be saved.")) setSession(null); }} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Placement tests</h1>
          <p className="mt-1 text-brand-500">Short entry tests for new applicants, marked automatically. Results are kept here under the applicant's name.</p>
        </div>
        {office && <Link to="/admin/quizzes/new?purpose=placement" className="btn-primary"><Plus size={18} /> New test</Link>}
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-10 text-center text-brand-500">
          <ClipboardList size={32} className="text-brand-300" />
          <p className="font-semibold text-brand-700">No placement tests yet</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} base={`/${user.role}/quizzes`} canEdit={office} onDelete={remove}>
              {office && (
                <button type="button" onClick={() => { setApplicant({ name: "", phone: "" }); setError(null); setAsking(quiz); }} className="btn-gold">
                  <UserPlus size={16} /> Give test
                </button>
              )}
            </QuizCard>
          ))}
        </div>
      )}

      {asking && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-brand-900/50 sm:place-items-center" role="dialog" aria-label="Start placement test">
          <form onSubmit={begin} className="w-full space-y-4 rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-brand-800">{asking.title}</h2>
              <button type="button" onClick={() => setAsking(null)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-brand-50" aria-label="Cancel"><X size={20} /></button>
            </div>
            <div>
              <label className="label" htmlFor="applicant-name">Applicant's full name</label>
              <input id="applicant-name" className="input" value={applicant.name} onChange={(event) => setApplicant({ ...applicant, name: event.target.value })} required minLength={3} maxLength={120} autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="applicant-phone">Parent's phone (optional)</label>
              <input id="applicant-phone" type="tel" inputMode="tel" className="input" value={applicant.phone} onChange={(event) => setApplicant({ ...applicant, phone: event.target.value })} placeholder="07XX XXX XXX" />
            </div>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <p className="text-xs text-brand-500">The test opens full screen. Hand the device to the applicant{asking.time_limit ? ` — they have ${asking.time_limit} minutes` : ""}.</p>
            <button type="submit" className="btn-primary w-full">Start test</button>
          </form>
        </div>
      )}
    </div>
  );
}
