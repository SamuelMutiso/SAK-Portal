import { CalendarDays, ChevronRight, MapPin, Star, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import api from "../../api/client";
import Loader from "../../components/Loader";

export default function Clubs() {
  const user = useSelector((state) => state.auth.user);
  const [clubs, setClubs] = useState(null);

  useEffect(() => {
    api.get("/clubs").then(({ data }) => setClubs(data));
  }, []);

  if (!clubs) return <Loader />;

  const mine = clubs.filter((club) => club.patron_id === user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Clubs & activities</h1>
        <p className="mt-2 text-brand-500">Open a club to see its members, leader, teacher in charge and activities.</p>
      </div>

      {user.role === "teacher" && mine.length > 0 && (
        <p className="rounded-xl bg-gold-100 px-4 py-3 text-sm text-brand-800">You are the teacher in charge of {mine.map((club) => club.name).join(", ")}.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club) => (
          <Link key={club.id} to={`/${user.role}/clubs/${club.id}`} className="card group flex flex-col transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start gap-2">
              <h3 className="flex-1 text-lg font-semibold text-brand-800">{club.name}</h3>
              <ChevronRight size={18} className="text-brand-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
            </div>
            <p className="mt-1 flex-1 text-sm text-brand-500">{club.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-brand-600">
              <span className="flex items-center gap-1.5"><User size={14} /> {club.patron_name}</span>
              <span className="flex items-center gap-1.5"><Star size={14} /> {club.leader_name || "No leader yet"}</span>
              <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {club.meeting_day}s</span>
              <span className="flex items-center gap-1.5"><Users size={14} /> {club.member_count} members</span>
              {club.venue && <span className="col-span-2 flex items-center gap-1.5"><MapPin size={14} /> {club.venue}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
