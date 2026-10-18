import L from "leaflet";
import { ArrowDown, ArrowUp, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import api, { errorMessage } from "../api/client";

const pin = (label, active) =>
  L.divIcon({
    className: "",
    html: `<div class="grid h-8 w-8 place-items-center rounded-full border-2 border-white text-xs font-bold shadow-lg ${active ? "bg-gold-500 text-brand-900 ring-4 ring-gold-400/50" : "bg-brand-800 text-white"}">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

function ClickToPlace({ onPlace }) {
  useMapEvents({ click: (event) => onPlace(event.latlng) });
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [map, target]);
  return null;
}

export default function StopEditor({ route, onSaved, onCancel }) {
  const [stops, setStops] = useState(() => route.stops.map((stop) => ({ ...stop, was: stop.name })));
  const [selected, setSelected] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [target, setTarget] = useState(null);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  const change = (index, values) => setStops((items) => items.map((item, position) => (position === index ? { ...item, ...values } : item)));

  const place = (latlng) => change(selected, { lat: +latlng.lat.toFixed(6), lng: +latlng.lng.toFixed(6) });

  async function search(event) {
    event.preventDefault();
    if (query.trim().length < 3) return;
    setSearching(true);
    setNotice(null);
    try {
      const { data } = await api.get("/transport/places", { params: { q: query.trim() } });
      setResults(data);
    } catch (err) {
      setResults(null);
      setNotice({ type: "error", text: errorMessage(err) });
    } finally {
      setSearching(false);
    }
  }

  function choose(result) {
    change(selected, { lat: result.lat, lng: result.lng, ...(stops[selected].name.trim() ? {} : { name: result.name }) });
    setTarget({ lat: result.lat, lng: result.lng });
    setResults(null);
    setQuery("");
  }

  function add() {
    const last = stops[stops.length - 1];
    setStops([...stops, { name: "", lat: last.lat, lng: last.lng }]);
    setSelected(stops.length);
    setTarget({ lat: last.lat, lng: last.lng });
  }

  function move(index, step) {
    const next = [...stops];
    [next[index], next[index + step]] = [next[index + step], next[index]];
    setStops(next);
    setSelected(index + step);
  }

  function remove(index) {
    setStops(stops.filter((_, position) => position !== index));
    setSelected(Math.max(0, Math.min(selected, stops.length - 2)));
  }

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const { data } = await api.patch(`/transport/${route.id}`, { stops: stops.map((stop) => ({ ...stop, name: stop.name.trim() })) });
      onSaved(data);
    } catch (err) {
      setNotice({ type: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  const current = stops[selected];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-brand-800">Edit stops for {route.name}</h2>
        <p className="text-sm text-brand-500">Pick a stop below, then search for the place or tap the map where the bus really stops. Drag the gold pin to fine-tune it.</p>
      </div>

      <form onSubmit={search} className="flex gap-2">
        <label htmlFor="place-search" className="sr-only">Search for a place</label>
        <input id="place-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search a place for ${current?.name || "this stop"}, e.g. Milimani Kitengela`} className="input" />
        <button type="submit" disabled={searching || query.trim().length < 3} className="btn-primary shrink-0 px-4">
          <Search size={16} /> <span className="hidden sm:inline">{searching ? "Searching…" : "Search"}</span>
        </button>
      </form>

      {results && (
        <div className="rounded-2xl border border-brand-100 bg-white">
          {results.length === 0 ? (
            <p className="p-3 text-sm text-brand-500">Nothing found near Kitengela. Try another name, or tap the map instead.</p>
          ) : (
            results.map((result) => (
              <button key={`${result.lat},${result.lng}`} type="button" onClick={() => choose(result)} className="flex w-full items-start gap-2 border-b border-brand-50 p-3 text-left last:border-0 hover:bg-brand-50">
                <MapPin size={16} className="mt-0.5 shrink-0 text-brand-500" />
                <span>
                  <span className="block text-sm font-semibold text-brand-800">{result.name}</span>
                  <span className="block text-xs text-brand-500">{result.area}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <MapContainer bounds={route.stops.map((stop) => [stop.lat, stop.lng])} boundsOptions={{ padding: [30, 30] }} style={{ height: 420 }} scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToPlace onPlace={place} />
        <FlyTo target={target} />
        <Polyline positions={stops.map((stop) => [stop.lat, stop.lng])} pathOptions={{ color: "#1E3A6B", weight: 3, dashArray: "8 6" }} />
        {stops.map((stop, index) => (
          <Marker
            key={index}
            position={[stop.lat, stop.lng]}
            icon={pin(index === 0 ? "S" : index + 1, index === selected)}
            draggable={index === selected}
            zIndexOffset={index === selected ? 1000 : 0}
            eventHandlers={{ click: () => setSelected(index), dragend: (event) => place(event.target.getLatLng()) }}
          >
            <Tooltip direction="top" offset={[0, -14]}>{stop.name || "New stop"}</Tooltip>
          </Marker>
        ))}
      </MapContainer>

      <ol className="space-y-2">
        {stops.map((stop, index) => (
          <li key={index} className={`flex items-center gap-2 rounded-2xl border p-2 ${index === selected ? "border-gold-500 bg-gold-100/40" : "border-brand-100 bg-white"}`}>
            <button type="button" onClick={() => { setSelected(index); setTarget({ lat: stop.lat, lng: stop.lng }); }} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${index === selected ? "bg-gold-500 text-brand-900" : "bg-brand-800 text-white"}`} aria-label={`Select ${stop.name || "new stop"} on the map`}>
              {index === 0 ? "S" : index + 1}
            </button>
            <label htmlFor={`stop-${index}`} className="sr-only">{index === 0 ? "School name" : `Stop ${index + 1} name`}</label>
            <input id={`stop-${index}`} value={stop.name} onFocus={() => setSelected(index)} onChange={(event) => change(index, { name: event.target.value })} placeholder="Stop name" maxLength={60} className="input min-w-0 flex-1" />
            {index > 0 && (
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 1} className="btn-ghost h-9 w-9 p-0" aria-label="Move up"><ArrowUp size={16} /></button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === stops.length - 1} className="btn-ghost h-9 w-9 p-0" aria-label="Move down"><ArrowDown size={16} /></button>
                <button type="button" onClick={() => remove(index)} disabled={stops.length <= 2} className="btn-ghost h-9 w-9 p-0 text-red-600" aria-label="Remove stop"><Trash2 size={16} /></button>
              </div>
            )}
          </li>
        ))}
      </ol>

      <button type="button" onClick={add} disabled={stops.length >= 30} className="btn-ghost w-full"><Plus size={16} /> Add a stop</button>

      {notice && <p className={`rounded-xl px-3 py-2 text-sm ${notice.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`} role="status">{notice.text}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? "Saving…" : "Save stops"}</button>
        <button type="button" onClick={onCancel} disabled={saving} className="btn-ghost">Cancel</button>
      </div>
    </div>
  );
}
