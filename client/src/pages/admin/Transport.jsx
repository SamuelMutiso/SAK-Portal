import { Bus, Phone, Users } from "lucide-react";
import { useEffect, useState } from "react";
import api from "../../api/client";
import Loader from "../../components/Loader";
import RouteMap from "../../components/RouteMap";

export default function Transport() {
  const [routes, setRoutes] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    api.get("/transport").then(({ data }) => {
      setRoutes(data);
      setSelectedId(data[0]?.id);
    });
  }, []);

  if (!routes) return <Loader />;

  const selected = routes.find((route) => route.id === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Transport</h1>
        <p className="text-brand-500">School bus routes for day scholars around Kitengela.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          {routes.map((route) => (
            <button
              key={route.id}
              onClick={() => setSelectedId(route.id)}
              className={`card w-full text-left ${route.id === selectedId ? "ring-2 ring-gold-500" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Bus size={18} className="text-brand-600" />
                <h3 className="font-semibold text-brand-800">{route.name}</h3>
              </div>
              <div className="mt-3 space-y-1 text-sm text-brand-600">
                <p className="font-mono text-xs">{route.vehicle}</p>
                <p className="flex items-center gap-2"><Phone size={14} /> {route.driver_name} · {route.driver_phone}</p>
                <p className="flex items-center gap-2"><Users size={14} /> {route.student_count} learners</p>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="card lg:col-span-2">
            <RouteMap stops={selected.stops} height={420} />
            <ol className="mt-4 flex flex-wrap gap-2 text-sm">
              {selected.stops.map((stop, index) => (
                <li key={stop.name} className="badge bg-brand-50 text-brand-700">
                  {index + 1}. {stop.name}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
