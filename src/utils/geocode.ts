import { supabase } from "@/integrations/supabase/client";

export type GeocodeResult =
  | { found: true; lat: number; lng: number; displayName?: string | null }
  | { found: false; reason?: string };

export async function geocodeOttawa(q: string): Promise<GeocodeResult> {
  const query = q.trim();
  if (!query) return { found: false, reason: "empty_query" };

  try {
    const { data, error } = await supabase.functions.invoke("geocode", {
      body: { q: query }, // ✅ object (no stringify)
    });

    console.debug("geocode invoke:", { data, error });

    if (error) {
      console.error("geocode error:", error);
      return { found: false, reason: "invoke_error" };
    }

    let payload: any = data;

    // بعض الـ functions ترجع string JSON
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        console.error("geocode: JSON parse failed", e, payload);
        return { found: false, reason: "bad_json" };
      }
    }

    if (payload?.found === true && Number.isFinite(payload.lat) && Number.isFinite(payload.lng)) {
      return {
        found: true,
        lat: payload.lat,
        lng: payload.lng,
        displayName: payload.displayName ?? null,
      };
    }

    console.warn("geocode: unexpected payload", payload);
    return { found: false, reason: "unexpected_payload" };
  } catch (err) {
    console.error("geocode exception:", err);
    return { found: false, reason: "exception" };
  }
}
