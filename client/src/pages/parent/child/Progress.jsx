import { useEffect, useState } from "react";
import api from "../../../api/client";
import Loader from "../../../components/Loader";
import ProgressView from "../../../components/ProgressView";
import StudentInsights from "../../../components/StudentInsights";

export default function Progress({ student }) {
  const [trend, setTrend] = useState(null);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    api.get(`/reports/student/${student.id}/trend`).then(({ data }) => setTrend(data));
    api.get(`/insights/student/${student.id}`).then(({ data }) => setInsights(data));
  }, [student.id]);

  if (!trend || !insights) return <Loader />;
  return (
    <div className="space-y-6">
      <StudentInsights data={insights} />
      <ProgressView trend={trend} name={student.first_name} compact />
    </div>
  );
}
