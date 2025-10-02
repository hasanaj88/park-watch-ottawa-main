import { ParkingLot } from '@/types/parking';

export const openGoogleMapsNavigation = (lot: ParkingLot) => {
  const { lat, lng } = lot.coordinates;
  const destination = encodeURIComponent(lot.address);
  
  // Check if user is on mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  let url: string;
  
  if (isMobile) {
    // For mobile devices, use the Google Maps mobile app URL scheme
    url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${destination}&travelmode=driving`;
  } else {
    // For desktop, use the web version
    url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${destination}`;
  }
  
  // Open in new tab/window
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const getDirectionsUrl = (lot: ParkingLot): string => {
  const { lat, lng } = lot.coordinates;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
};

export const formatCoordinates = (lat: number, lng: number): string => {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};