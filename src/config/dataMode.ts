// src/config/dataMode.ts
export const DATA_MODE = (import.meta.env.VITE_DATA_MODE ?? "mock") as
  | "mock"
  | "api";

export const USE_API = DATA_MODE === "api";
