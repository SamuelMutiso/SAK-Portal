import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/client";
import LearnerList from "../../components/LearnerList";
import Loader from "../../components/Loader";

export default function Performance() {
  const role = useSelector((state) => state.auth.user.role);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState("all");

  useEffect(() => {
    api.get("/analytics/performance").then(({ data: result }) => setData(result));
  }, []);

  if (!data) return <Loader />;

  const classes = selected === "all" ? data.classes : data.classes.filter((item) => String(item.classroom_id) === selected);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1">
          <h1 className="page-title">Performance</h1>
          <p className="mt-2 max-w-2xl text-brand-500">
            Top learners, the most improved and those who need support, class by class. Grade 4 to 9 use marks; Playgroup to Grade 3 use CBC levels (EE = 4, BE = 1).
          </p>
        </div>
        <select className="input w-auto" value={selected} onChange={(event) => setSelected(event.target.value)}>
          <option value="all">All classes</option>
          {data.classes.map((item) => <option key={item.classroom_id} value={item.classroom_id}>{item.name}</option>)}
        </select>
      </div>

      <div className="space-y-5">
        {classes.map((item) => (
          <section key={item.classroom_id} className="card">
            <div className="flex flex-wrap items-baseline gap-3 border-b border-brand-50 pb-3">
              <h2 className="font-headline text-3xl font-extrabold uppercase text-brand-800">{item.name}</h2>
              <p className="flex-1 text-sm text-brand-500">{item.teacher_name} · {item.learners} learners</p>
              <p className="text-sm text-brand-500">
                Class average <span className="font-mono text-lg font-semibold text-brand-800">{item.scale === "marks" ? `${item.mean}%` : item.mean.toFixed(1)}</span>
              </p>
              <Link to={`/${role}/insights?class=${item.classroom_id}`} className="text-sm font-semibold text-brand-600 hover:underline">Full insights</Link>
            </div>
            <div className="mt-4 grid gap-5 md:grid-cols-3">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-brand-700">Top performers</h3>
                <LearnerList learners={item.top} scale={item.scale} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-emerald-700">Most improved</h3>
                <LearnerList learners={item.most_improved} scale={item.scale} showChange empty="No improvement recorded yet." />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-red-700">Need extra support</h3>
                <LearnerList learners={item.needs_support} scale={item.scale} empty="Class too small to show." />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
