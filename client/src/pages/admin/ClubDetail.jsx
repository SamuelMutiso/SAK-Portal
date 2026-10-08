import { format, isBefore, startOfToday } from "date-fns";
import { ArrowLeft, CalendarDays, MapPin, Phone, Star, Trash2, User, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";

export default function ClubDetail() {
  const { id } = useParams();
  const user = useSelector((state) => state.auth.user);
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState({ title: "", date: "", description: "" });
  const [admission, setAdmission] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/clubs/${id}`).then(({ data: result }) => setData(result));
  }, [id]);

  async function addActivity(event) {
    event.preventDefault();
    try {
      const { data: created } = await api.post(`/clubs/${id}/activities`, activity);
      setData({ ...data, activities: [created, ...data.activities].sort((a, b) => b.date.localeCompare(a.date)) });
      setActivity({ title: "", date: "", description: "" });
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function removeActivity(activityId) {
    await api.delete(`/clubs/activities/${activityId}`);
    setData({ ...data, activities: data.activities.filter((item) => item.id !== activityId) });
  }

  async function addMember(event) {
    event.preventDefault();
    try {
      const { data: student } = await api.post(`/clubs/${id}/members`, { admission_number: admission });
      if (!data.members.some((member) => member.id === student.id)) {
        setData({ ...data, members: [...data.members, student], club: { ...data.club, member_count: data.club.member_count + 1 } });
      }
      setAdmission("");
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function removeMember(studentId) {
    await api.delete(`/clubs/${id}/members/${studentId}`);
    const club = { ...data.club, member_count: data.club.member_count - 1 };
    if (club.leader_id === studentId) {
      club.leader_id = null;
      club.leader_name = null;
    }
    setData({ ...data, club, members: data.members.filter((member) => member.id !== studentId) });
  }

  async function makeLeader(studentId) {
    const { data: club } = await api.patch(`/clubs/${id}`, { leader_id: studentId });
    setData({ ...data, club });
  }

  if (!data) return <Loader />;

  const { club, members, activities, can_manage: canManage } = data;
  const today = startOfToday();
  const upcoming = activities.filter((item) => !isBefore(new Date(item.date), today)).reverse();
  const past = activities.filter((item) => isBefore(new Date(item.date), today));

  return (
    <div className="space-y-6">
      <Link to={`/${user.role}/clubs`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
        <ArrowLeft size={16} /> All clubs
      </Link>

      <section className="rounded-3xl bg-brand-800 p-6 text-white md:p-8">
        <h1 className="font-headline text-5xl font-extrabold uppercase leading-none">{club.name}</h1>
        <p className="mt-2 max-w-2xl text-brand-100">{club.description}</p>
        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-brand-300">Teacher in charge</p>
            <p className="mt-1 flex items-center gap-2 font-semibold"><User size={16} className="text-gold-400" /> {club.patron_name || "Not assigned"}</p>
            {club.patron_phone && <p className="mt-0.5 flex items-center gap-2 font-mono text-xs text-brand-200"><Phone size={12} /> {club.patron_phone}</p>}
          </div>
          <div>
            <p className="text-brand-300">Club leader</p>
            <p className="mt-1 flex items-center gap-2 font-semibold"><Star size={16} className="text-gold-400" /> {club.leader_name || "Not chosen yet"}</p>
          </div>
          <div>
            <p className="text-brand-300">Meets</p>
            <p className="mt-1 flex items-center gap-2 font-semibold"><CalendarDays size={16} className="text-gold-400" /> {club.meeting_day}s, 3:30pm</p>
          </div>
          <div>
            <p className="text-brand-300">Venue</p>
            <p className="mt-1 flex items-center gap-2 font-semibold"><MapPin size={16} className="text-gold-400" /> {club.venue || "To be announced"}</p>
          </div>
        </div>
      </section>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="card">
            <h2 className="text-lg font-semibold text-brand-800">Coming up</h2>
            <ul className="mt-3 space-y-3">
              {upcoming.length === 0 && <li className="text-sm text-brand-400">Nothing planned yet.</li>}
              {upcoming.map((item) => (
                <li key={item.id} className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gold-100 text-gold-600">
                    <span className="text-xs font-semibold">{format(new Date(item.date), "MMM")}</span>
                    <span className="font-mono text-lg font-semibold">{format(new Date(item.date), "d")}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{item.title}</p>
                    {item.description && <p className="text-sm text-brand-600">{item.description}</p>}
                  </div>
                  {canManage && (
                    <button onClick={() => removeActivity(item.id)} className="self-start rounded-lg p-1.5 text-brand-300 hover:text-red-600" aria-label="Remove activity"><Trash2 size={15} /></button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-brand-800">What the club has done</h2>
            <ol className="mt-4 space-y-4 border-l-2 border-brand-100 pl-5">
              {past.length === 0 && <li className="text-sm text-brand-400">No activities recorded yet.</li>}
              {past.map((item) => (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
                  <p className="text-xs font-semibold text-brand-400">{format(new Date(item.date), "EEEE d MMMM")}</p>
                  <p className="font-semibold">{item.title}</p>
                  {item.description && <p className="text-sm text-brand-600">{item.description}</p>}
                </li>
              ))}
            </ol>
          </div>

          {canManage && (
            <form onSubmit={addActivity} className="card space-y-3">
              <h2 className="font-semibold text-brand-800">Add an activity</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <input className="input sm:col-span-2" placeholder="Planted kale seedlings" value={activity.title} onChange={(event) => setActivity({ ...activity, title: event.target.value })} required />
                <input type="date" className="input" value={activity.date} onChange={(event) => setActivity({ ...activity, date: event.target.value })} required />
              </div>
              <textarea rows={2} className="input" placeholder="What happened, or what members should bring" value={activity.description} onChange={(event) => setActivity({ ...activity, description: event.target.value })} />
              <button className="btn-primary">Save activity</button>
            </form>
          )}
        </div>

        <div className="card h-fit p-0 lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-lg font-semibold text-brand-800">Members</h2>
            <span className="font-mono text-sm text-brand-500">{members.length}</span>
          </div>
          {canManage && (
            <form onSubmit={addMember} className="flex gap-2 px-5 pt-3">
              <input className="input font-mono uppercase" placeholder="Admission no." value={admission} onChange={(event) => setAdmission(event.target.value)} required />
              <button className="btn-ghost px-3" aria-label="Add member"><UserPlus size={16} /></button>
            </form>
          )}
          <ul className="mt-3 max-h-[60vh] divide-y divide-brand-50 overflow-y-auto">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-2 px-5 py-2.5 text-sm">
                <div className="flex-1">
                  <p className="font-semibold">
                    {member.full_name}
                    {club.leader_id === member.id && <span className="badge ml-2 bg-gold-100 text-gold-600"><Star size={11} /> Leader</span>}
                  </p>
                  <p className="text-xs text-brand-400">{member.classroom_name}</p>
                </div>
                {canManage && club.leader_id !== member.id && (
                  <button onClick={() => makeLeader(member.id)} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-500 hover:bg-gold-100 hover:text-gold-600">Make leader</button>
                )}
                {canManage && (
                  <button onClick={() => removeMember(member.id)} className="rounded-lg p-1.5 text-brand-300 hover:text-red-600" aria-label={`Remove ${member.full_name}`}><Trash2 size={15} /></button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
