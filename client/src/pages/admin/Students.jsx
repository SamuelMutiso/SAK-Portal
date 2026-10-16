import { Bus, BedDouble, Search, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/client";
import Loader from "../../components/Loader";
import { fetchStudents } from "../../store/slices/studentsSlice";

export default function Students() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const role = useSelector((state) => state.auth.user.role);
  const { items, status } = useSelector((state) => state.students);
  const [standing, setStanding] = useState("active");
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [classroomId, setClassroomId] = useState("");

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(fetchStudents({ search: search || undefined, classroom_id: classroomId || undefined, status: standing }));
    }, 300);
    return () => clearTimeout(timer);
  }, [dispatch, search, classroomId, standing]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="page-title">Students</h1>
          <p className="text-brand-500">{items.length} {standing === "active" ? "learners in school" : "former learners"}</p>
        </div>
        {role === "admin" && <Link to="/admin/students/new" className="btn-gold"><UserPlus size={17} /> Admit a learner</Link>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pl-10" placeholder="Search by name or admission number" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="flex gap-1 rounded-xl bg-brand-50 p-1">
          {[["active", "In school"], ["former", "Former"]].map(([value, label]) => (
            <button key={value} onClick={() => setStanding(value)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${standing === value ? "bg-brand-700 text-white" : "text-brand-600 hover:bg-white"}`}>{label}</button>
          ))}
        </div>
        <select className="input sm:w-48" value={classroomId} onChange={(event) => setClassroomId(event.target.value)} disabled={standing !== "active"}>
          <option value="">All classes</option>
          {classes.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
          ))}
        </select>
      </div>

      {status === "loading" && !items.length ? (
        <Loader />
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="hidden bg-brand-50 text-xs uppercase tracking-wide text-brand-500 md:table-header-group">
              <tr>
                <th className="px-5 py-3">Learner</th>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Parent</th>
                <th className="px-5 py-3">Clubs</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {items.map((student) => (
                <tr key={student.id} onClick={() => navigate(`/${role}/students/${student.id}`)} className="flex cursor-pointer flex-col gap-1 px-5 py-4 hover:bg-brand-50 md:table-row md:p-0">
                  <td className="md:px-5 md:py-3">
                    <p className="font-semibold text-brand-800">{student.full_name}</p>
                    <p className="font-mono text-xs text-brand-400">{student.admission_number}</p>
                  </td>
                  <td className="md:px-5 md:py-3">{student.classroom_name || <span className="text-brand-400">{student.last_classroom_name} · {student.status}</span>}</td>
                  <td className="md:px-5 md:py-3">
                    <p>{student.parent_name}</p>
                    <p className="font-mono text-xs text-brand-400">{student.parent_phone}</p>
                  </td>
                  <td className="text-xs text-brand-500 md:px-5 md:py-3">{student.clubs.join(", ") || "None"}</td>
                  <td className="md:px-5 md:py-3">
                    {student.is_boarder ? (
                      <span className="badge bg-violet-100 text-violet-700"><BedDouble size={12} /> Boarder</span>
                    ) : student.route_name ? (
                      <span className="badge bg-amber-100 text-amber-700"><Bus size={12} /> {student.route_name}</span>
                    ) : (
                      <span className="badge bg-brand-100 text-brand-600">Day scholar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
