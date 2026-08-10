import { createBrowserClient } from "@supabase/ssr";

// Fallback to a valid-format placeholder so the build doesn't throw on static pages;
// at runtime these must be replaced with real Supabase credentials in .env.local.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
