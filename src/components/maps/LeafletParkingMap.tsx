import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { ParkingLot } from "@/types/parking";

type Props = {
  lots: ParkingLot[];
  selectedLotId: string;
  onLotSelect: (lotId: string) => void;
};

export default function LeafletParkingMap({ lots, selectedLotId, onLotSelect }: Props) {
  const ottawa: [number, number] = [45.4215, -75.6972];

  return (
    <div style={{ height: "52vh", width: "100%", borderRadius: 16, overflow: "hidden" }}>
      <MapContainer center={ottawa} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {lots.map((lot) => {
          // إذا عندك lot.lat / lot.lng استخدمهم. إذا ما موجودين، نخليها كلها Ottawa مؤقتًا.
          const lat = (lot as any).lat ?? ottawa[0];
          const lng = (lot as any).lng ?? ottawa[1];
          const pos: [number, number] = [lat, lng];

          return (
            <Marker key={lot.id} position={pos}>
              <Popup>
                <div style={{ fontWeight: 600 }}>{lot.name}</div>
                <div>ID: {lot.id}</div>
                <button
                  style={{ marginTop: 8, textDecoration: "underline" }}
                  onClick={() => onLotSelect(lot.id)}
                >
                  Select
                </button>
                {lot.id === selectedLotId ? <div style={{ marginTop: 6 }}>Selected ✅</div> : null}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
