// Нэр + PIN-ийг Supabase Auth-ийн имэйл + нууц үг болгох дүрэм.
// supabase/README.md-ийн 4-р хэсэгтэй ижил байх ёстой (Гишүүн 2).

export const PIN_RE = /^\d{4,8}$/; // Дүрэм 3: 4–8 оронтой тоо

export const toEmail = (username: string) => `${username.trim().toLowerCase()}@manai-ger.local`;

/** Supabase нууц үг 6+ тэмдэгт шаарддаг тул угтвар нэмнэ. */
export const toPassword = (pin: string) => `mg_${pin}`;

/** .env.local-д Supabase-ийн түлхүүр байхгүй бол жишээ өгөгдлөөр ажиллана. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const USE_MOCK = !SUPABASE_URL || !SUPABASE_ANON_KEY;
