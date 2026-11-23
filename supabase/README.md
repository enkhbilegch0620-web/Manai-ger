# «Манай гэр» — Supabase өгөгдлийн сан

**1-р долоо хоног · Гишүүн 2 (Backend / Database)**

Төлөвлөгөөнд заасан ажил: *Supabase төсөл нээж, ERD-ийн дагуу бүх хүснэгт болон холбоосыг үүсгэнэ. profiles trigger, RLS дүрэм, туршилтын өгөгдөл хийнэ.*

| Файл | Юу хийдэг вэ |
|---|---|
| `supabase/01_schema.sql` | 9 хүснэгт, холбоос (FK), шалгалт (CHECK), индекс |
| `supabase/02_auth_trigger.sql` | `auth.users` → `profiles` trigger, сүүлийн админыг хамгаалах, `login_state()` функц |
| `supabase/03_rls.sql` | Бүх хүснэгтэд RLS асааж, 32 дүрэм бичсэн |
| `supabase/04_seed.sql` | Туршилтын өгөгдөл: 2 гэр бүл, 7 хэрэглэгч, ажил, хуваарь, хичээл, захиалга |
| `supabase/05_rls_test.sql` | RLS-ийг 26 тохиолдлоор шалгана (бүгд ROLLBACK, өгөгдөл өөрчлөгдөхгүй) |

---

## 1. Supabase төсөл нээх

1. <https://supabase.com> → **New project**
   - Name: `manai-ger`
   - Region: **Northeast Asia (Tokyo)** эсвэл **Southeast Asia (Singapore)**: Монголд хамгийн ойр
   - Database password: хүчтэй нууц үг үүсгээд багийн нууц газар хадгална
2. **Authentication → Sign In / Providers → Email**
   - **Confirm email**: **унтраана** (бидний имэйл жинхэнэ биш)
   - Minimum password length: **6** хэвээр үлдээнэ
3. **Authentication → Settings → Allow new users to sign up**: **унтраана**
   (Дүрэм 1: гишүүн өөрөө бүртгүүлэхгүй. Админы `auth.admin.createUser` үүнээс үл хамааран ажиллана.)
4. **SQL Editor** дээр файлуудыг дарааллаар нь хуулж **Run** дарна:
   `01_schema` → `02_auth_trigger` → `03_rls` → `04_seed`
5. `05_rls_test.sql`-ийг ажиллуулна. Алдаа гарахгүй бол бүх шалгалт давсан гэсэн үг. Алдаа гарвал `FAIL: ...` мөр аль дүрэм буруу байгааг заана.
6. **Project Settings → API**-аас дараах мэдээллийг багийнханд өгнө:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Гишүүн 1, 3
   - `SUPABASE_SERVICE_ROLE_KEY`: **зөвхөн Гишүүн 3**, зөвхөн Vercel-ийн Environment Variables болон `.env.local` дотор хадгална. Git руу хэзээ ч бүү push хийгээрэй, клиент кодод бүү ашиглаарай.

> Шалгасан: бүх файлыг локал PostgreSQL 16 дээр Supabase-ийн `auth` орчныг дуурайлгаж ажиллуулсан. 26 шалгалт бүгд давсан.

---

## 2. ERD → Supabase хөрвүүлэлт

Java + SQLite хувилбарын ERD-ийг (10 хүснэгт) Supabase-д дараах байдлаар буулгасан:

