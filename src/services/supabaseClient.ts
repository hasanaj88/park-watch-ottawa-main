// src/services/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env vars");
}

declare global {
  // eslint-disable-next-line no-var
  var __supabase__: SupabaseClient | undefined;
}

export const supabase =
  globalThis.__supabase__ ??
  (globalThis.__supabase__ = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,

      // storage key for auth session
      storageKey: "olp-dev-auth",
    },
  }));
