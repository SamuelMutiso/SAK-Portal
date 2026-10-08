import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/client";
import ClassInsights from "../../components/ClassInsights";
import Loader from "../../components/Loader";
import MarkChanges from "../../components/MarkChanges";

export default function Insights() {
  const user = useSelector((state) => state.auth.user);
  const [params, setParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [data, setData] = useState(null);
  const [changes, setChanges] = useState([]);
  const classroomId = params.get("class") || "";
  const step = params.get("step") || "";

  useEffect(() => {
    api.get("/classes").then(({ data: list }) => setClasses(list));
  }, []);

  useEffect(() => {
    const [term, exam] = step ? step.split("|") : [];
    const query = { term, exam };
    if (user.role !== "teacher" && classroomId) query.classroom_id = classroomId;
    setData(null);
    api.get("/insights/class", { params: query }).then(({ data: result }) => {
      setData(result);
      api.get("/assessments/changes", { params: { classroom_id: result.classroom_id } }).then(({ data: list }) => setChanges(list));
    });
  }, [classroomId, step, user.role]);

  function choose(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "class") next.delete("step");
    setParams(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="page-title">Class insights</h1>
          <p className="mt-2 max-w-2xl text-brand-500">Worked out automatically every time marks are saved: class means for the exam, term and year, best and weakest subjects, who improved, who is below expectation and who needs attention.</p>
        </div>
        {user.role !== "teacher" && (
          <select className="input w-auto" value={data?.classroom_id || classroomId} onChange={(event) => choose("class", event.target.value)} aria-label="Class">
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}
        {data && !data.empty && (
          <select className="input w-auto" value={`${data.term}|${data.exam}`} onChange={(event) => choose("step", event.target.value)} aria-label="Assessment">
            {data.steps.map((item) => <option key={item.label} value={`${item.term}|${item.exam}`}>{item.term} {item.exam}</option>)}
          </select>
        )}
      </div>

      {data ? <ClassInsights data={data} /> : <Loader />}
      {data && <MarkChanges changes={changes} />}
    </div>
  );
}
