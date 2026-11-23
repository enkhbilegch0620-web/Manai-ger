/**
 * «Манай гэр» — өгөгдлийн сантай ажиллах функцууд (2-р долоо хоног · Гишүүн 2)
 *
 * Унших ба нэмэх query-нүүд. Эдгээр нь `supabase/06_week2_queries.sql`-ийн
 * функцууд болон хүснэгтүүдийг дууддаг. Хэн юуг харж, нэмж чадахыг Supabase-ийн
 * RLS шийднэ — энд дахин шалгах шаардлагагүй.
 *
 * Хэрэглэх (Гишүүн 3):
 *   import { createClient } from "@/lib/supabase/server";      // эсвэл /client
 *   import { getChoresForDay, toISODate } from "@/lib/db/queries";
 *
 *   const sb = await createClient();
 *   const chores = await getChoresForDay(sb, toISODate(new Date()));
 *
 * Алдаа гарвал `DbError` шиднэ. `err.message` нь хэрэглэгчид шууд харуулж
 * болох монгол текст байна.
 *
 * ⚠ Огноог ҮРГЭЛЖ `toISODate(...)`-ээр хөтчийн цагаар дамжуулна.
 *   Supabase сервер UTC цагтай тул өглөө 08:00-аас өмнө "өнөөдөр" нь өчигдөр болдог.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/* ================================================================== */
/*  Төрлүүд                                                            */
/* ================================================================== */

export type Role = "admin" | "parent" | "child";
export type ChoreMode = "daily" | "weekly" | "once";
export type Place = "work" | "school" | "rest";
/** 1 = Даваа ... 7 = Ням */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** "YYYY-MM-DD" */
export type ISODate = string;
/** "HH:MM" */
export type HHMM = string;

export type Me = {
  id: string;
  username: string;
  name: string;
  role: Role;
  familyId: number | null;
  familyName: string | null;
  hue: number;
  pinSet: boolean;
};

export type FamilyMember = {
  id: string;
  name: string;
  role: Role;
  hue: number;
  pinSet: boolean;
};

/** Нүүр хуудасны «Өнөөдрийн гэрийн ажил»-ын нэг мөр */
export type DayChore = {
  choreId: number;
  title: string;
  mode: ChoreMode;
  memberId: string | null; // null → «Хэн ч хийж болно»
  memberName: string | null;
  memberHue: number | null;
  done: boolean;
  doneBy: string | null;
  doneByName: string | null;
};

/** «Гэрийн ажил» хуудасны жагсаалтын нэг мөр */
export type FamilyChore = {
  choreId: number;
  title: string;
  mode: ChoreMode;
  onceDate: ISODate | null;
  weekdays: Weekday[];
  memberId: string | null;
  memberName: string | null;
  memberHue: number | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type ShoppingItem = {
  id: number;
  text: string;
  qty: string | null;
  orderedBy: string | null;
  orderedByName: string | null;
  got: boolean;
  gotBy: string | null;
  gotByName: string | null;
  gotAt: string | null;
  createdAt: string;
};

export type Plan = {
  id: number;
  memberId: string;
  memberName: string;
  date: ISODate;
  from: HHMM;
  to: HHMM | null;
  text: string;
};

/** «Хуваарь» хуудас: сонгосон гарагт хэн хэзээ тарах */
export type DayScheduleRow = {
  memberId: string;
  name: string;
  role: Role;
  hue: number;
  pinSet: boolean;
  place: Place | null; // null → тухайн гарагт хуваарь оруулаагүй
  start: HHMM | null;
  end: HHMM | null; // сурагчийнх оруулаагүй бол сүүлийн хичээлээс тооцсон
  lessonCount: number;
  note: string | null;
};

export type Lesson = {
  id: number;
  name: string;
  room: string | null;
  teacher: string | null;
  start: HHMM;
  end: HHMM;
};

export type WeekDay = {
  weekday: Weekday;
  place: Place | null;
  start: HHMM | null;
  end: HHMM | null;
  note: string | null;
  lessons: Lesson[];
};

/* ================================================================== */
/*  Туслах функцууд                                                    */
/* ================================================================== */

/** Хөтчийн цагаар "YYYY-MM-DD" */
export function toISODate(d: Date): ISODate {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 1 = Даваа ... 7 = Ням */
export const weekdayOf = (d: Date): Weekday => ((((d.getDay() + 6) % 7) + 1) as Weekday);

/** "15:00:00" → "15:00" */
const hhmm = (t: string | null | undefined): HHMM | null => (t ? t.slice(0, 5) : null);

export class DbError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "DbError";
    this.code = code;
  }
}

