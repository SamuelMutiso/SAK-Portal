import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";

export default function RouteMap({ stops, height = 360 }) {
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
          radius={index === 0 ? 10 : 7}
          pathOptions={{ color: "#1E3A6B", fillColor: index === 0 ? "#DDA22E" : "#ffffff", fillOpacity: 1, weight: 3 }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            {index + 1}. {stop.name}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
