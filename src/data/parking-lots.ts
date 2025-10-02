import { ParkingLot } from '@/types/parking';

export const INITIAL_PARKING_LOTS: ParkingLot[] = [
  {
    id: "byward-market-garage",
    name: "ByWard Market Garage",
    capacity: 245,
    occupied: 198,
    status: 'busy',
    confidence: 0.82,
    address: "55 ByWard Market Square, Ottawa, ON K1N 7A2",
    coordinates: { lat: 45.4284, lng: -75.6918 },
    pricing: {
      rate: "$3/h",
      maxStay: "2h",
      openUntil: "21:00"
    },
    amenities: ["Covered", "24/7 Access", "Security Cameras"],
    lastUpdated: new Date()
  },
  {
    id: "dalhousie-lot",
    name: "Dalhousie Lot",
    capacity: 120,
    occupied: 72,
    status: 'available',
    confidence: 0.91,
    address: "200 Dalhousie St, Ottawa, ON K1N 7C8",
    coordinates: { lat: 45.4251, lng: -75.6897 },
    pricing: {
      rate: "$2.50/h",
      maxStay: "3h",
      openUntil: "22:00"
    },
    amenities: ["Surface Parking", "Well Lit"],
    lastUpdated: new Date()
  },
  {
    id: "glebe-parking-structure",
    name: "Glebe Parking Structure",
    capacity: 300,
    occupied: 284,
    status: 'busy',
    confidence: 0.77,
    address: "175 Third Ave, Ottawa, ON K1S 2K2",
    coordinates: { lat: 45.4009, lng: -75.6890 },
    pricing: {
      rate: "$3.50/h",
      maxStay: "4h",
      openUntil: "23:00"
    },
    amenities: ["Multi-level", "Electric Charging", "Covered"],
    lastUpdated: new Date()
  },
  {
    id: "centretown-surface-lot",
    name: "Centretown Surface Lot",
    capacity: 80,
    occupied: 36,
    status: 'available',
    confidence: 0.88,
    address: "345 Somerset St W, Ottawa, ON K2P 0J8",
    coordinates: { lat: 45.4175, lng: -75.6972 },
    pricing: {
      rate: "$2/h",
      maxStay: "2h",
      openUntil: "20:00"
    },
    amenities: ["Surface Parking", "Near Transit"],
    lastUpdated: new Date()
  },
  {
    id: "ottawa-city-hall-parking",
    name: "Ottawa City Hall Parking",
    capacity: 180,
    occupied: 145,
    status: 'busy',
    confidence: 0.85,
    address: "110 Laurier Ave W, Ottawa, ON K1P 1J1",
    coordinates: { lat: 45.4215, lng: -75.6972 },
    pricing: {
      rate: "$3/h",
      maxStay: "8h",
      openUntil: "18:00"
    },
    amenities: ["Government Building", "Security", "Weekday Only"],
    lastUpdated: new Date()
  },
  {
    id: "rideau-centre-parking",
    name: "Rideau Centre Parking",
    capacity: 450,
    occupied: 378,
    status: 'busy',
    confidence: 0.79,
    address: "50 Rideau St, Ottawa, ON K1N 9J7",
    coordinates: { lat: 45.4258, lng: -75.6918 },
    pricing: {
      rate: "$4/h",
      maxStay: "6h",
      openUntil: "22:00"
    },
    amenities: ["Shopping Mall", "Covered", "Validation Available"],
    lastUpdated: new Date()
  }
];

