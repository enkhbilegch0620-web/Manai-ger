import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/auth-shared";

// Хөтөч дээр ажиллах Supabase client. Нэвтэрсэн session-ийг cookie-д хадгална.
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
