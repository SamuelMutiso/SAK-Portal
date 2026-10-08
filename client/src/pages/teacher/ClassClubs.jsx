import { ArrowLeftRight, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";

export default function ClassClubs() {
  const [data, setData] = useState(null);
  const [moving, setMoving] = useState(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get("/clubs/class").then(({ data: result }) => setData(result)).catch((err) => setMessage({ type: "error", text: errorMessage(err) }));
  }, []);

  async function save(learner, clubIds, text) {
    try {
      const { data: updated } = await api.put(`/clubs/learner/${learner.id}`, { club_ids: clubIds });
      const before = new Set(learner.club_ids);
      const after = new Set(updated.club_ids);
      setData({
        ...data,
        learners: data.learners.map((item) => (item.id === learner.id ? updated : item)),
        clubs: data.clubs.map((club) => {
          const delta = (after.has(club.id) ? 1 : 0) - (before.has(club.id) ? 1 : 0);
          return { ...club, members: club.members + delta, from_class: club.from_class + delta };
        }),
      });
      setMessage({ type: "success", text });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err) });
    }
    setMoving(null);
  }

  if (!data) return message ? <p className="card text-red-700">{message.text}</p> : <Loader />;

  const clubName = Object.fromEntries(data.clubs.map((club) => [club.id, club.name]));
  const learners = data.learners.filter((learner) => learner.full_name.toLowerCase().includes(search.toLowerCase()));
  const without = data.learners.filter((learner) => learner.club_ids.length === 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{data.classroom.name} clubs</h1>
        <p className="mt-2 max-w-2xl text-brand-500">Add your learners to clubs, take them out, or move them from one club to another. The club pages, the office and the director see the change straight away.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.clubs.filter((club) => club.from_class > 0).map((club) => (
          <span key={club.id} className="badge bg-brand-100 text-brand-700">{club.name} <span className="ml-1 font-mono">{club.from_class}</span></span>
        ))}
        {without > 0 && <span className="badge bg-amber-100 text-amber-700">Not in any club <span className="ml-1 font-mono">{without}</span></span>}
      </div>

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message.text}</p>
      )}

      <input className="input max-w-sm" placeholder="Find a learner" value={search} onChange={(event) => setSearch(event.target.value)} />

      <div className="card divide-y divide-brand-50 p-0">
        {learners.map((learner) => {
          const others = data.clubs.filter((club) => !learner.club_ids.includes(club.id));
          return (
            <div key={learner.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
              <div className="min-w-44 flex-1">
                <p className="font-semibold">{learner.full_name}</p>
                <p className="font-mono text-xs text-brand-400">{learner.admission_number}</p>
              </div>
              {learner.club_ids.map((clubId) =>
                moving?.learner === learner.id && moving.club === clubId ? (
                  <span key={clubId} className="flex items-center gap-1.5 rounded-full bg-gold-100 py-1 pl-3 pr-1 text-sm">
                    <span className="font-semibold text-brand-800">Move from {clubName[clubId]} to</span>
                    <select
                      autoFocus
                      className="rounded-full border-0 bg-white py-1 pl-2 pr-7 text-sm"
                      defaultValue=""
                      onChange={(event) => {
                        const target = Number(event.target.value);
                        save(learner, [...learner.club_ids.filter((item) => item !== clubId), target], `${learner.full_name} moved from ${clubName[clubId]} to ${clubName[target]}.`);
                      }}
                      aria-label="Move to club"
                    >
                      <option value="" disabled>pick a club</option>
                      {others.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                    </select>
                    <button onClick={() => setMoving(null)} className="rounded-full p-1 text-brand-400 hover:text-brand-800" aria-label="Cancel"><X size={14} /></button>
                  </span>
                ) : (
                  <span key={clubId} className="flex items-center gap-0.5 rounded-full bg-brand-100 py-1 pl-3 pr-1 text-sm font-semibold text-brand-700">
                    {clubName[clubId]}
                    <button onClick={() => setMoving({ learner: learner.id, club: clubId })} className="rounded-full p-1 hover:bg-white" title={`Move to another club`} aria-label={`Move ${learner.full_name} out of ${clubName[clubId]}`}><ArrowLeftRight size={13} /></button>
                    <button onClick={() => save(learner, learner.club_ids.filter((item) => item !== clubId), `${learner.full_name} removed from ${clubName[clubId]}.`)} className="rounded-full p-1 hover:bg-white hover:text-red-600" title="Remove from club" aria-label={`Remove ${learner.full_name} from ${clubName[clubId]}`}><X size={13} /></button>
                  </span>
                )
              )}
              <label className="relative flex items-center">
                <Plus size={14} className="pointer-events-none absolute left-2.5 text-brand-500" />
                <select
                  className="rounded-full border border-dashed border-brand-200 bg-white py-1 pl-7 pr-7 text-sm text-brand-500"
                  value=""
                  onChange={(event) => {
                    const target = Number(event.target.value);
                    save(learner, [...learner.club_ids, target], `${learner.full_name} added to ${clubName[target]}.`);
                  }}
                  aria-label={`Add ${learner.full_name} to a club`}
                >
                  <option value="" disabled>Add to club</option>
                  {others.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                </select>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