// Comprehensive Ottawa parking locations
export const EXTENDED_PARKING_LOTS: ParkingLot[] = [
  ...INITIAL_PARKING_LOTS,
  
  // Downtown & Central Areas
  {
    id: "lansdowne-park-lot",
    name: "Lansdowne Park Parking",
    capacity: 200,
    occupied: 155,
    status: 'busy',
    confidence: 0.83,
    address: "1015 Bank St, Ottawa, ON K1S 3W7",
    coordinates: { lat: 45.3948, lng: -75.6821 },
    pricing: {
      rate: "$3/h",
      maxStay: "Event Based",
      openUntil: "23:00"
    },
    amenities: ["Event Parking", "Large Capacity", "Food Nearby"],
    lastUpdated: new Date()
  },
  {
    id: "sparks-street-garage",
    name: "Sparks Street Parking Garage",
    capacity: 320,
    occupied: 245,
    status: 'busy',
    confidence: 0.81,
    address: "150 Sparks St, Ottawa, ON K1P 5B7",
    coordinates: { lat: 45.4214, lng: -75.6981 },
    pricing: {
      rate: "$4/h",
      maxStay: "3h",
      openUntil: "20:00"
    },
    amenities: ["Downtown Core", "Shopping District", "Covered"],
    lastUpdated: new Date()
  },
  {
    id: "elgin-street-lot",
    name: "Elgin Street Parking",
    capacity: 95,
    occupied: 42,
    status: 'available',
    confidence: 0.89,
    address: "315 Elgin St, Ottawa, ON K2P 1M3",
    coordinates: { lat: 45.4151, lng: -75.6925 },
    pricing: {
      rate: "$3.50/h",
      maxStay: "2h",
      openUntil: "19:00"
    },
    amenities: ["Restaurant District", "Evening Entertainment", "Metered"],
    lastUpdated: new Date()
  },
  {
    id: "bank-street-central",
    name: "Bank Street Central Lot",
    capacity: 140,
    occupied: 98,
    status: 'available',
    confidence: 0.85,
    address: "456 Bank St, Ottawa, ON K2P 1Z1",
    coordinates: { lat: 45.4098, lng: -75.6889 },
    pricing: {
      rate: "$2.75/h",
      maxStay: "4h",
      openUntil: "21:00"
    },
    amenities: ["Shopping Area", "Transit Access", "Well Lit"],
    lastUpdated: new Date()
  },

  // Universities & Colleges
  {
    id: "carleton-university-lot",
    name: "Carleton University Visitor Parking",
    capacity: 150,
    occupied: 89,
    status: 'available',
    confidence: 0.92,
    address: "1125 Colonel By Dr, Ottawa, ON K1S 5B6",
    coordinates: { lat: 45.3875, lng: -75.6972 },
    pricing: {
      rate: "$2/h",
      maxStay: "4h",
      openUntil: "24:00"
    },
    amenities: ["University", "Student Discounts", "24/7 Access"],
    lastUpdated: new Date()
  },
  {
    id: "university-ottawa-lot",
    name: "University of Ottawa Parking",
    capacity: 280,
    occupied: 195,
    status: 'available',
    confidence: 0.87,
    address: "75 Laurier Ave E, Ottawa, ON K1N 6N5",
    coordinates: { lat: 45.4217, lng: -75.6832 },
    pricing: {
      rate: "$3/h",
      maxStay: "8h",
      openUntil: "22:00"
    },
    amenities: ["University Campus", "Student Services", "Multiple Levels"],
    lastUpdated: new Date()
  },
  {
    id: "algonquin-college-lot",
    name: "Algonquin College Woodroffe Parking",
    capacity: 350,
    occupied: 201,
    status: 'available',
    confidence: 0.91,
    address: "1385 Woodroffe Ave, Ottawa, ON K2G 1V8",
    coordinates: { lat: 45.3489, lng: -75.7536 },
    pricing: {
      rate: "$1.50/h",
      maxStay: "6h",
      openUntil: "23:00"
    },
    amenities: ["College Campus", "Affordable Rates", "Large Capacity"],
    lastUpdated: new Date()
  },

  // Government & Tourist Areas
  {
    id: "parliament-hill-parking",
    name: "Parliament Hill Visitor Parking",
    capacity: 100,
    occupied: 92,
    status: 'busy',
    confidence: 0.88,
    address: "111 Wellington St, Ottawa, ON K1A 0A6",
    coordinates: { lat: 45.4236, lng: -75.7005 },
    pricing: {
      rate: "$5/h",
      maxStay: "2h",
      openUntil: "17:00"
    },
    amenities: ["Tourist Attraction", "Security Screening", "Limited Hours"],
    lastUpdated: new Date()
  },
  {
    id: "national-gallery-lot",
    name: "National Gallery Parking",
    capacity: 85,
    occupied: 31,
    status: 'available',
    confidence: 0.93,
    address: "380 Sussex Dr, Ottawa, ON K1N 9N4",
    coordinates: { lat: 45.4289, lng: -75.6998 },
    pricing: {
      rate: "$3/h",
      maxStay: "4h",
      openUntil: "18:00"
    },
    amenities: ["Museum", "Cultural District", "Wheelchair Access"],
    lastUpdated: new Date()
  },
  {
    id: "canadian-war-museum-lot",
    name: "Canadian War Museum Parking",
    capacity: 120,
    occupied: 67,
    status: 'available',
    confidence: 0.86,
    address: "1 Vimy Pl, Ottawa, ON K1A 0M8",
    coordinates: { lat: 45.4167, lng: -75.7178 },
    pricing: {
      rate: "$2.50/h",
      maxStay: "5h",
      openUntil: "17:00"
    },
    amenities: ["Museum", "Free Weekends", "Historic Area"],
    lastUpdated: new Date()
  },

  // Shopping Centers
  {
    id: "bayshore-shopping-centre",
    name: "Bayshore Shopping Centre",
    capacity: 800,
    occupied: 456,
    status: 'available',
    confidence: 0.84,
    address: "100 Bayshore Dr, Ottawa, ON K2B 8C1",
    coordinates: { lat: 45.3567, lng: -75.7989 },
    pricing: {
      rate: "Free 3h",
      maxStay: "8h",
      openUntil: "22:00"
    },
    amenities: ["Shopping Mall", "Free Parking", "Large Capacity", "Food Court"],
    lastUpdated: new Date()
  },
  {
    id: "st-laurent-centre",
    name: "St. Laurent Shopping Centre",
    capacity: 650,
    occupied: 387,
    status: 'available',
    confidence: 0.82,
    address: "1200 St Laurent Blvd, Ottawa, ON K1K 3B8",
    coordinates: { lat: 45.4189, lng: -75.6234 },
    pricing: {
      rate: "Free 4h",
      maxStay: "6h",
      openUntil: "21:00"
    },
    amenities: ["Shopping Mall", "Free Parking", "Transit Hub"],
    lastUpdated: new Date()
  },
  {
    id: "place-dorleans",
    name: "Place d'Orléans Shopping Centre",
    capacity: 750,
    occupied: 298,
    status: 'available',
    confidence: 0.89,
    address: "110 Place d'Orléans Dr, Orleans, ON K1C 2L9",
    coordinates: { lat: 45.4656, lng: -75.5234 },
    pricing: {
      rate: "Free",
      maxStay: "No Limit",
      openUntil: "22:00"
    },
    amenities: ["Shopping Mall", "Free Parking", "Orleans Area", "Large Capacity"],
    lastUpdated: new Date()
  },

  // Hospitals & Medical
  {
    id: "ottawa-hospital-general",
    name: "Ottawa Hospital General Campus",
    capacity: 420,
    occupied: 356,
    status: 'busy',
    confidence: 0.78,
    address: "501 Smyth Rd, Ottawa, ON K1H 8L6",
    coordinates: { lat: 45.3834, lng: -75.6478 },
    pricing: {
      rate: "$2/h",
      maxStay: "24h",
      openUntil: "24:00"
    },
    amenities: ["Hospital", "24/7 Access", "Validation Available", "Emergency"],
    lastUpdated: new Date()
  },
  {
    id: "ottawa-hospital-civic",
    name: "Ottawa Hospital Civic Campus",
    capacity: 380,
    occupied: 298,
    status: 'busy',
    confidence: 0.81,
    address: "1053 Carling Ave, Ottawa, ON K1Y 4E9",
    coordinates: { lat: 45.3967, lng: -75.7234 },
    pricing: {
      rate: "$2/h",
      maxStay: "24h",
      openUntil: "24:00"
    },
    amenities: ["Hospital", "24/7 Access", "Patient Discounts"],
    lastUpdated: new Date()
  },
  {
    id: "queensway-carleton-hospital",
    name: "Queensway Carleton Hospital",
    capacity: 200,
    occupied: 134,
    status: 'available',
    confidence: 0.85,
    address: "3045 Baseline Rd, Nepean, ON K2H 8P4",
    coordinates: { lat: 45.3289, lng: -75.7734 },
    pricing: {
      rate: "$1.50/h",
      maxStay: "12h",
      openUntil: "24:00"
    },
    amenities: ["Hospital", "West End", "24/7 Access"],
    lastUpdated: new Date()
  },

  // Transit Stations
  {
    id: "tunney-pasture-station",
    name: "Tunney's Pasture Station P&R",
    capacity: 450,
    occupied: 278,
    status: 'available',
    confidence: 0.87,
    address: "875 Scott St, Ottawa, ON K1Y 4M5",
    coordinates: { lat: 45.4012, lng: -75.7345 },
    pricing: {
      rate: "Free",
      maxStay: "24h",
      openUntil: "24:00"
    },
    amenities: ["Transit Hub", "Free P&R", "LRT Connection", "Secure"],
    lastUpdated: new Date()
  },
  {
    id: "blair-station-pr",
    name: "Blair Station Park & Ride",
    capacity: 600,
    occupied: 234,
    status: 'available',
    confidence: 0.91,
    address: "1595 Ogilvie Rd, Ottawa, ON K1J 9L8",
    coordinates: { lat: 45.4567, lng: -75.5689 },
    pricing: {
      rate: "Free",
      maxStay: "24h",
      openUntil: "24:00"
    },
    amenities: ["Transit Hub", "Free P&R", "Large Capacity", "East End"],
    lastUpdated: new Date()
  },

  // Recreation & Beaches
  {
    id: "westboro-beach-lot",
    name: "Westboro Beach Parking",
    capacity: 75,
    occupied: 23,
    status: 'available',
    confidence: 0.94,
    address: "270 Keefer St, Ottawa, ON K1Y 4L9",
    coordinates: { lat: 45.3689, lng: -75.7642 },
    pricing: {
      rate: "Free",
      maxStay: "4h",
      openUntil: "22:00"
    },
    amenities: ["Beach Access", "Free Parking", "Scenic Location"],
    lastUpdated: new Date()
  },
  {
    id: "mooney-bay-beach",
    name: "Mooney's Bay Beach Parking",
    capacity: 120,
    occupied: 45,
    status: 'available',
    confidence: 0.92,
    address: "2960 Riverside Dr, Ottawa, ON K1V 8N4",
    coordinates: { lat: 45.3612, lng: -75.6834 },
    pricing: {
      rate: "Free",
      maxStay: "6h",
      openUntil: "21:00"
    },
    amenities: ["Beach Access", "Free Parking", "Volleyball Courts", "Picnic Area"],
    lastUpdated: new Date()
  },
  {
    id: "britannia-beach-lot",
    name: "Britannia Beach Parking",
    capacity: 180,
    occupied: 67,
    status: 'available',
    confidence: 0.88,
    address: "2805 Carling Ave, Ottawa, ON K2B 7H7",
    coordinates: { lat: 45.3567, lng: -75.7889 },
    pricing: {
      rate: "Free",
      maxStay: "8h",
      openUntil: "22:00"
    },
    amenities: ["Beach Access", "Free Parking", "Yacht Club", "Restaurant"],
    lastUpdated: new Date()
  },

  // Neighborhoods
  {
    id: "little-italy-lot",
    name: "Little Italy Preston Street",
    capacity: 65,
    occupied: 34,
    status: 'available',
    confidence: 0.86,
    address: "725 Preston St, Ottawa, ON K1S 4A2",
    coordinates: { lat: 45.3989, lng: -75.7012 },
    pricing: {
      rate: "$1.50/h",
      maxStay: "3h",
      openUntil: "23:00"
    },
    amenities: ["Restaurant District", "Italian Cuisine", "Evening Dining"],
    lastUpdated: new Date()
  },
  {
    id: "chinatown-lot",
    name: "Chinatown Somerset Parking",
    capacity: 55,
    occupied: 41,
    status: 'busy',
    confidence: 0.83,
    address: "665 Somerset St W, Ottawa, ON K1R 5K3",
    coordinates: { lat: 45.4156, lng: -75.7098 },
    pricing: {
      rate: "$2/h",
      maxStay: "2h",
      openUntil: "20:00"
    },
    amenities: ["Cultural District", "Asian Restaurants", "Shopping"],
    lastUpdated: new Date()
  },
  {
    id: "hintonburg-lot",
    name: "Hintonburg Wellington West",
    capacity: 85,
    occupied: 52,
    status: 'available',
    confidence: 0.89,
    address: "1145 Wellington St W, Ottawa, ON K1Y 2Y3",
    coordinates: { lat: 45.4012, lng: -75.7234 },
    pricing: {
      rate: "$1/h",
      maxStay: "4h",
      openUntil: "19:00"
    },
    amenities: ["Trendy Neighborhood", "Local Shops", "Cafes"],
    lastUpdated: new Date()
  },

  // Business Districts
  {
    id: "kanata-tech-park",
    name: "Kanata Technology Park",
    capacity: 300,
    occupied: 178,
    status: 'available',
    confidence: 0.85,
    address: "451 Legget Dr, Kanata, ON K2K 3G5",
    coordinates: { lat: 45.3234, lng: -75.8967 },
    pricing: {
      rate: "Free",
      maxStay: "8h",
      openUntil: "18:00"
    },
    amenities: ["Tech Companies", "Free Parking", "Business District"],
    lastUpdated: new Date()
  },
  {
    id: "south-keys-shopping",
    name: "South Keys Shopping Centre",
    capacity: 420,
    occupied: 198,
    status: 'available',
    confidence: 0.87,
    address: "2214 Bank St, Ottawa, ON K1V 1J4",
    coordinates: { lat: 45.3678, lng: -75.6512 },
    pricing: {
      rate: "Free 3h",
      maxStay: "5h",
      openUntil: "21:00"
    },
    amenities: ["Shopping Centre", "Free Parking", "Transit Access", "South End"],
    lastUpdated: new Date()
  }
];