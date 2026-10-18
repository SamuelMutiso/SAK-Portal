import { formatDistanceToNowStrict } from "date-fns";
import { Radio } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../api/client";
import RouteMap from "./RouteMap";

export default function LiveBusMap({ routeId, stops, highlight = null, height = 300 }) {
  const [live, setLive] = useState(null);

  const load = useCallback(() => {
    if (document.hidden) return;
    api.get(`/trips/live/${routeId}`).then(({ data }) => setLive(data)).catch(() => setLive(null));
  }, [routeId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [load]);

  const bus = live?.live ? { lat: live.lat, lng: live.lng } : null;

  return (
    <div className="space-y-3">
      {live?.live ? (
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          <p className="flex items-center gap-2 font-semibold">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" /></span>
            Bus is live · updated {formatDistanceToNowStrict(new Date(`${live.at}Z`))} ago
          </p>
          {live.eta.map((item) => (
            <p key={item.student_id} className="mt-0.5">About {item.km} km from {item.to === "school" ? "school" : item.to} with {item.first_name} · roughly {item.minutes} min</p>
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-500"><Radio size={15} /> The bus location shows here while the driver is on a run.</p>
      )}
      <RouteMap stops={live?.stops?.length ? live.stops : stops} highlight={highlight} bus={bus} height={height} />
    </div>
  );
}
