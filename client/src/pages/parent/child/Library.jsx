import { format, isBefore, startOfToday } from "date-fns";
import { useEffect, useState } from "react";
import api from "../../../api/client";
import Loader from "../../../components/Loader";

export default function Library({ student }) {
  const [loans, setLoans] = useState(null);

  useEffect(() => {
    api.get(`/library/student/${student.id}`).then(({ data }) => setLoans(data));
  }, [student.id]);

  if (!loans) return <Loader />;
  if (!loans.length) return <p className="card text-sm text-brand-500">{student.first_name} has not borrowed any books yet.</p>;

  const today = startOfToday();

  return (
    <div className="card p-0">
      <ul className="divide-y divide-brand-50">
        {loans.map((loan) => {
          const overdue = !loan.returned_on && isBefore(new Date(loan.due_on), today);
          return (
            <li key={loan.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <div className="flex-1">
                <p className="font-semibold">{loan.book_title}</p>
                <p className="text-xs text-brand-400">Borrowed {format(new Date(loan.borrowed_on), "d MMM")}</p>
              </div>
              {loan.returned_on ? (
                <span className="badge bg-emerald-100 text-emerald-700">Returned</span>
              ) : (
                <span className={`badge ${overdue ? "bg-red-100 text-red-700" : "bg-brand-50 text-brand-600"}`}>
                  {overdue ? "Overdue, was due" : "Due"} {format(new Date(loan.due_on), "d MMM")}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
