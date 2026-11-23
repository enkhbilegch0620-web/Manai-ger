"use server";

import { PIN_RE, toPassword } from "@/lib/auth-shared";
import { createAdminClient } from "@/lib/supabase/admin";

// Анх нэвтэрч буй гишүүний PIN-ийг хадгална (UC02, 3а).
// Гишүүн өөрөө profiles-ийг засах эрхгүй тул service_role түлхүүрээр сервер дээр хийнэ.
export async function setFirstPin(username: string, pin: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!PIN_RE.test(pin)) return { ok: false, error: "PIN нь 4–8 оронтой тоо байна." };

  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Сервер тохируулагдаагүй байна. Админд хандана уу." };

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, pin_set")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();
  if (error) return { ok: false, error: "Холбогдож чадсангүй. Дахин оролдоно уу." };
  if (!profile) return { ok: false, error: "Ийм нэртэй бүртгэл олдсонгүй." };
  // Аль хэдийн PIN-тэй хүний PIN-ийг энэ замаар солихыг хориглоно (зөвхөн админ шинэчилнэ).
  if (profile.pin_set) return { ok: false, error: "PIN аль хэдийн үүссэн байна. Нэвтрэх хэсгээс орно уу." };

  const { error: pwError } = await admin.auth.admin.updateUserById(profile.id, { password: toPassword(pin) });
  if (pwError) return { ok: false, error: "PIN хадгалж чадсангүй. Дахин оролдоно уу." };

  await admin.from("profiles").update({ pin_set: true }).eq("id", profile.id);
  return { ok: true };
}
