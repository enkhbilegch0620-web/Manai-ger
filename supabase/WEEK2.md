# 2-р долоо хоног: унших ба нэмэх query-нүүд

**Гишүүн 2 (Backend / Database)**

Төлөвлөгөөнд заасан ажил: *Унших ба нэмэх query-нүүдийг бэлдэж, RLS-ийг шалгана: хэн юуг харж, нэмж чадах вэ.*

| Файл | Юу хийдэг вэ |
|---|---|
| `supabase/06_week2_queries.sql` | Унших/нэмэх 10 SQL функц (Supabase-д ажиллуулна) |
| `supabase/07_week2_test.sql` | Функц бүр болон эрхийг 20 тохиолдлоор шалгана (ROLLBACK) |
| `lib/db/queries.ts` | Гишүүн 3-т: формуудыг холбоход ашиглах TypeScript функцууд |

> Шалгасан: локал PostgreSQL 16 дээр 1-р долоо хоногийн 26, 2-р долоо хоногийн 20 шалгалт бүгд давсан. `lib/db/queries.ts`-ийг TypeScript strict горимоор шалгасан.

---

## 1. Supabase дээр ажиллуулах

**SQL Editor**-т дараах хоёр файлыг дарааллаар нь ажиллуулна:

1. `06_week2_queries.sql` → **Success. No rows returned**
2. `07_week2_test.sql` → алдаа гарахгүй бол бүх шалгалт давсан

Өмнөх 01–05 файлыг дахин ажиллуулах **шаардлагагүй**.

---

## 2. Хэн юуг харж, нэмж чадах вэ (RLS шалгалтын үр дүн)

✅ = чадна · ❌ = чадахгүй (RLS татгалзана) · — = хамааралгүй

### Харах

| Юу | Эцэг эх | Хүүхэд | Админ | Нэвтрээгүй |
|---|:-:|:-:|:-:|:-:|
| Өөрийн гэр бүлийн гишүүд | ✅ | ✅ | ❌ | ❌ |
| Гэрийн ажил, хийсэн эсэх | ✅ | ✅ | ❌ | ❌ |
| Дэлгүүрийн захиалга | ✅ | ✅ | ❌ | ❌ |
| Гэр бүлийн төлөвлөгөө, хуваарь, хичээл | ✅ | ✅ | ❌ | ❌ |
| **Өөр гэр бүлийн** ямар ч мэдээлэл | ❌ | ❌ | ❌ | ❌ |
| Бүх гэр бүл, бүх гишүүний жагсаалт | ❌ | ❌ | ✅ | ❌ |

### Нэмэх

| Юу | Эцэг эх | Хүүхэд | Админ |
|---|:-:|:-:|:-:|
| Гэрийн ажил өгөх | ✅ | ❌ | ❌ |
| Ажлыг «хийсэн» гэж тэмдэглэх | ✅ | ✅ | ❌ |
| Тэмдэглэгээг болиулах: өөрийнх | ✅ | ✅ | — |
| Тэмдэглэгээг болиулах: бусдынх | ✅ | ❌ | — |
| Дэлгүүрийн захиалга нэмэх / авсан гэж тэмдэглэх | ✅ | ✅ | ❌ |
| Тарсны дараах ажил, хуваарь: өөртөө | ✅ | ✅ | — |
| Тарсны дараах ажил, хуваарь: **анх нэвтрээгүй** гишүүнд (Дүрэм 14) | ✅ | ✅ | ❌ |
| Тарсны дараах ажил, хуваарь: PIN-тэй бусад гишүүнд | ❌ | ❌ | ❌ |
| Хичээл нэмэх: хүүхдийн хуваарьт | ✅* | ✅ | ❌ |
| Хичээл нэмэх: эцэг эхийн хуваарьт | ❌ | ❌ | ❌ |

\* Зөвхөн хүүхэд анх нэвтрээгүй бол (Дүрэм 14).

---

## 3. Функцууд ба хуудаснууд

