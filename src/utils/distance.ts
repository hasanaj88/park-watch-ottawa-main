// Haversine formula to calculate distance between two points on Earth
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

// Common Ottawa addresses for quick lookup (in a real app, this would use a geocoding API)
export const OTTAWA_ADDRESSES: Record<string, { lat: number; lng: number }> = {
  "819 dynes rd": { lat: 45.3234, lng: -75.7845 },
  "819 dynes road": { lat: 45.3234, lng: -75.7845 },
  "100 rideau st": { lat: 45.4258, lng: -75.6918 },
  "100 rideau street": { lat: 45.4258, lng: -75.6918 },
  "parliament hill": { lat: 45.4236, lng: -75.7005 },
  "byward market": { lat: 45.4284, lng: -75.6918 },
  "university of ottawa": { lat: 45.4217, lng: -75.6832 },
  "carleton university": { lat: 45.3875, lng: -75.6972 },
  "ottawa hospital": { lat: 45.3834, lng: -75.6478 },
  "lansdowne park": { lat: 45.3948, lng: -75.6821 },
  "td place": { lat: 45.3948, lng: -75.6821 },
  "canadian tire centre": { lat: 45.2967, lng: -75.9267 },
  "rideau centre": { lat: 45.4258, lng: -75.6918 },
  "bayshore shopping centre": { lat: 45.3567, lng: -75.7989 },
  "st laurent shopping centre": { lat: 45.4189, lng: -75.6234 },
  "westboro beach": { lat: 45.3689, lng: -75.7642 },
  "mooney bay beach": { lat: 45.3612, lng: -75.6834 },
  "britannia beach": { lat: 45.3567, lng: -75.7889 },
  "downtown ottawa": { lat: 45.4215, lng: -75.6972 },
  "sparks street": { lat: 45.4214, lng: -75.6981 },
  "elgin street": { lat: 45.4151, lng: -75.6925 },
  "bank street": { lat: 45.4098, lng: -75.6889 },
  "somerset street": { lat: 45.4175, lng: -75.6972 },
  "preston street": { lat: 45.3989, lng: -75.7012 },
  "wellington street": { lat: 45.4012, lng: -75.7234 },
  "kanata": { lat: 45.3234, lng: -75.8967 },
  "orleans": { lat: 45.4656, lng: -75.5234 },
  "nepean": { lat: 45.3289, lng: -75.7734 },
  "gloucester": { lat: 45.4189, lng: -75.6234 },
  "vanier": { lat: 45.4356, lng: -75.6645 },
  "hintonburg": { lat: 45.4012, lng: -75.7234 },
  "westboro": { lat: 45.3689, lng: -75.7642 },
  "glebe": { lat: 45.4009, lng: -75.6890 },
  "sandy hill": { lat: 45.4156, lng: -75.6812 },
  "centretown": { lat: 45.4175, lng: -75.6972 }
};

// Ottawa postal code to coordinates mapping
export const OTTAWA_POSTAL_CODES: Record<string, { lat: number; lng: number; area: string }> = {
  // Downtown/Central
  "k1p": { lat: 45.4215, lng: -75.6972, area: "Downtown Ottawa" },
  "k1n": { lat: 45.4284, lng: -75.6918, area: "ByWard Market" },
  "k1r": { lat: 45.4175, lng: -75.6972, area: "Centretown" },
  "k1s": { lat: 45.4009, lng: -75.6890, area: "The Glebe" },
  "k1g": { lat: 45.4156, lng: -75.6812, area: "Sandy Hill" },
  "k1h": { lat: 45.3948, lng: -75.6821, area: "Lansdowne/Old Ottawa South" },
  
  // East Ottawa
  "k1j": { lat: 45.4189, lng: -75.6234, area: "Gloucester/St. Laurent" },
  "k1k": { lat: 45.4356, lng: -75.6645, area: "Vanier" },
  "k1l": { lat: 45.4656, lng: -75.5234, area: "Orléans" },
  "k4a": { lat: 45.4756, lng: -75.4834, area: "Cumberland/Orléans East" },
  "k1e": { lat: 45.3989, lng: -75.6234, area: "Gloucester South" },
  
  // West Ottawa
  "k1y": { lat: 45.3689, lng: -75.7642, area: "Westboro" },
  "k1z": { lat: 45.4012, lng: -75.7234, area: "Hintonburg" },
  "k2p": { lat: 45.3567, lng: -75.7989, area: "Bayshore/Nepean" },
  "k2h": { lat: 45.3289, lng: -75.7734, area: "Nepean" },
  "k2j": { lat: 45.3234, lng: -75.8967, area: "Kanata" },
  "k2k": { lat: 45.3534, lng: -75.9167, area: "Kanata North" },
  "k2l": { lat: 45.2967, lng: -75.9267, area: "Stittsville/Kanata South" },
  
  // South Ottawa
  "k2g": { lat: 45.3612, lng: -75.6834, area: "Mooney Bay/Hunt Club" },
  "k1v": { lat: 45.3456, lng: -75.7123, area: "South Keys/Greenboro" },
  "k1t": { lat: 45.3289, lng: -75.6567, area: "Hunt Club/Riverside South" },
  "k1w": { lat: 45.2967, lng: -75.7234, area: "Barrhaven" },
  "k4m": { lat: 45.2734, lng: -75.7567, area: "Barrhaven South" },
  
  // North Ottawa  
  "k1a": { lat: 45.4567, lng: -75.7234, area: "Rockcliffe Park" },
  "k1m": { lat: 45.4789, lng: -75.6789, area: "Manor Park/Overbrook" },
  "k4b": { lat: 45.5234, lng: -75.6567, area: "Blackburn Hamlet" }
};

export const parseAddressToCoordinates = (address: string): { lat: number; lng: number } | null => {
  const normalizedAddress = address.toLowerCase().trim();
  
  // Direct lookup first
  if (OTTAWA_ADDRESSES[normalizedAddress]) {
    return OTTAWA_ADDRESSES[normalizedAddress];
  }
  
  // Try partial matches for flexibility
  for (const [key, coords] of Object.entries(OTTAWA_ADDRESSES)) {
    if (key.includes(normalizedAddress) || normalizedAddress.includes(key)) {
      return coords;
    }
  }
  
  return null;
};

export const parsePostalCodeToCoordinates = (postalCode: string): { lat: number; lng: number; area: string } | null => {
  const normalized = postalCode.toLowerCase().replace(/\s/g, '').substring(0, 3);
  
  // Direct lookup for postal code
  if (OTTAWA_POSTAL_CODES[normalized]) {
    return OTTAWA_POSTAL_CODES[normalized];
  }
  
  return null;
};

export const isPostalCode = (input: string): boolean => {
  // Canadian postal code pattern: Letter-Digit-Letter (first 3 characters)  
  const postalCodePattern = /^[a-zA-Z]\d[a-zA-Z]/;
  const normalized = input.replace(/\s/g, '');
  return postalCodePattern.test(normalized) && normalized.length >= 3;
};