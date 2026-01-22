const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function mustEnv(name: string, value?: string) {
  if (!value) throw new Error(`Missing env: ${name}. Check your .env and restart npm run dev.`);
  return value;
}

const baseUrl = mustEnv("VITE_SUPABASE_URL", supabaseUrl).replace(/\/$/, "") + "/rest/v1";
const anonKey = mustEnv("VITE_SUPABASE_ANON_KEY", supabaseAnonKey);

if (import.meta.env.DEV) {
  console.log("[Supabase REST] baseUrl =", baseUrl);
}

export class SupabaseRestError extends Error {
  status: number;
  url: string;
  bodyText?: string;

  constructor(status: number, url: string, bodyText?: string) {
    super(`REST status ${status} ${url}${bodyText ? `\n${bodyText}` : ""}`);
    this.name = "SupabaseRestError";
    this.status = status;
    this.url = url;
    this.bodyText = bodyText;
  }
}

type EqFilters = Record<string, string | number | boolean | null | undefined>;

async function getJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10000);

  const url = baseUrl + path;

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Supabase REST] ERROR", res.status, url, text);
      throw new SupabaseRestError(res.status, url, text);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

async function from<T>(
  tableOrView: string,
  opts?: {
    select?: string; // default "*"
    eq?: EqFilters;
    limit?: number;
    order?: { column: string; ascending?: boolean };
  }
): Promise<T> {
  const select = opts?.select ?? "*";

  const qs = new URLSearchParams();
  qs.set("select", select);

  if (opts?.eq) {
    for (const [k, v] of Object.entries(opts.eq)) {
      if (v === undefined || v === null) continue;
      qs.set(k, `eq.${String(v)}`);
    }
  }

  if (typeof opts?.limit === "number") {
    qs.set("limit", String(opts.limit));
  }

  if (opts?.order?.column) {
    const dir = opts.order.ascending === false ? "desc" : "asc";
    qs.set("order", `${opts.order.column}.${dir}`);
  }

  const path = `/${encodeURIComponent(tableOrView)}?${qs.toString()}`;
  return getJson<T>(path);
}

export const supabaseRest = { getJson, from };

