import L from "leaflet";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";

const busIcon = L.divIcon({ className: "", html: '<div class="bus-pin" aria-label="School bus">🚌</div>', iconSize: [40, 40], iconAnchor: [20, 20] });

export default function RouteMap({ stops, height = 360, highlight = null, bus = null }) {
  if (!stops?.length) {
    return <p className="text-sm text-brand-400">No stops added for this route yet.</p>;
  }

  const positions = stops.map((stop) => [stop.lat, stop.lng]);

  return (
    <MapContainer key={positions.join()} bounds={positions} boundsOptions={{ padding: [30, 30] }} style={{ height }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={positions} pathOptions={{ color: "#1E3A6B", weight: 4, dashArray: "8 6" }} />
      {stops.map((stop, index) => (
        <CircleMarker
          key={stop.name}
          center={[stop.lat, stop.lng]}
          radius={index === 0 || stop.name === highlight ? 10 : 7}
          pathOptions={{ color: "#1E3A6B", fillColor: index === 0 ? "#DDA22E" : stop.name === highlight ? "#059669" : "#ffffff", fillOpacity: 1, weight: 3 }}
        >
          <Tooltip direction="top" offset={[0, -8]} permanent={stop.name === highlight}>
            {index === 0 ? "School" : stop.name === highlight ? `Your stop: ${stop.name}` : `${index + 1}. ${stop.name}`}
          </Tooltip>
        </CircleMarker>
      ))}
      {bus && <Marker position={[bus.lat, bus.lng]} icon={busIcon} zIndexOffset={1000} keyboard={false} />}
    </MapContainer>
  );
}
