/**
 * SIOMAY ONLINE — SUPABASE CLIENT CONFIGURATION
 * 
 * Provides a singleton Supabase client instance initialized from
 * environment variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY).
 * 
 * Includes safety fallbacks if credentials are not yet configured.
 */

import { createClient } from "@supabase/supabase-js";

const envUrl = import.meta.env?.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

// Check if credentials are present and not default placeholders
export const isSupabaseConfigured = Boolean(
  envUrl &&
  envAnonKey &&
  !envUrl.includes("your-project-id") &&
  !envAnonKey.includes("your-anon-public-key")
);

export const supabase = isSupabaseConfigured
  ? createClient(envUrl, envAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

if (!isSupabaseConfigured) {
  console.info(
    "[Siomay Online] Supabase credentials belum dikonfigurasi di file .env. " +
    "Sistem ulasan akan menampilkan panduan koneksi database Supabase."
  );
}