type PgError = { message: string; code?: string } | null;

function fail(error: NonNullable<PgError>): never {
  // Манай SQL функцууд монгол мессеж буцаадаг. RLS-ийн англи мессежийг орчуулна.
  const english = /row-level security|permission denied/i.test(error.message);
  if (error.code === "42501" && english) throw new DbError("Танд энэ үйлдлийг хийх эрх алга", error.code);
  if (error.code === "23505") throw new DbError("Ийм бичлэг аль хэдийн байна", error.code);
  if (error.code === "23514") throw new DbError("Оруулсан утга буруу байна", error.code);
  throw new DbError(error.message, error.code);
}

function unwrap<T>(res: { data: unknown; error: PgError }): T {
  if (res.error) fail(res.error);
  return res.data as T;
}

/* ================================================================== */
/*  УНШИХ                                                              */
/* ================================================================== */

/** Нэвтэрсэн хэрэглэгч (нэвтрээгүй бол null) */
export async function getMe(sb: SupabaseClient): Promise<Me | null> {
  type Row = {
    id: string; username: string; name: string; role: Role;
    family_id: number | null; family_name: string | null; hue: number; pin_set: boolean;
  };
  const r = unwrap<Row | null>(await sb.rpc("me").maybeSingle());
  return r && {
    id: r.id, username: r.username, name: r.name, role: r.role,
    familyId: r.family_id, familyName: r.family_name, hue: r.hue, pinSet: r.pin_set,
  };
}

/** Миний гэр бүлийн гишүүд (эцэг эх эхэнд). Ажил өгөх формын сонголтод. */
export async function getFamilyMembers(sb: SupabaseClient): Promise<FamilyMember[]> {
  type Row = { id: string; name: string; role: Role; hue: number; pin_set: boolean };
  const rows = unwrap<Row[]>(await sb.rpc("family_members"));
  return rows.map((r) => ({ id: r.id, name: r.name, role: r.role, hue: r.hue, pinSet: r.pin_set }));
}

/** Тухайн өдөр хийх гэрийн ажлууд (хийгдээгүй, минийх эхэнд) — Нүүр хуудас */
export async function getChoresForDay(sb: SupabaseClient, date: ISODate): Promise<DayChore[]> {
  type Row = {
    chore_id: number; title: string; mode: ChoreMode;
    member_id: string | null; member_name: string | null; member_hue: number | null;
    done: boolean; done_by: string | null; done_by_name: string | null;
  };
  const rows = unwrap<Row[]>(await sb.rpc("chores_for_day", { p_date: date }));
  return rows.map((r) => ({
    choreId: r.chore_id, title: r.title, mode: r.mode,
    memberId: r.member_id, memberName: r.member_name, memberHue: r.member_hue,
    done: r.done, doneBy: r.done_by, doneByName: r.done_by_name,
  }));
}

/** Гэр бүлийн бүх гэрийн ажил — «Гэрийн ажил» хуудас */
export async function getFamilyChores(sb: SupabaseClient): Promise<FamilyChore[]> {
  type Row = {
    chore_id: number; title: string; mode: ChoreMode; once_date: string | null; weekdays: number[];
    member_id: string | null; member_name: string | null; member_hue: number | null;
    created_by: string | null; created_by_name: string | null; created_at: string;
  };
  const rows = unwrap<Row[]>(await sb.rpc("family_chores"));
  return rows.map((r) => ({
    choreId: r.chore_id, title: r.title, mode: r.mode, onceDate: r.once_date,
    weekdays: (r.weekdays ?? []) as Weekday[],
    memberId: r.member_id, memberName: r.member_name, memberHue: r.member_hue,
    createdBy: r.created_by, createdByName: r.created_by_name, createdAt: r.created_at,
  }));
}

