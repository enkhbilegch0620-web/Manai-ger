// ЖИШЭЭ ӨГӨГДӨЛ — зөвхөн 1-р долоо хоногийн харагдацад зориулсан.
// TODO(Гишүүн 2, 3): эдгээрийг Supabase-ийн хүснэгтүүдээс уншдаг болгоно.

export type Role = "admin" | "parent" | "child";

export type Member = {
  id: number;
  name: string;
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

export type ShoppingItem = { id: number; text: string; qty: string; orderedBy: number; got: boolean };

export type Plan = { id: number; memberId: number; dayOffset: number; from: string; to: string; text: string };

export type DaySchedule =
  | { place: "off" }
  | { place: "work" | "school"; start: string; end: string; lessons?: number };

export const families = [
  { id: 1, name: "Батын гэр" },
  { id: 2, name: "Доржийн гэр" },
];

export const members: Member[] = [
  { id: 1, name: "Админ", role: "admin", familyId: null, hasPin: true },
  { id: 2, name: "Ээж", role: "parent", familyId: 1, hasPin: true },
  { id: 3, name: "Аав", role: "parent", familyId: 1, hasPin: false },
  { id: 4, name: "Тувшин", role: "child", familyId: 1, hasPin: true },
  { id: 5, name: "Номин", role: "child", familyId: 1, hasPin: true },
];

// Туршилтын PIN. Жинхэнэ системд PIN-ийг шифрлэж хадгална.
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
  { id: 24, text: "Будаа", qty: "1 кг", orderedBy: 4, got: true },
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

export function findMemberByName(name: string) {
  const n = name.trim().toLowerCase();
  return members.find((m) => m.name.toLowerCase() === n) ?? null;
}

/** Тухайн өдөр хийх ажлууд: өдөр бүрийн, тэр гарагийн, тэр өдрийн нэг удаагийн. */
export function choresOn(dayOffset: number, weekday: number, familyId: number | null) {
  const familyMemberIds = new Set(members.filter((m) => m.familyId === familyId).map((m) => m.id));
  return chores.filter(
    (c) =>
      (c.memberId === null || familyMemberIds.has(c.memberId)) &&
      (c.mode === "daily" ||
        (c.mode === "weekly" && c.days.includes(weekday)) ||
        (c.mode === "once" && c.onceOffset === dayOffset)),
  );
}

export const isValidPin = (pin: string) => /^\d{4,8}$/.test(pin);
