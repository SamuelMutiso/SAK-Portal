import { BookOpenCheck } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../../api/client";
import Loader from "../../../components/Loader";
import MaterialCard from "../../../components/MaterialCard";

export default function Learning({ student }) {
  const [items, setItems] = useState(null);
  const [subject, setSubject] = useState("");

  useEffect(() => {
    api.get("/learning/materials", { params: { student_id: student.id } }).then(({ data }) => setItems(data));
  }, [student.id]);

  if (!items) return <Loader />;

  const subjects = [...new Set(items.map((item) => item.subject))];
  const shown = items.filter((item) => !subject || item.subject === subject);

  return (
    <div className="space-y-4">
      <p className="text-sm text-brand-500">Notes, worksheets and links from {student.first_name}'s teachers. Go through them together at home.</p>
      {subjects.length > 1 && (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex w-max gap-2">
            {["", ...subjects].map((area) => (
              <button key={area || "all"} type="button" onClick={() => setSubject(area)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${subject === area ? "bg-brand-700 text-white" : "bg-white text-brand-600 ring-1 ring-brand-200 hover:bg-brand-50"}`}>
                {area || "All"}
              </button>
            ))}
          </div>
        </div>
      )}
      {shown.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-10 text-center text-brand-500">
          <BookOpenCheck size={32} className="text-brand-300" />
          <p className="font-semibold text-brand-700">Nothing posted yet</p>
          <p className="text-sm">When {student.first_name}'s teacher shares notes or worksheets, they will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shown.map((item) => <MaterialCard key={item.id} material={item} />)}
        </div>
      )}
    </div>
  );
}
