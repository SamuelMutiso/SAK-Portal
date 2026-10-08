import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api, { errorMessage } from "../../api/client";
import GradeBadge from "../../components/GradeBadge";
import Loader from "../../components/Loader";
import { showValue } from "../../insights";

const COLORS = ["#1E3A6B", "#DDA22E", "#059669", "#7C3AED"];

export default function Compare() {
  const [classes, setClasses] = useState([]);
  const [picked, setPicked] = useState([]);
  const [step, setStep] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/classes").then(({ data: list }) => {
      setClasses(list);
      const grade4 = list.find((item) => item.name === "Grade 4");
      const grade5 = list.find((item) => item.name === "Grade 5");
      setPicked(grade4 && grade5 ? [grade4.id, grade5.id] : list.slice(0, 2).map((item) => item.id));
    });
  }, []);

  useEffect(() => {
    if (picked.length < 2) {
      setData(null);
      return;
    }
    const [term, exam] = step ? step.split("|") : [];
    api.get("/insights/compare", { params: { classroom_ids: picked.join(","), term, exam } })
      .then(({ data: result }) => {
        setData(result);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [picked, step]);

  function toggle(id) {
    setStep("");
    if (picked.includes(id)) setPicked(picked.filter((item) => item !== id));
    else if (picked.length < 4) setPicked([...picked, id]);
  }

  const scale = data?.classes[0]?.scale;
  const rows = data
    ? [
        { label: "Class mean", render: (item) => <span className="flex items-center justify-end gap-2 font-mono font-semibold">{showValue(item.mean, item.scale)} <GradeBadge grade={item.grade} /></span> },
        { label: "Term mean so far", render: (item) => <span className="font-mono">{showValue(item.term_mean, item.scale)}</span> },
        { label: "Year mean so far", render: (item) => <span className="font-mono">{showValue(item.year_mean, item.scale)}</span> },
        { label: "Meeting expectations or better", render: (item) => <span className="font-mono">{item.meeting_expectation}%</span> },
        { label: "Learners assessed", render: (item) => <span className="font-mono">{item.assessed} of {item.learners}</span> },
        { label: "EE / ME / AE / BE", render: (item) => <span className="font-mono">{["EE", "ME", "AE", "BE"].map((grade) => item.distribution[grade]).join(" / ")}</span> },
        { label: "Best subject", render: (item) => item.best_subject },
        { label: "Weakest subject", render: (item) => item.weakest_subject },
        { label: "Class teacher", render: (item) => item.teacher_name },
      ]
    : [];
  const subjectChart = data ? data.common_subjects.map((subject) => ({ subject, ...Object.fromEntries(data.classes.map((item) => [item.name, item.subjects[subject]])) })) : [];
  const labels = data ? [...new Set(data.classes.flatMap((item) => item.trend.map((point) => point.label)))] : [];
  const trendChart = labels.map((label) => ({ label, ...Object.fromEntries((data?.classes || []).map((item) => [item.name, item.trend.find((point) => point.label === label)?.mean])) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Compare classes</h1>
        <p className="mt-2 max-w-2xl text-brand-500">Pick two to four classes to see them side by side on the same assessment.</p>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          {classes.map((item) => (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${picked.includes(item.id) ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-600 hover:bg-brand-100"}`}
            >
              {item.name}
            </button>
          ))}
        </div>
        {data && data.steps.length > 0 && (
          <select className="input w-auto" value={`${data.term}|${data.exam}`} onChange={(event) => setStep(event.target.value)} aria-label="Assessment">
            {data.steps.map((item) => <option key={item.label} value={`${item.term}|${item.exam}`}>{item.term} {item.exam}</option>)}
          </select>
        )}
      </div>

      {picked.length < 2 && <p className="card text-brand-500">Pick at least two classes.</p>}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {picked.length >= 2 && !data && !error && <Loader />}

      {data && (
        <>
          {!data.same_scale && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              These classes are graded differently: Grade 4 to 9 use marks out of 100, Playgroup to Grade 3 use CBC levels (EE = 4, BE = 1). Compare the levels and the share meeting expectations rather than the raw numbers.
            </p>
          )}
          {!data.label && <p className="card text-brand-500">These classes have no assessment in common yet.</p>}
          {data.label && (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-brand-50 text-xs text-brand-500">
                  <tr>
                    <th className="px-4 py-3 text-left">{data.label}</th>
                    {data.classes.map((item, index) => (
                      <th key={item.classroom_id} className="px-4 py-3 text-right">
                        <span className="font-headline text-xl font-extrabold uppercase" style={{ color: COLORS[index] }}>{item.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-2.5 font-semibold text-brand-600">{row.label}</td>
                      {data.classes.map((item) => <td key={item.classroom_id} className="px-4 py-2.5 text-right">{row.render(item)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {subjectChart.length > 0 && data.same_scale && (
            <div className="card">
              <h2 className="font-semibold text-brand-800">Subject by subject · {data.label}</h2>
              <div className="mt-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectChart} margin={{ left: -15, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis domain={scale === "marks" ? [0, 100] : [0, 4]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend verticalAlign="top" />
                    {data.classes.map((item, index) => <Bar key={item.name} dataKey={item.name} fill={COLORS[index]} radius={[4, 4, 0, 0]} isAnimationActive={false} />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {trendChart.length > 1 && data.same_scale && (
            <div className="card">
              <h2 className="font-semibold text-brand-800">Class mean across the year</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChart} margin={{ left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6ebf5" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend verticalAlign="top" />
                    {data.classes.map((item, index) => <Line key={item.name} dataKey={item.name} stroke={COLORS[index]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls isAnimationActive={false} />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