| ERD (SQLite) | Supabase | Өөрчлөлт |
|---|---|---|
| `families` | `families` | Ижил. Нэр том жижиг үсэг ялгахгүйгээр давхардахгүй |
| `members` | `profiles` | `id` нь `auth.users.id` (uuid). `name`-ийг **`username`** (нэвтрэх нэр, латин, өөрчлөгдөхгүй) ба **`name`** (харагдах нэр, кирилл, засагдана) гэж хоёр хуваасан |
| `members.manual` | `profiles.pin_set` | `manual = 1` нь `pin_set = false` гэсэн үг |
| `pins` | *(хасагдсан)* | PIN-ийг Supabase Auth өөрөө bcrypt-ээр шифрлэж хадгална (Дүрэм 3) |
| `chores`, `chore_days`, `chore_done` | ижил | `mode`: `daily` / `weekly` / `once` |
| `schedule_days`, `lessons`, `plans` | ижил | `lessons` → `schedule_days` (member_id, weekday) холбоос ERD-тэй ижил |
| `shopping` | ижил | `got = true` болгоход `got_by`, `got_at` автоматаар бөглөгдөнө |

**Автоматаар бөглөгдөх баганууд** (клиентээс илгээх шаардлагагүй):
`chores.created_by`, `chore_done.done_by`, `shopping.ordered_by` нь нэвтэрсэн хэрэглэгч.

**Гишүүн устгавал** (ERD-ийн 27-р хуудастай ижил): PIN, хуваарь, хичээл, төлөвлөгөө нь хамт устана. Гэрийн ажил нь «хэнд ч өгөөгүй» болно, захиалгын «хэн захисан» нь хоосорно.

---

## 3. RLS: хэн юу хийж чадах вэ

| Хүснэгт | Харах | Нэмэх | Засах | Устгах |
|---|---|---|---|---|
| families | админ: бүгд · гишүүн: өөрийнх | админ | админ | админ |
| profiles | өөрийгөө + гэр бүл · админ: бүгд | *server* | зөвхөн өөрийн `name`, `hue` | *server* |
| chores / chore_days | гэр бүл | **эцэг эх** | **эцэг эх** | **эцэг эх** |
| chore_done | гэр бүл | гэр бүлийн гишүүн | — | өөрийнхөө тэмдэглэгээ эсвэл эцэг эх |
| schedule_days / plans | гэр бүл | өөрийнх эсвэл анх нэвтрээгүй гишүүнийх | мөн адил | мөн адил |
| lessons | гэр бүл | мөн адил, **зөвхөн хүүхдэд** | мөн адил | мөн адил |
| shopping | гэр бүл | гэр бүлийн гишүүн | гэр бүлийн гишүүн (авсан гэж тэмдэглэх) | өөрийн захиалга эсвэл эцэг эх |

- Админ гэр бүлгүй тул гэрийн ажил, хуваарь, захиалгын хэсэгт юу ч харахгүй (Дүрэм 7).
- Нэвтрээгүй (`anon`) хэрэглэгч ямар ч хүснэгт уншиж чадахгүй. Зөвхөн `login_state()` функцийг дуудна.
- *server* гэдэг нь Гишүүн 3-ын `service_role` түлхүүртэй server action.

---

## 4. Гишүүн 3-т: Login-ийг хэрхэн холбох вэ

Систем нэр + PIN-ээр нэвтэрдэг, харин Supabase Auth имэйл + нууц үг шаарддаг. Иймээс:

```ts
const toEmail    = (username: string) => `${username.trim().toLowerCase()}@manai-ger.local`
const toPassword = (pin: string)      => `mg_${pin}`   // Supabase 6+ тэмдэгт шаарддаг
const PIN_RE     = /^\d{4,8}$/                          // Дүрэм 3
```

**Нэвтрэх хуудас**

```ts
const { data: state } = await supabase.rpc('login_state', { p_username: username })
// 'unknown'  → "Ийм нэр алга"
// 'ok'       → supabase.auth.signInWithPassword({ email: toEmail(u), password: toPassword(pin) })
// 'need_pin' → PIN үүсгэх цонх → доорх server action → дараа нь signInWithPassword
```

**Анх нэвтрэхдээ PIN үүсгэх** (server action, `supabaseAdmin` = service_role client)

