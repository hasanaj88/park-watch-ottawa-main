import { supabase } from "@/integrations/supabase/client";

export async function geocodeOttawa(q: string): Promise<
  | { found: true; lat: number; lng: number; displayName?: string | null }
  | { found: false }
> {
  const { data, error } = await supabase.functions.invoke("geocode", {
    body: { q },
  });

  if (error) {
    console.error("geocode error:", error);
    return { found: false };
  }

  if (data?.found && typeof data.lat === "number" && typeof data.lng === "number") {
    return { found: true, lat: data.lat, lng: data.lng, displayName: data.displayName ?? null };
  }

  return { found: false };
}
