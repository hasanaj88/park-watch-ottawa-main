const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined;

function mustEnv(name: string, value?: string): string {
  if (!value) {
    throw new Error(
      `Missing env: ${name}. Check your .env file or Vercel Environment Variables.`
    );
  }

  return value;
}

const baseUrl =
  mustEnv("VITE_SUPABASE_URL", supabaseUrl).replace(/\/$/, "") + "/rest/v1";

const anonKey = mustEnv("VITE_SUPABASE_ANON_KEY", supabaseAnonKey);

if (import.meta.env.DEV) {
  console.log("[Supabase REST] baseUrl =", baseUrl);
}

export class SupabaseRestError extends Error {
  status: number;
  url: string;
  bodyText?: string;

  constructor(status: number, url: string, bodyText?: string) {
    super(
      `REST status ${status} ${url}${bodyText ? `\n${bodyText}` : ""}`
    );

    this.name = "SupabaseRestError";
    this.status = status;
    this.url = url;
    this.bodyText = bodyText;
  }
}

export class SupabaseTimeoutError extends Error {
  url: string;

  constructor(url: string) {
    super(`Supabase request timed out: ${url}`);
    this.name = "SupabaseTimeoutError";
    this.url = url;
  }
}

type EqFilters = Record<
  string,
  string | number | boolean | null | undefined
>;

const REQUEST_TIMEOUT_MS = 30_000;

async function getJson<T>(path: string): Promise<T> {
  const url = baseUrl + path;
  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");

      console.error(
        "[Supabase REST] Request failed:",
        response.status,
        url,
        bodyText
      );

      throw new SupabaseRestError(response.status, url, bodyText);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      console.error(
        `[Supabase REST] Request exceeded ${
          REQUEST_TIMEOUT_MS / 1000
        } seconds:`,
        url
      );

      throw new SupabaseTimeoutError(url);
    }

    console.error("[Supabase REST] Network error:", url, error);
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function from<T>(
  tableOrView: string,
  opts?: {
    select?: string;
    eq?: EqFilters;
    limit?: number;
    order?: {
      column: string;
      ascending?: boolean;
    };
  }
): Promise<T> {
  const select = opts?.select ?? "*";
  const query = new URLSearchParams();

  query.set("select", select);

  if (opts?.eq) {
    for (const [key, value] of Object.entries(opts.eq)) {
      if (value === undefined || value === null) continue;

      query.set(key, `eq.${String(value)}`);
    }
  }

  if (typeof opts?.limit === "number") {
    query.set("limit", String(opts.limit));
  }

  if (opts?.order?.column) {
    const direction =
      opts.order.ascending === false ? "desc" : "asc";

    query.set(
      "order",
      `${opts.order.column}.${direction}`
    );
  }

  const path =
    `/${encodeURIComponent(tableOrView)}?${query.toString()}`;

  return getJson<T>(path);
}

export const supabaseRest = {
  getJson,
  from,
};