import { format } from "date-fns";
import { useEffect, useState } from "react";
import api, { errorMessage } from "../../api/client";
import Loader from "../../components/Loader";
import SmsPreview from "../../components/SmsPreview";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
};

export default function Leave() {
  const [items, setItems] = useState(null);
  const [sms, setSms] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/leave").then(({ data }) => setItems(data));
  }, []);

  async function decide(id, status) {
    try {
      const { data } = await api.patch(`/leave/${id}`, { status });
      setItems(items.map((item) => (item.id === id ? data.leave : item)));
      setSms(data.sms);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!items) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Boarding leave-out</h1>
        <p className="mt-2 text-brand-500">Requests from parents of boarders. The parent gets an SMS when you decide.</p>
      </div>

      {sms && <SmsPreview sms={sms} onClose={() => setSms(null)} />}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {items.length === 0 && <p className="card text-sm text-brand-500">No leave-out requests yet.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="card">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-lg font-semibold text-brand-800">{item.student_name}</p>
                <p className="text-sm text-brand-500">{item.classroom_name} · requested by {item.parent_name}</p>
              </div>
              <span className={`badge capitalize ${STATUS_STYLES[item.status]}`}>{item.status}</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-brand-400">Leaves</dt><dd className="font-semibold">{format(new Date(item.leave_date), "EEE d MMM")}</dd></div>
              <div><dt className="text-brand-400">Returns</dt><dd className="font-semibold">{format(new Date(item.return_date), "EEE d MMM")}</dd></div>
              <div className="col-span-2"><dt className="text-brand-400">Reason</dt><dd>{item.reason}</dd></div>
              <div className="col-span-2"><dt className="text-brand-400">Picked up by</dt><dd>{item.picked_by}</dd></div>
            </dl>
            {item.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <button className="btn-primary flex-1" onClick={() => decide(item.id, "approved")}>Approve</button>
                <button className="btn-ghost flex-1" onClick={() => decide(item.id, "declined")}>Decline</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
