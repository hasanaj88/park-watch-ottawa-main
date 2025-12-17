import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export default function ParkingMap() {
  const ottawa = { lat: 45.4215, lng: -75.6972 };

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer
        center={[ottawa.lat, ottawa.lng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[ottawa.lat, ottawa.lng]}>
          <Popup>Ottawa</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
