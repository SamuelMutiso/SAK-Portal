import { formatDistanceToNowStrict } from "date-fns";
import { MapPinned, Navigation, PlayCircle, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api/client";

function path(stops) {
  const points = [...stops].reverse();
  const steps = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const [from, to] = [points[index], points[index + 1]];
    for (let part = 0; part < 6; part += 1) {
      steps.push({ lat: from.lat + ((to.lat - from.lat) * part) / 6, lng: from.lng + ((to.lng - from.lng) * part) / 6 });
    }
  }
  steps.push(points[points.length - 1]);
  return steps;
}

export default function LiveShare({ stops, initiallySharing, practice }) {
  const [mode, setMode] = useState(null);
  const [sentAt, setSentAt] = useState(null);
  const [error, setError] = useState(null);
  const [, tick] = useState(0);
  const watch = useRef(null);
  const timer = useRef(null);
  const wake = useRef(null);
  const last = useRef(0);

  const send = async (lat, lng) => {
    try {
      await api.post("/trips/location", { lat, lng });
      setSentAt(new Date());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const release = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    clearInterval(timer.current);
    wake.current?.release?.().catch(() => {});
    wake.current = null;
  };

  const keepAwake = async () => {
    try {
      wake.current = await navigator.wakeLock?.request("screen");
    } catch {
      wake.current = null;
    }
  };

  const startGps = () => {
    if (!navigator.geolocation) {
      setError("This phone cannot share its location.");
      return;
    }
    release();
    setMode("gps");
    keepAwake();
    watch.current = navigator.geolocation.watchPosition(
      (position) => {
        if (Date.now() - last.current < 8000) return;
        last.current = Date.now();
        send(position.coords.latitude, position.coords.longitude);
      },
      (problem) => {
        setError(problem.code === 1 ? "Location is blocked. Allow location for this site in the phone's settings, then try again." : "Could not get the bus location. Make sure location (GPS) is on.");
        setMode(null);
        release();
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  };

  const startPractice = () => {
    release();
    const steps = path(stops);
    let index = 0;
    setMode("practice");
    send(steps[0].lat, steps[0].lng);
    timer.current = setInterval(() => {
      index += 1;
      if (index >= steps.length) {
        clearInterval(timer.current);
        setMode("done");
        return;
      }
      send(steps[index].lat, steps[index].lng);
    }, 2500);
  };

  const stop = async () => {
    release();
    setMode(null);
    setSentAt(null);
    try {
      await api.post("/trips/location/stop");
    } catch {
      return;
    }
  };

  useEffect(() => {
    const clock = setInterval(() => tick((value) => value + 1), 5000);
    const watching = watch;
    const moving = timer;
    const awake = wake;
    return () => {
      clearInterval(clock);
      if (watching.current !== null) navigator.geolocation.clearWatch(watching.current);
      clearInterval(moving.current);
      awake.current?.release?.().catch(() => {});
    };
  }, []);

  const active = mode === "gps" || mode === "practice";

  return (
    <section className={`card space-y-3 ${active ? "border-emerald-200 bg-emerald-50" : ""}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? "bg-emerald-600 text-white" : "bg-brand-100 text-brand-700"}`}><MapPinned size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-brand-800">{mode === "practice" ? "Practice run: the bus is moving on the map" : active ? "Sharing the bus location" : "Live bus location"}</p>
          <p className="text-sm text-brand-500">
            {active
              ? `Parents and the school can see the bus on the map.${sentAt ? ` Last sent ${formatDistanceToNowStrict(sentAt)} ago.` : ""}`
              : mode === "done" ? "Practice run finished." : initiallySharing ? "The bus was sharing its location a moment ago. Tap Start sharing to carry on." : "Turn this on when you start a run so parents can see where the bus is. Keep this page open."}
          </p>
        </div>
      </div>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {active ? (
          <button type="button" onClick={stop} className="btn w-full bg-red-600 py-3 text-white hover:bg-red-700 sm:w-auto"><Square size={16} /> Stop sharing</button>
        ) : (
          <button type="button" onClick={startGps} className="btn w-full bg-emerald-600 py-3 text-white hover:bg-emerald-700 sm:w-auto"><Navigation size={16} /> Start sharing location</button>
        )}
        {practice && !active && (
          <button type="button" onClick={startPractice} className="btn-ghost w-full py-3 sm:w-auto"><PlayCircle size={16} /> Practice run (demo)</button>
        )}
      </div>
    </section>
  );
}
