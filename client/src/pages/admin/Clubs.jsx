import { CalendarDays, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/client";
import Loader from "../../components/Loader";

export default function Clubs() {
  const [clubs, setClubs] = useState(null);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    api.get("/clubs").then(({ data }) => setClubs(data));
  }, []);

  function openClub(club) {
    setSelected(club);
    setMembers([]);
    api.get(`/clubs/${club.id}/members`).then(({ data }) => setMembers(data));
  }

  if (!clubs) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Clubs & Activities</h1>
        <p className="text-brand-500">Tap a club to see its members.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club) => (
          <button
            key={club.id}
            onClick={() => openClub(club)}
            className={`card text-left transition hover:-translate-y-0.5 hover:shadow-md ${selected?.id === club.id ? "ring-2 ring-gold-500" : ""}`}
          >
            <h3 className="text-lg font-semibold text-brand-800">{club.name}</h3>
            <p className="mt-1 text-sm text-brand-500">{club.description}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-brand-600">
              <span className="flex items-center gap-1"><CalendarDays size={14} /> {club.meeting_day}s</span>
              <span className="flex items-center gap-1"><Users size={14} /> {club.member_count} members</span>
              <span className="flex items-center gap-1"><User size={14} /> {club.patron_name}</span>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="card">
          <h2 className="font-semibold text-brand-800">{selected.name} members</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((student) => (
              <div key={student.id} className="rounded-xl bg-brand-50 px-3 py-2 text-sm">
                <p className="font-semibold">{student.full_name}</p>
                <p className="text-xs text-brand-500">{student.classroom_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
