import { format } from "date-fns";
import { Bus, Phone, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../api/client";

const TONE = {
  boarded: "bg-sky-100 text-sky-800",
  left: "bg-sky-100 text-sky-800",
  arrived: "bg-emerald-100 text-emerald-800",
  dropped: "bg-brand-100 text-brand-700",
};

export default function BusBoard() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [updated, setUpdated] = useState(null);

  const load = useCallback(() => {
    api.get("/trips/today").then(({ data: result }) => {
      setData(result.routes);
      setUpdated(new Date());
    }).catch(() => setData([]));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  if (!data) return <div className="card h-40 animate-pulse bg-brand-50/60" />;
  if (!data.length) return null;

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-brand-800"><Bus size={18} /> Buses today</h2>
        <button type="button" onClick={load} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-700">
          <RefreshCw size={13} /> Updated {updated ? format(updated, "h:mm a") : ""}
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.map((route) => (
          <div key={route.id} className="rounded-2xl border border-brand-100">
            <button type="button" onClick={() => setOpen(open === route.id ? null : route.id)} className="w-full p-4 text-left" aria-expanded={open === route.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-brand-800">{route.name}</p>
                  <p className="flex items-center gap-1 text-xs text-brand-400"><Phone size={12} /> {route.driver_name} · {route.driver_phone} · {route.vehicle}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-brand-500">{open === route.id ? "Hide" : "See learners"}</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {[["Waiting", route.counts.waiting, "text-brand-500"], ["On bus", route.counts.on_bus, "text-sky-700"], ["At school", route.counts.at_school, "text-emerald-700"], ["Home", route.counts.home, "text-brand-700"]].map(([label, value, tone]) => (
                  <div key={label} className="rounded-xl bg-brand-50 py-2">
                    <p className={`font-mono text-lg font-semibold ${tone}`}>{value}</p>
                    <p className="text-[11px] text-brand-400">{label}</p>
                  </div>
                ))}
              </div>
            </button>
            {open === route.id && (
              <ul className="max-h-80 divide-y divide-brand-50 overflow-y-auto border-t border-brand-100">
                {route.learners.map((learner) => (
                  <li key={learner.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-brand-800">{learner.full_name}</p>
                      <p className="truncate text-xs text-brand-400">{learner.classroom_name}{learner.stop ? ` · ${learner.stop}` : ""}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${learner.status ? TONE[learner.status] : "bg-brand-50 text-brand-400"}`}>
                      {learner.label}{learner.at ? ` ${format(new Date(`${learner.at}Z`), "h:mm a")}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
