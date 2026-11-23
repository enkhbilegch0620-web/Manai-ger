// Нэвтрэх хуудасны функцууд (Гишүүн 3).
// .env.local-д Supabase-ийн түлхүүр байвал Supabase-ээр, байхгүй бол lib/mock-data.ts-ийн
// туршилтын хэрэглэгчдээр ажиллана. Хоёулаа supabase/04_seed.sql-тэй ижил нэр, PIN-тэй.

import { setFirstPin } from "@/app/(auth)/login/actions";
import { USE_MOCK, toEmail, toPassword } from "@/lib/auth-shared";
import { DEMO_PIN, findMemberByUsername, type Role } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";

export type { Role };

export type NameCheck = { status: "not_found" } | { status: "has_pin"; name: string } | { status: "needs_pin"; name: string };

export type AuthResult = { ok: true; role: Role } | { ok: false; error: string };

const WRONG_PIN = "PIN код буруу байна.";

/** 1-р алхам: нэр байгаа эсэх, PIN үүсгэсэн эсэхийг шалгана. */
export async function checkName(username: string): Promise<NameCheck> {
  if (USE_MOCK) {
    const m = findMemberByUsername(username);
    if (!m) return { status: "not_found" };
    return m.hasPin ? { status: "has_pin", name: m.name } : { status: "needs_pin", name: m.name };
  }
  // Нэвтрээгүй хэрэглэгч profiles-ийг уншиж чадахгүй тул зөвхөн төлөвийг буцаадаг функцийг дуудна.
  const { data, error } = await createClient().rpc("login_state", { p_username: username });
  if (error) throw error;
  if (data === "ok") return { status: "has_pin", name: username.trim().toLowerCase() };
  if (data === "need_pin") return { status: "needs_pin", name: username.trim().toLowerCase() };
  return { status: "not_found" };
}

/** 2а алхам: PIN-ээр нэвтрэх. */
export async function login(username: string, pin: string): Promise<AuthResult> {
  if (USE_MOCK) {
    const m = findMemberByUsername(username);
    if (!m || !m.hasPin || pin !== DEMO_PIN) return { ok: false, error: WRONG_PIN };
    return { ok: true, role: m.role };
  }
  const { data, error } = await createClient().auth.signInWithPassword({
    email: toEmail(username),
    password: toPassword(pin),
  });
  if (error || !data.user) return { ok: false, error: WRONG_PIN };
  const role = data.user.app_metadata?.role as Role | undefined;
  return { ok: true, role: role ?? "child" };
}

/** 2б алхам: анх нэвтрэхэд PIN үүсгээд шууд нэвтэрнэ. */
export async function createPin(username: string, pin: string): Promise<AuthResult> {
  if (USE_MOCK) {
    const m = findMemberByUsername(username);
    if (!m) return { ok: false, error: "Ийм нэртэй бүртгэл олдсонгүй." };
    return { ok: true, role: m.role };
  }
  const saved = await setFirstPin(username, pin);
  if (!saved.ok) return saved;
  return login(username, pin);
}
