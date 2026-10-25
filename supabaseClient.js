/**
 * SIOMAY ONLINE — SUPABASE CLIENT CONFIGURATION
 * 
 * Provides a singleton Supabase client instance initialized from
 * environment variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY).
 * 
 * Includes safety fallbacks if credentials are not yet configured.
 */

import { createClient } from "@supabase/supabase-js";

// Default Supabase project credentials for Siomay Online (production fallback for Vercel builds)
const DEFAULT_SUPABASE_URL = "https://ykkrqtnvvpzqkbwphxuq.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlra3JxdG52dnB6cWtid3BoeHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NjAxMzAsImV4cCI6MjEwODQzNjEzMH0.DUyg8Hn62zgdBDICcvRnG8Pk87_5UdvoY0ftfj_ONeo";

const envUrl = (import.meta.env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
const envAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();

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
