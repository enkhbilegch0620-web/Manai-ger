// lib/auth-api.ts
// Temporary version for testing: USE_MOCK = true works without Supabase.
// Once your team chooses the login method, replace the 3 TODO functions.

export type Role = "admin" | "parent" | "child";

export type NameCheck =
  | { status: "not_found" }
  | { status: "has_pin"; name: string }
  | { status: "needs_pin"; name: string };

export type AuthResult = { ok: true; role: Role } | { ok: false; error: string };

const USE_MOCK = true;

// ---------- Test data (only used when USE_MOCK = true) ----------
const mockUsers: Record<string, { name: string; role: Role; pin: string | null }> = {
  admin: { name: "admin", role: "admin", pin: "1234" },
  bat: { name: "Бат", role: "parent", pin: "1234" },
  saraa: { name: "Сараа", role: "child", pin: null },
};
const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const key = (name: string) => name.trim().toLowerCase();

export async function checkName(name: string): Promise<NameCheck> {
  if (USE_MOCK) {
    await wait();
    const u = mockUsers[key(name)];
    if (!u) return { status: "not_found" };
    return u.pin ? { status: "has_pin", name: u.name } : { status: "needs_pin", name: u.name };
  }
  // TODO: look the name up in the `members` table (server action or API route)
  throw new Error("checkName is not connected yet");
}

export async function login(name: string, pin: string): Promise<AuthResult> {
  if (USE_MOCK) {
    await wait();
    const u = mockUsers[key(name)];
    if (!u || u.pin !== pin) return { ok: false, error: "PIN код буруу байна." };
    return { ok: true, role: u.role };
  }
  // TODO: Supabase Auth (method A) or your own pins table (method B)
  throw new Error("login is not connected yet");
}

export async function createPin(name: string, pin: string): Promise<AuthResult> {
  if (USE_MOCK) {
    await wait();
    const u = mockUsers[key(name)];
    if (!u) return { ok: false, error: "Ийм нэртэй бүртгэл олдсонгүй." };
    u.pin = pin;
    return { ok: true, role: u.role };
  }
  // TODO: hash the PIN and save it
  throw new Error("createPin is not connected yet");
}