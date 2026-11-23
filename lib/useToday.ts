"use client";

import { useSyncExternalStore } from "react";

// Өнөөдрийн огноог зөвхөн хөтөч дээр уншина (сервер, хөтөч хоёрын цаг зөрөхөөс сэргийлнэ).
// Сервер дээр null буцаана.
const noopSubscribe = () => () => {};
const todayKey = () => new Date().toDateString();

export function useToday() {
  const key = useSyncExternalStore(noopSubscribe, todayKey, () => "");
  return key ? new Date(key) : null;
}

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "2026-11-26" → өнөөдрөөс хэдэн хоногийн дараа. Буруу огноо бол null. */
export function offsetFromISO(value: string, today: Date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (toISODate(d) !== value) return null;
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export const nowHM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
