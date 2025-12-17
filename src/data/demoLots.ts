export type ParkingLot = {
  id: string;
  name: string;
  address: string;
  capacity: number;
  occupied: number;
  status: "available" | "busy";
  confidence: number;
};

export const DEMO_LOTS: ParkingLot[] = [
  { id: "p1", name: "City Hall Garage", address: "110 Laurier Ave W", capacity: 420, occupied: 310, status: "available", confidence: 0.86 },
  { id: "p2", name: "Rideau Centre", address: "50 Rideau St", capacity: 900, occupied: 880, status: "busy", confidence: 0.74 },
  { id: "p3", name: "ByWard Market", address: "55 ByWard Market Sq", capacity: 160, occupied: 90, status: "available", confidence: 0.68 },
  { id: "p4", name: "Ottawa U - Lees", address: "200 Lees Ave", capacity: 260, occupied: 245, status: "busy", confidence: 0.81 }
];
