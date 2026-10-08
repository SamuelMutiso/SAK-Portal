import { useEffect, useState } from "react";
import api from "../../../api/client";
import Loader from "../../../components/Loader";
import ProgressView from "../../../components/ProgressView";

export default function Progress({ student }) {
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    api.get(`/reports/student/${student.id}/trend`).then(({ data }) => setTrend(data));
  }, [student.id]);

  if (!trend) return <Loader />;
  return <ProgressView trend={trend} name={student.first_name} />;
}