/** Дэлгүүрийн захиалга. includeGot = true бол авсан зүйлс ч орно. */
export async function getShopping(sb: SupabaseClient, includeGot = false): Promise<ShoppingItem[]> {
  type Row = {
    id: number; text: string; qty: string | null;
    ordered_by: string | null; ordered_by_name: string | null;
    got: boolean; got_by: string | null; got_by_name: string | null; got_at: string | null; created_at: string;
  };
  const rows = unwrap<Row[]>(await sb.rpc("shopping_list", { p_include_got: includeGot }));
  return rows.map((r) => ({
    id: r.id, text: r.text, qty: r.qty,
    orderedBy: r.ordered_by, orderedByName: r.ordered_by_name,
    got: r.got, gotBy: r.got_by, gotByName: r.got_by_name, gotAt: r.got_at, createdAt: r.created_at,
  }));
}

/** Тухайн өдрийн тарсны дараах ажил. memberId өгөхгүй бол гэр бүлийн бүгдийнх. */
export async function getPlansForDay(sb: SupabaseClient, date: ISODate, memberId?: string): Promise<Plan[]> {
  type Row = {
    id: number; member_id: string; member_name: string;
    plan_date: string; from_time: string; to_time: string | null; text: string;
  };
  const rows = unwrap<Row[]>(await sb.rpc("plans_for_day", { p_date: date, p_member_id: memberId ?? null }));
  return rows.map((r) => ({
    id: r.id, memberId: r.member_id, memberName: r.member_name, date: r.plan_date,
    from: hhmm(r.from_time)!, to: hhmm(r.to_time), text: r.text,
  }));
}

/** Сонгосон гарагт гэрийнхэн хэзээ тарах вэ (эрт тарах нь эхэнд) — «Хуваарь» хуудас */
export async function getFamilyDaySchedule(sb: SupabaseClient, weekday: Weekday): Promise<DayScheduleRow[]> {
  type Row = {
    member_id: string; name: string; role: Role; hue: number; pin_set: boolean;
    place: Place | null; start_time: string | null; end_time: string | null; lesson_count: number; note: string | null;
  };
  const rows = unwrap<Row[]>(await sb.rpc("family_day_schedule", { p_weekday: weekday }));
  return rows.map((r) => ({
    memberId: r.member_id, name: r.name, role: r.role, hue: r.hue, pinSet: r.pin_set,
    place: r.place, start: hhmm(r.start_time), end: hhmm(r.end_time),
    lessonCount: r.lesson_count, note: r.note,
  }));
}

/** Нэг гишүүний 7 хоногийн хуваарь, хичээлүүдтэй — Профайл / хуваарь засах */
export async function getMemberWeek(sb: SupabaseClient, memberId: string): Promise<WeekDay[]> {
  type LessonRow = { id: number; name: string; room: string | null; teacher: string | null; start_time: string; end_time: string };
  type Row = {
    weekday: number; place: Place | null; start_time: string | null; end_time: string | null;
    note: string | null; lessons: LessonRow[];
  };
  const rows = unwrap<Row[]>(await sb.rpc("member_week", { p_member_id: memberId }));
  return rows.map((r) => ({
    weekday: r.weekday as Weekday, place: r.place,
    start: hhmm(r.start_time), end: hhmm(r.end_time), note: r.note,
    lessons: (r.lessons ?? []).map((l) => ({
      id: l.id, name: l.name, room: l.room, teacher: l.teacher, start: l.start_time, end: l.end_time,
    })),
  }));
}

/* ================================================================== */
/*  НЭМЭХ                                                              */
/* ================================================================== */

export type NewChore = {
  title: string;
  memberIds: string[]; // дор хаяж 1 (Дүрэм 9)
  mode: ChoreMode;
  onceDate?: ISODate; // mode = "once" үед заавал
  weekdays?: Weekday[]; // mode = "weekly" үед дор хаяж 1
};

/** Гэрийн ажил өгөх (зөвхөн эцэг эх). Гишүүн тус бүрд нэг ажил үүсэж, id-нууд буцна. */
export async function addChore(sb: SupabaseClient, c: NewChore): Promise<number[]> {
  return unwrap<number[]>(
    await sb.rpc("add_chore", {
      p_title: c.title,
      p_member_ids: c.memberIds,
      p_mode: c.mode,
      p_once_date: c.onceDate ?? null,
      p_weekdays: c.weekdays ?? null,
    }),
  );
}

/** «Хийсэн» чагт дарах / болиулах. Шинэ төлөвийг буцаана (true = хийсэн). */
export async function toggleChoreDone(sb: SupabaseClient, choreId: number, date: ISODate): Promise<boolean> {
  return unwrap<boolean>(await sb.rpc("toggle_chore_done", { p_chore_id: choreId, p_date: date }));
}

