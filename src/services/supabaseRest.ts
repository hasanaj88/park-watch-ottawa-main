const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function mustEnv(name: string, value?: string) {
  if (!value) throw new Error(`Missing env: ${name}. Check your .env and restart npm run dev.`);
  return value;
}

const baseUrl = mustEnv("VITE_SUPABASE_URL", supabaseUrl).replace(/\/$/, "") + "/rest/v1";
const anonKey = mustEnv("VITE_SUPABASE_ANON_KEY", supabaseAnonKey);

//
console.log("[Supabase REST] baseUrl =", baseUrl);

export const supabaseRest = {
  async getJson<T>(path: string): Promise<T> {
    //  timeout 10 seconds
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(baseUrl + path, {
        signal: controller.signal,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`REST ${res.status} ${path}\n${text}`);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(t);
    }
  },
};