```ts
const { data: p } = await supabaseAdmin.from('profiles')
  .select('id, pin_set').eq('username', u.toLowerCase()).single()
if (p && !p.pin_set && PIN_RE.test(pin)) {
  await supabaseAdmin.auth.admin.updateUserById(p.id, { password: toPassword(pin) })
  await supabaseAdmin.from('profiles').update({ pin_set: true }).eq('id', p.id)
}
```

**Админы үйлдлүүд** (server action. Эхлээд дуудаж буй хүн `role = 'admin'` эсэхийг шалгана!)

```ts
// Гишүүн үүсгэх (UC09)
await supabaseAdmin.auth.admin.createUser({
  email: toEmail(username),
  password: crypto.randomUUID(),        // PIN-ийг гишүүн анх нэвтрэхдээ өөрөө үүсгэнэ
  email_confirm: true,
  app_metadata:  { username, role, family_id },   // role: 'parent' | 'child'
  user_metadata: { name },
})

// PIN шинэчлэх (UC12)
await supabaseAdmin.auth.admin.updateUserById(id, { password: crypto.randomUUID() })
await supabaseAdmin.from('profiles').update({ pin_set: false }).eq('id', id)

// Бүртгэл устгах (UC13). id !== өөрийн id эсэхийг шалгана
await supabaseAdmin.auth.admin.deleteUser(id)
```

- `username` нь зөвхөн жижиг латин үсэг, тоо, `_` ба `.` байна (3–30 тэмдэгт). Жишээ: `bat_eej`.
- Төлөвлөгөөнд байгаа «нууц үг сэргээх» нь манай системд **админ PIN шинэчлэх** гэсэн үг (имэйл илгээхгүй).
- TypeScript төрлүүд: `npx supabase gen types typescript --project-id <id> > types/database.ts`

---

## 5. Туршилтын хэрэглэгчид

Бүгдийн PIN нь **1234**.

| Нэвтрэх нэр | Нэр | Үүрэг | Гэр бүл |
|---|---|---|---|
| `admin` | Админ | админ | — |
| `bat_aav` | Аав | эцэг эх | Батын гэр |
| `bat_eej` | Ээж | эцэг эх | Батын гэр |
| `bat_tuvshin` | Түвшин | хүүхэд | Батын гэр |
| `bat_saraa` | Сараа | хүүхэд | Батын гэр · **анх нэвтрээгүй** (PIN үүсгэх урсгалыг турших) |
| `dorj_eej` | Ээж | эцэг эх | Дорждын гэр |
| `dorj_temuulen` | Тэмүүлэн | хүүхэд | Дорждын гэр |

Дорждын гэр нь гэр бүлүүд бие биенийхээ мэдээллийг харахгүй байгааг шалгахад зориулагдсан.

---

## 6. 6-р долоо хоногт: туршилтын өгөгдлийг цэвэрлэх

Эхлээд жинхэнэ админы бүртгэлийг үүсгэнэ (сүүлийн админыг устгах боломжгүй). Дараа нь:

```sql
delete from public.families where name in ('Батын гэр', 'Дорждын гэр');
delete from auth.users where id::text like '00000000-0000-4000-a000-%';
```

Нөөц хуулбар: **Database → Backups**, эсвэл `supabase db dump`.

---

## Ажлын самбарт оруулах (1-р долоо хоног, Гишүүн 2)

- [ ] Supabase төсөл нээж, Auth тохиргоо хийх (1-р хэсэг, 1–3)
- [ ] `01_schema.sql`: хүснэгт ба холбоос
- [ ] `02_auth_trigger.sql`: profiles trigger
- [ ] `03_rls.sql`: RLS дүрэм
- [ ] `04_seed.sql`: туршилтын өгөгдөл
- [ ] `05_rls_test.sql`: шалгалт давсан эсэх
- [ ] URL / түлхүүрүүдийг Гишүүн 1, 3-т өгөх; 4-р хэсгийг Гишүүн 3-тай хамт уншиж ярилцах
- [ ] `supabase/` хавтсыг өөрийн branch-ээр repo-д оруулж Pull Request нээх