/** Дэлгүүрийн захиалга нэмэх. Хэн захисан, аль гэр бүлийнх нь автоматаар бөглөгдөнө. */
export async function addShoppingItem(sb: SupabaseClient, item: { text: string; qty?: string }): Promise<number> {
  const text = item.text.trim();
  if (!text) throw new DbError("Барааны нэрийг оруулна уу");
  const row = unwrap<{ id: number }>(
    await sb.from("shopping").insert({ text, qty: item.qty?.trim() || null }).select("id").single(),
  );
  return row.id;
}

/** Барааг «авсан» / «аваагүй» болгох. Хэн, хэзээ авсныг Supabase өөрөө бөглөнө. */
export async function setShoppingGot(sb: SupabaseClient, id: number, got: boolean): Promise<void> {
  unwrap(await sb.from("shopping").update({ got }).eq("id", id));
}

export type NewPlan = { memberId: string; date: ISODate; from: HHMM; to?: HHMM; text: string };

/** Тарсны дараах ажил нэмэх (өөртөө, эсвэл анх нэвтрээгүй гэр бүлийн гишүүнд). Дүрэм 13. */
export async function addPlan(sb: SupabaseClient, p: NewPlan): Promise<number> {
  const text = p.text.trim();
  if (!text) throw new DbError("Юу хийхийг бичнэ үү");
  if (!p.from) throw new DbError("Эхлэх цагийг оруулна уу");
  const row = unwrap<{ id: number }>(
    await sb
      .from("plans")
      .insert({ member_id: p.memberId, plan_date: p.date, from_time: p.from, to_time: p.to || null, text })
      .select("id")
      .single(),
  );
  return row.id;
}

export type ScheduleDayInput = {
  memberId: string;
  weekday: Weekday;
  place: Place;
  start?: HHMM;
  end?: HHMM; // ажлын өдөрт заавал (Дүрэм 11)
  note?: string;
};

/** Нэг гарагийн хуваарийг хадгалах (байвал шинэчилнэ). */
export async function saveScheduleDay(sb: SupabaseClient, s: ScheduleDayInput): Promise<void> {
  if (s.place === "work" && !s.end) throw new DbError("Ажлын өдөрт тарах цагийг оруулна уу");
  unwrap(
    await sb.from("schedule_days").upsert(
      {
        member_id: s.memberId,
        weekday: s.weekday,
        place: s.place,
        start_time: s.start || null,
        end_time: s.end || null,
        note: s.note?.trim() || null,
      },
      { onConflict: "member_id,weekday" },
    ),
  );
}

export type NewLesson = {
  memberId: string;
  weekday: Weekday;
  start: HHMM; // "08:30" хэлбэр (Дүрэм 12)
  end: HHMM;
  name: string;
  room?: string;
  teacher?: string;
};

/** Хичээл нэмэх (зөвхөн хүүхдийн хуваарьт). Тухайн гарагт хуваарь байхгүй бол «school» гэж үүсгэнэ. */
export async function addLesson(sb: SupabaseClient, l: NewLesson): Promise<number> {
  const name = l.name.trim();
  if (!name) throw new DbError("Хичээлийн нэрийг оруулна уу");
  if (!/^\d{2}:\d{2}$/.test(l.start) || !/^\d{2}:\d{2}$/.test(l.end)) {
    throw new DbError("Цагийг 08:30 хэлбэрээр оруулна уу");
  }
  if (l.end <= l.start) throw new DbError("Дуусах цаг эхлэх цагаас хойш байх ёстой");

  // lessons → schedule_days холбоостой тул тухайн гарагийн мөр байх ёстой
  unwrap(
    await sb
      .from("schedule_days")
      .upsert(
        { member_id: l.memberId, weekday: l.weekday, place: "school" },
        { onConflict: "member_id,weekday", ignoreDuplicates: true },
      ),
  );

  const row = unwrap<{ id: number }>(
    await sb
      .from("lessons")
      .insert({
        member_id: l.memberId,
        weekday: l.weekday,
        start_time: l.start,
        end_time: l.end,
        name,
        room: l.room?.trim() || null,
        teacher: l.teacher?.trim() || null,
      })
      .select("id")
      .single(),
  );
  return row.id;
}
