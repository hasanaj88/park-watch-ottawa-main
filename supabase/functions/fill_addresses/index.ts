/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OttawaParkingLot = {
  id?: number;
  lot_id?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  type?: string;
  capacity?: number;
  freeSpaces?: number | string;
  // sometimes there are other fields; we ignore them safely
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeInt(n: unknown, fallback = 0): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.trunc(x);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function computeStatus(capacity: number, free: number): "available" | "busy" | "occupied" {
  if (capacity <= 0) return "busy";
  const occ = capacity - free;
  const rate = occ / capacity;
  if (rate < 0.7) return "available";
  if (rate < 0.95) return "busy";
  return "occupied";
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  // Simple shared-secret protection
  const requiredKey = Deno.env.get("SYNC_KEY") ?? "";
  const providedKey = req.headers.get("x-sync-key") ?? "";
  if (!requiredKey || providedKey !== requiredKey) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Missing Supabase env vars" }, 500);
  }

  try {
    // Timeout for Ottawa fetch
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);

    const upstream = await fetch("https://traffic.ottawa.ca/map/service/parking", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).finally(() => clearTimeout(t));

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      return jsonResponse(
        { error: "Ottawa API failed", status: upstream.status, details: text?.slice?.(0, 200) ?? "" },
        502
      );
    }

    const json = await upstream.json().catch(() => null);
    const ottawaLots: OttawaParkingLot[] = Array.isArray(json?.parking_lots) ? json.parking_lots : [];

    // Transform to your DB shape
    const rows = ottawaLots
      .map((lot) => {
        const capacity = safeInt(lot.capacity, 0);
        const freeSpacesNum =
          typeof lot.freeSpaces === "number" && Number.isFinite(lot.freeSpaces)
            ? safeInt(lot.freeSpaces, 0)
            : null;

        const free = freeSpacesNum !== null && capacity > 0 ? clamp(freeSpacesNum, 0, capacity) : null;
        const occupied = free !== null ? clamp(capacity - free, 0, capacity) : null;

        const lotId = lot.lot_id ?? lot.id; // prefer lot_id if present
        if (lotId === undefined || lotId === null) return null;

        const lat = typeof lot.latitude === "number" && Number.isFinite(lot.latitude) ? lot.latitude : null;
        const lng = typeof lot.longitude === "number" && Number.isFinite(lot.longitude) ? lot.longitude : null;

        const name = (lot.address ?? "").trim();
        if (!name) return null;

        const api_status =
          free !== null ? computeStatus(capacity, free) : null;

        return {
          id: String(lotId),             // matches your DbParkingLot.id (string)
          name,
          capacity: capacity || null,

          api_available: free !== null ? free : null,
          api_occupied: occupied !== null ? occupied : null,
          virtual_occupied: null,        // you can set this later if you simulate
          api_status,

          lat,
          lng,
          // NOTE: we don't set created_at 
        };
      })
      .filter(Boolean) as any[];

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Upsert into parking_lots
    const { error: upsertError } = await supabaseAdmin
      .from("parking_lots")
      .upsert(rows, { onConflict: "id" });

    if (upsertError) {
      return jsonResponse({ error: "DB upsert failed", details: upsertError.message }, 500);
    }

    return jsonResponse({
      ok: true,
      fetched: ottawaLots.length,
      upserted: rows.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "Ottawa API timed out" : (e?.message ?? String(e));
    return jsonResponse({ error: msg }, 500);
  }
});
