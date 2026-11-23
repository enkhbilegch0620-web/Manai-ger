import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/auth-shared";

// ⚠ ЗӨВХӨН сервер дээр ("use server" server action дотор) ашиглана.
// SUPABASE_SERVICE_ROLE_KEY нь NEXT_PUBLIC_ угтваргүй тул хөтөч рүү хэзээ ч очихгүй.
// Түлхүүр тохируулаагүй бол null буцаана.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
