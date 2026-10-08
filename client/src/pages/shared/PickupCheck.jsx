import { Phone, Search, ShieldCheck, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/client";

export default function PickupCheck() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      api.get("/pickups/check", { params: { search } }).then(({ data }) => setResults(data));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Pick-up check</h1>
        <p className="mt-2 text-brand-500">Before releasing a learner, confirm the adult is on their parent&apos;s approved list.</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
        <input className="input py-3 pl-10 text-base" placeholder="Learner name or admission number" value={search} onChange={(event) => setSearch(event.target.value)} autoFocus />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {results.map((student) => (
          <div key={student.id} className="card">
            <p className="text-lg font-semibold text-brand-800">{student.full_name}</p>
            <p className="text-sm text-brand-500">{student.classroom_name} · <span className="font-mono">{student.admission_number}</span></p>

            <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-700"><ShieldCheck size={16} className="text-emerald-600" /> Allowed to pick up</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {student.parent_name && (
                <li className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                  <UserCheck size={15} className="text-emerald-600" />
                  <span className="flex-1">{student.parent_name} <span className="text-brand-400">(parent)</span></span>
                  <span className="font-mono text-xs">{student.parent_phone}</span>
                </li>
              )}
              {student.pickups.map((person) => (
                <li key={person.id} className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                  <UserCheck size={15} className="text-emerald-600" />
                  <span className="flex-1">{person.full_name} <span className="text-brand-400">({person.relationship})</span></span>
                  <span className="font-mono text-xs">{person.phone}</span>
                </li>
              ))}
            </ul>

            {student.emergency_contact?.name && (
              <p className="mt-3 flex items-center gap-2 text-sm text-brand-600">
                <Phone size={14} /> Emergency: {student.emergency_contact.name} · <span className="font-mono">{student.emergency_contact.phone}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