| Хуудас | TypeScript (`lib/db/queries.ts`) | SQL функц / хүснэгт |
|---|---|---|
| Бүх хуудас (толгой хэсэг) | `getMe(sb)` | `me()` |
| Нүүр: Өнөөдрийн гэрийн ажил | `getChoresForDay(sb, date)` | `chores_for_day(date)` |
| Нүүр: чагт дарах | `toggleChoreDone(sb, choreId, date)` | `toggle_chore_done(...)` |
| Нүүр / Дэлгүүр: Авах зүйлс | `getShopping(sb, includeGot?)` | `shopping_list(...)` |
| Нүүр / Дэлгүүр: авсан гэж тэмдэглэх | `setShoppingGot(sb, id, got)` | `shopping` update |
| Дэлгүүр: Захиалга нэмэх | `addShoppingItem(sb, { text, qty })` | `shopping` insert |
| Нүүр: Миний төлөвлөгөө | `getPlansForDay(sb, date, memberId?)` | `plans_for_day(...)` |
| Профайл: Тарсны дараах ажил нэмэх | `addPlan(sb, {...})` | `plans` insert |
| Гэрийн ажил: жагсаалт | `getFamilyChores(sb)` | `family_chores()` |
| Гэрийн ажил: Ажил өгөх | `addChore(sb, {...})` | `add_chore(...)` |
| Гэрийн ажил: гишүүн сонгох | `getFamilyMembers(sb)` | `family_members()` |
| Хуваарь: хэн хэзээ тарах | `getFamilyDaySchedule(sb, weekday)` | `family_day_schedule(...)` |
| Профайл: миний 7 хоног | `getMemberWeek(sb, memberId)` | `member_week(...)` |
| Профайл: гарагийн хуваарь хадгалах | `saveScheduleDay(sb, {...})` | `schedule_days` upsert |
| Профайл: хичээл нэмэх | `addLesson(sb, {...})` | `lessons` insert |

Засах, устгах үйлдлүүд 3-р долоо хоногт нэмэгдэнэ.

---

## 4. Гишүүн 3-т: `mock-data.ts`-ийг солих

### Хэрэглэх жишээ

```ts
import { createClient } from "@/lib/supabase/server";
import { getMe, getChoresForDay, getShopping, toISODate } from "@/lib/db/queries";

export default async function HomePage() {
  const sb = await createClient();
  const me = await getMe(sb);
  const today = toISODate(new Date());
  const [chores, shopping] = await Promise.all([getChoresForDay(sb, today), getShopping(sb)]);
  // ...
}
```

`"use client"` компонентод `@/lib/supabase/client`-ийн `createClient()`-ийг ашиглана. Функцууд нь адилхан.

### mock-data → queries

| `mock-data.ts` | Оронд нь |
|---|---|
| `currentUser` | `getMe(sb)` |
| `members`, `memberName(id)` | `getFamilyMembers(sb)`. Нэр нь мөр бүрт `memberName`, `orderedByName` гэх мэтээр аль хэдийн орсон байгаа |
| `choresOn(offset, weekday, familyId)` | `getChoresForDay(sb, toISODate(day))` |
| `doneBy` state | `DayChore.done` / `doneByName` + `toggleChoreDone(...)` |
| `shopping`, `got` state | `getShopping(sb)` + `setShoppingGot(sb, id, true)` |
| `plans.filter(...)` | `getPlansForDay(sb, toISODate(day), me.id)` |
| `weekdayOf`, `WEEKDAYS` | `weekdayOf` нь `queries.ts`-д бий (1 = Даваа) |

**Анхаарах:** mock-data-д `id` нь тоо байсан. Supabase-д гишүүний `id` нь **uuid текст** (`"00000000-…"`). Харин ажил, захиалга, төлөвлөгөөний `id` тоо хэвээр.

### Огноо

Supabase сервер **UTC** цагаар ажилладаг. Монголд өглөө 08:00-аас өмнө серверийн "өнөөдөр" нь өчигдөр байна. Тиймээс огноог **үргэлж** `toISODate(new Date())`-ээр хөтчөөс дамжуулна. SQL-ийн `current_date`-д бүү найдаарай.

Server Component дотор `new Date()` нь Vercel-ийн серверийн (UTC) цаг байдаг. Тиймээс өдрийн сонголтыг хөтчөөс URL-ээр (`?d=2026-11-24`) дамжуулах эсвэл client компонентод уншихыг зөвлөж байна.

### Алдаа

Бүх функц алдаа гарвал `DbError` шиднэ. `err.message` нь монгол текст тул формд шууд харуулж болно:

```ts
try {
  await addChore(sb, { title, memberIds, mode: "weekly", weekdays: [1, 3, 5] });
} catch (e) {
  setError(e instanceof Error ? e.message : "Алдаа гарлаа");
  // жишээ: "Дор хаяж нэг гараг сонгоно уу", "Гэрийн ажлыг зөвхөн эцэг эх өгнө"
}
```

| `err.code` | Утга |
|---|---|
| `22023` | Оруулсан утга дутуу эсвэл буруу (Дүрэм 9 гэх мэт) |
| `42501` | Эрх хүрэлцэхгүй (RLS) |
| `23505` | Давхардсан |

---

## 5. Хийгдээгүй, анхаарах зүйлс

- **Засах / устгах** (ажил, захиалга, төлөвлөгөө, хичээл) нь 3-р долоо хоногийн ажил.
- `lib/supabase/client.ts` болон `server.ts` (Supabase client үүсгэх файлууд) нь Гишүүн 3-ын ажил. `queries.ts` нь тэдгээрийн аль алинтай нь ажиллана.
- Хэрэв Гишүүн 3 `supabase gen types` ашиглаж төрөл үүсгэвэл `SupabaseClient<Database>` гэж өгч болно. `queries.ts` өөрчлөгдөхгүй.
