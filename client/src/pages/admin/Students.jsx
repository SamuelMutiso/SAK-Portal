import { Bus, BedDouble, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../../api/client";
import Loader from "../../components/Loader";
import { fetchStudents } from "../../store/slices/studentsSlice";

export default function Students() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.students);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [classroomId, setClassroomId] = useState("");

  useEffect(() => {
    api.get("/classes").then(({ data }) => setClasses(data));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(fetchStudents({ search: search || undefined, classroom_id: classroomId || undefined }));
    }, 300);
    return () => clearTimeout(timer);
  }, [dispatch, search, classroomId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Students</h1>
        <p className="text-brand-500">{items.length} learners found</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pl-10" placeholder="Search by name or admission number" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <select className="input sm:w-48" value={classroomId} onChange={(event) => setClassroomId(event.target.value)}>
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
                <tr key={student.id} className="flex flex-col gap-1 px-5 py-4 md:table-row md:p-0">
                  <td className="md:px-5 md:py-3">
                    <p className="font-semibold text-brand-800">{student.full_name}</p>
                    <p className="font-mono text-xs text-brand-400">{student.admission_number}</p>
                  </td>
                  <td className="md:px-5 md:py-3">{student.classroom_name}</td>
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
