// supabase/functions/geocode/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const ALLOWED_ORIGINS = new Set([
  "https://ottawaliveparking.ca",
  "https://www.ottawaliveparking.ca",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin");

  const allowedOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://ottawaliveparking.ca";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(req, { error: "Use POST" }, 405);
  }

  try {
    const body = await req.json();
    const query = String(body?.q ?? "").trim();

    if (!query) {
      return json(req, { error: "Missing q" }, 400);
    }

    if (query.length > 120) {
      return json(req, { error: "Query too long" }, 400);
    }

    const params = new URLSearchParams({
      q: `${query}, Ottawa, Ontario, Canada`,
      format: "json",
      addressdetails: "1",
      limit: "1",
    });

    const url = `${NOMINATIM_URL}?${params.toString()}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "OttawaLiveParking/1.0 (contact: admin@ottawaliveparking.ca)",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error("Nominatim geocoding failed:", res.status);

      return json(
        req,
        {
          error: "Geocoding failed",
        },
        502
      );
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return json(req, {
        found: false,
        q: query,
      });
    }

    const item = data[0];

    const lat = Number(item.lat);
    const lng = Number(item.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return json(req, {
        found: false,
        q: query,
      });
    }

    return json(req, {
      found: true,
      q: query,
      lat,
      lng,
      displayName:
        typeof item.display_name === "string"
          ? item.display_name
          : null,
    });
  } catch (error) {
    console.error("Geocode request failed:", error);

    return json(
      req,
      {
        error: "Bad request",
      },
      400
    );
  }
});