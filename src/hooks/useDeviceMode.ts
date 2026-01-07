import { useEffect, useState } from "react";

export type DeviceMode = "mobile" | "tablet" | "desktop";

export function useDeviceMode(): DeviceMode {
  const getMode = () => {
    const w = window.innerWidth;
    if (w < 640) return "mobile";     // phones
    if (w < 1024) return "tablet";    // tablets
    return "desktop";                 // laptops / desktops
  };

  const [mode, setMode] = useState<DeviceMode>("desktop");

  useEffect(() => {
    const onResize = () => setMode(getMode());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return mode;
}
