import { Phone, Search } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/client";
import Loader from "../../components/Loader";

export default function People() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("teacher");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([api.get("/users"), api.get("/students"), api.get("/classes"), api.get("/clubs")]).then(([users, students, classes, clubs]) =>
      setData({ users: users.data, students: students.data, classes: classes.data, clubs: clubs.data })
    );
  }, []);

  if (!data) return <Loader />;

  const term = search.toLowerCase();
  const people = data.users.filter((user) => user.role === tab && (user.full_name.toLowerCase().includes(term) || user.phone.includes(term)));

  function detailsFor(user) {
    if (user.role === "teacher") {
      const classroom = data.classes.find((item) => item.teacher_id === user.id);
      const clubs = data.clubs.filter((club) => club.patron_id === user.id).map((club) => club.name);
      return [classroom ? `Class teacher, ${classroom.name}` : "No class", clubs.length ? `In charge of ${clubs.join(", ")}` : null].filter(Boolean).join(" · ");
    }
    if (user.role === "parent") {
      const children = data.students.filter((student) => student.parent_id === user.id);
      return children.map((child) => `${child.full_name} (${child.classroom_name})`).join(", ") || "No learners linked";
    }
    return "";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">People</h1>
        <p className="mt-2 text-brand-500">Teachers, parents, drivers and office staff at Success Academy.</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex gap-1 rounded-xl bg-brand-50 p-1">
          {[["teacher", "Teachers"], ["parent", "Parents"], ["driver", "Drivers"], ["admin", "Office"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? "bg-white text-brand-800 shadow-sm" : "text-brand-500"}`}>{label}</button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pl-10" placeholder="Search name or phone" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      <p className="text-sm text-brand-500">{people.length} people</p>
      <div className="card divide-y divide-brand-50 p-0">
        {people.map((user) => (
          <div key={user.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">{user.full_name.charAt(0)}</div>
            <div className="min-w-48 flex-1">
              <p className="font-semibold text-brand-800">{user.full_name}</p>
              <p className="text-xs text-brand-500">{detailsFor(user)}</p>
            </div>
            <a href={`tel:${user.phone}`} className="inline-flex items-center gap-1.5 font-mono text-sm text-brand-600 hover:text-brand-900"><Phone size={14} /> {user.phone}</a>
          </div>
        ))}
      </div>
    </div>
  );
}
