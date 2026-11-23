// ЖИШЭЭ ӨГӨГДӨЛ — хуудсуудын харагдацыг Supabase холбогдохоос өмнө турших зориулалттай.
// TODO(Гишүүн 2, 3): эдгээрийг Supabase-ийн хүснэгтүүдээс уншдаг болгоно.

export type Role = "admin" | "parent" | "child";

export type Member = {
  id: number;
  username: string; // нэвтрэх нэр (латин), supabase/04_seed.sql-тэй ижил
  name: string; // харагдах нэр
  role: Role;
  familyId: number | null;
  hasPin: boolean;
};

export type Chore = {
  id: number;
  title: string;
  memberId: number | null; // null бол "Хэн ч хийж болно"
  mode: "daily" | "weekly" | "once";
  days: number[]; // 1 = Даваа ... 7 = Ням
  onceOffset?: number; // нэг удаагийн ажил өнөөдрөөс хэд хоногийн дараа
};

export type ShoppingItem = {
  id: number;
  text: string;
  qty: string;
  orderedBy: number | null;
  got: boolean;
  gotBy?: number | null;
  gotAt?: string; // "17:40"
};

export type Plan = { id: number; memberId: number; dayOffset: number; from: string; to: string; text: string };

export type DaySchedule =
  | { place: "off" }
  | { place: "work" | "school"; start: string; end: string; lessons?: number };

export const families = [
  { id: 1, name: "Батын гэр" },
  { id: 2, name: "Дорждын гэр" },
];

export const members: Member[] = [
  // supabase/04_seed.sql-ийн туршилтын хэрэглэгчидтэй ижил (Батын гэр)
  { id: 1, username: "admin", name: "Админ", role: "admin", familyId: null, hasPin: true },
  { id: 2, username: "bat_eej", name: "Ээж", role: "parent", familyId: 1, hasPin: true },
  { id: 3, username: "bat_aav", name: "Аав", role: "parent", familyId: 1, hasPin: true },
  { id: 4, username: "bat_tuvshin", name: "Түвшин", role: "child", familyId: 1, hasPin: true },
  { id: 5, username: "bat_saraa", name: "Сараа", role: "child", familyId: 1, hasPin: false },
];

// Туршилтын PIN (seed-тэй ижил). Жинхэнэ системд PIN-ийг Supabase Auth шифрлэж хадгална.
export const DEMO_PIN = "1234";

// TODO(Гишүүн 3): нэвтэрсэн хэрэглэгчийг session-оос авна.
export const currentUser: Member = members[1];

export const chores: Chore[] = [
  { id: 11, title: "Аяга угаах", memberId: 4, mode: "daily", days: [] },
  { id: 12, title: "Хог гаргах", memberId: 5, mode: "weekly", days: [1, 2, 4] },
  { id: 13, title: "Шал угаах", memberId: 3, mode: "weekly", days: [1, 6] },
  { id: 14, title: "Цэцэг услах", memberId: 2, mode: "daily", days: [] },
  { id: 15, title: "Ор засах", memberId: 4, mode: "daily", days: [] },
  { id: 16, title: "Машин угаах", memberId: 3, mode: "once", days: [], onceOffset: 3 },
];

export const shopping: ShoppingItem[] = [
  { id: 21, text: "Сүү", qty: "2 л", orderedBy: 2, got: false },
  { id: 22, text: "Талх", qty: "1 ш", orderedBy: 4, got: false },
  { id: 23, text: "Өндөг", qty: "10 ш", orderedBy: 3, got: false },
  { id: 24, text: "Будаа", qty: "1 кг", orderedBy: 4, got: true, gotBy: 2, gotAt: "17:40" },
];

export const plans: Plan[] = [
  { id: 31, memberId: 2, dayOffset: 0, from: "18:30", to: "19:30", text: "Йогийн хичээл" },
  { id: 32, memberId: 4, dayOffset: 0, from: "15:00", to: "17:00", text: "Сагсны бэлтгэл" },
  { id: 33, memberId: 2, dayOffset: 2, from: "19:00", to: "", text: "Эцэг эхийн хурал" },
];

const workWeek: Record<number, DaySchedule> = {
  1: { place: "work", start: "09:00", end: "18:00" },
  2: { place: "work", start: "09:00", end: "18:00" },
  3: { place: "work", start: "09:00", end: "18:00" },
  4: { place: "work", start: "09:00", end: "18:00" },
  5: { place: "work", start: "09:00", end: "17:00" },
  6: { place: "off" },
  7: { place: "off" },
};
const schoolWeek: Record<number, DaySchedule> = {
  1: { place: "school", start: "08:30", end: "13:30", lessons: 6 },
  2: { place: "school", start: "08:30", end: "12:40", lessons: 5 },
  3: { place: "school", start: "08:30", end: "13:30", lessons: 6 },
  4: { place: "school", start: "08:30", end: "12:40", lessons: 5 },
  5: { place: "school", start: "08:30", end: "11:50", lessons: 4 },
  6: { place: "off" },
};

export const schedules: Record<number, Record<number, DaySchedule>> = { 2: workWeek, 4: schoolWeek, 5: schoolWeek };

/* ---------- Туслах функцууд ---------- */
export const WEEKDAYS = ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба", "Ням"];
export const WEEKDAYS_SHORT = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
export const ROLE_NAMES: Record<Role, string> = { admin: "Админ", parent: "Эцэг эх", child: "Сурагч" };

/** 1 = Даваа ... 7 = Ням */
export const weekdayOf = (d: Date) => ((d.getDay() + 6) % 7) + 1;
export const memberName = (id: number | null) => members.find((m) => m.id === id)?.name ?? "—";
export const familyName = (id: number | null) => families.find((f) => f.id === id)?.name ?? "";
export const initials = (name: string) => name.slice(0, 2).toUpperCase();

export function findMemberByUsername(username: string) {
  const n = username.trim().toLowerCase();
  return members.find((m) => m.username === n) ?? null;
}

/** Тухайн өдөр хийх ажлууд: өдөр бүрийн, тэр гарагийн, тэр өдрийн нэг удаагийн. */
export function choresOn(list: Chore[], dayOffset: number, weekday: number, familyId: number | null) {
  const familyMemberIds = new Set(members.filter((m) => m.familyId === familyId).map((m) => m.id));
  return list.filter(
    (c) =>
      (c.memberId === null || familyMemberIds.has(c.memberId)) &&
      (c.mode === "daily" ||
        (c.mode === "weekly" && c.days.includes(weekday)) ||
        (c.mode === "once" && c.onceOffset === dayOffset)),
  );
}

/** Давтамжийн бичиг: "Өдөр бүр", "Да, Лх, Ба", "11/26 · нэг удаа" */
export function freqText(c: Chore, today: Date | null) {
  if (c.mode === "daily") return "Өдөр бүр";
  if (c.mode === "weekly") return [...c.days].sort().map((d) => WEEKDAYS_SHORT[d - 1]).join(", ");
  if (!today || c.onceOffset === undefined) return "Нэг удаа";
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + c.onceOffset);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} · нэг удаа`;
}

export const isValidPin = (pin: string) => /^\d{4,8}$/.test(pin);
