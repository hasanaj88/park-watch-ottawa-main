// src/config/dataMode.ts

export type DataMode = "mock" | "api";

// Default behavior:
// - Production: api
// - Development: mock
const DEFAULT_MODE: DataMode = import.meta.env.PROD ? "api" : "mock";

export const DATA_MODE = (import.meta.env.VITE_DATA_MODE ?? DEFAULT_MODE) as DataMode;

export const USE_API = DATA_MODE === "api";
