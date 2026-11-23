-- =====================================================================
--  «Манай гэр» — 06_week2_queries.sql
--  2-р долоо хоног · Гишүүн 2: унших ба нэмэх query-нүүд
--
--  Бүх функц SECURITY INVOKER (анхдагч) — өөрөөр хэлбэл дуудсан хүний
--  эрхээр ажиллаж, 03_rls.sql-ийн RLS дүрмүүд бүрэн үйлчилнэ.
--  Frontend-ээс:  supabase.rpc('функцийн_нэр', { параметр })
--
--  ⚠ ОГНОО: Supabase сервер UTC цагаар ажилладаг (Монгол = UTC+8).
--    Өглөө 08:00-аас өмнө current_date нь өчигдөр байна. Тиймээс огноог
--    ҮРГЭЛЖ хөтчөөс 'YYYY-MM-DD' хэлбэрээр дамжуулна (lib/db/queries.ts → toISODate).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Дэлгүүрийн захиалга нэмэхэд family_id-г автоматаар бөглөнө
--    (frontend зөвхөн { text, qty } илгээхэд хангалттай)
-- ---------------------------------------------------------------------
alter table public.shopping alter column family_id set default private.my_family_id();

-- ---------------------------------------------------------------------
-- 1. me() — нэвтэрсэн хэрэглэгч + гэр бүлийн нэр            (бүх хуудас)
-- ---------------------------------------------------------------------
create or replace function public.me()
returns table (
  id uuid, username text, name text, role text,
  family_id bigint, family_name text, hue smallint, pin_set boolean
)
language sql stable set search_path = '' as $$
  select p.id, p.username, p.name, p.role, p.family_id, f.name, p.hue, p.pin_set
    from public.profiles p
    left join public.families f on f.id = p.family_id
   where p.id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 2. family_members() — миний гэр бүлийн гишүүд             (сонголтын жагсаалт)
-- ---------------------------------------------------------------------
create or replace function public.family_members()
returns table (id uuid, name text, role text, hue smallint, pin_set boolean)
language sql stable set search_path = '' as $$
  select p.id, p.name, p.role, p.hue, p.pin_set
    from public.profiles p
   where p.family_id = (select family_id from public.profiles where id = auth.uid())
   order by case p.role when 'parent' then 0 else 1 end, p.name;
$$;

-- ---------------------------------------------------------------------
-- 3. chores_for_day(date) — тухайн өдөр хийх ажлууд        (UC03 Нүүр хуудас)
--    өдөр бүрийн + тэр гарагийн + тэр өдрийн нэг удаагийн ажил,
--    хийгдсэн эсэх, хэн хийсэн.
-- ---------------------------------------------------------------------
create or replace function public.chores_for_day(p_date date)
returns table (
  chore_id bigint, title text, mode text,
  member_id uuid, member_name text, member_hue smallint,
  done boolean, done_by uuid, done_by_name text
)
language sql stable set search_path = '' as $$
  select c.id, c.title, c.mode,
         c.member_id, m.name, m.hue,
         d.chore_id is not null, d.done_by, db.name
    from public.chores c
    left join public.profiles   m  on m.id = c.member_id
    left join public.chore_done d  on d.chore_id = c.id and d.done_date = p_date
    left join public.profiles   db on db.id = d.done_by
   where c.family_id = (select family_id from public.profiles where id = auth.uid())
     and (   c.mode = 'daily'
          or (c.mode = 'once'   and c.once_date = p_date)
          or (c.mode = 'weekly' and exists (
                select 1 from public.chore_days cd
                 where cd.chore_id = c.id
                   and cd.weekday = extract(isodow from p_date)::smallint)))
   order by d.chore_id is not null,          -- хийгдээгүй нь эхэнд
            coalesce(c.member_id = auth.uid(), false) desc,  -- миний ажил эхэнд
            c.title;
$$;

-- ---------------------------------------------------------------------
-- 4. family_chores() — гэр бүлийн бүх ажил                 (Гэрийн ажил хуудас)
-- ---------------------------------------------------------------------
create or replace function public.family_chores()
returns table (
  chore_id bigint, title text, mode text, once_date date, weekdays smallint[],
  member_id uuid, member_name text, member_hue smallint,
  created_by uuid, created_by_name text, created_at timestamptz
)
language sql stable set search_path = '' as $$
  select c.id, c.title, c.mode, c.once_date,
         coalesce((select array_agg(cd.weekday order by cd.weekday)
                     from public.chore_days cd where cd.chore_id = c.id), '{}'),
         c.member_id, m.name, m.hue,
         c.created_by, cb.name, c.created_at
    from public.chores c
    left join public.profiles m  on m.id  = c.member_id
    left join public.profiles cb on cb.id = c.created_by
   where c.family_id = (select family_id from public.profiles where id = auth.uid())
   order by m.name nulls last, c.title;
$$;

-- ---------------------------------------------------------------------
-- 5. add_chore(...) — гэрийн ажил өгөх                     (UC Гэрийн ажил өгөх)
--    Нэг эсвэл хэд хэдэн гишүүнд: гишүүн тус бүрд нэг мөр үүснэ.
--    Дүрэм 9: нэр, дор хаяж нэг гишүүн; гарагаар бол ≥1 гараг; нэг удаагийнх бол огноо.
--    Буцаах утга: үүссэн ажлуудын id.
-- ---------------------------------------------------------------------
create or replace function public.add_chore(
  p_title      text,
  p_member_ids uuid[],
  p_mode       text,
  p_once_date  date       default null,
  p_weekdays   smallint[] default null
)
returns bigint[]
language plpgsql set search_path = '' as $$
declare
  v_family bigint;
  v_role   text;
  v_member uuid;
  v_id     bigint;
  v_ids    bigint[] := '{}';
begin
  select family_id, role into v_family, v_role from public.profiles where id = auth.uid();

  if v_role is distinct from 'parent' then
    raise exception using errcode = '42501', message = 'Гэрийн ажлыг зөвхөн эцэг эх өгнө';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception using errcode = '22023', message = 'Ажлын нэрийг оруулна уу';
  end if;
  if coalesce(cardinality(p_member_ids), 0) = 0 then
    raise exception using errcode = '22023', message = 'Дор хаяж нэг гишүүн сонгоно уу';
  end if;
  if p_mode not in ('daily', 'weekly', 'once') or p_mode is null then
    raise exception using errcode = '22023', message = 'Давтамж буруу байна (daily / weekly / once)';
  end if;
  if p_mode = 'weekly' and (coalesce(cardinality(p_weekdays), 0) = 0
                            or exists (select 1 from unnest(p_weekdays) w where w not between 1 and 7)) then
    raise exception using errcode = '22023', message = 'Дор хаяж нэг гараг сонгоно уу';
  end if;
  if p_mode = 'once' and p_once_date is null then
    raise exception using errcode = '22023', message = 'Нэг удаагийн ажлын огноог сонгоно уу';
  end if;

  foreach v_member in array (select array_agg(distinct x) from unnest(p_member_ids) x) loop
    insert into public.chores (title, member_id, mode, once_date, family_id)
    values (trim(p_title), v_member, p_mode,
            case when p_mode = 'once' then p_once_date end, v_family)
    returning id into v_id;

    if p_mode = 'weekly' then
      insert into public.chore_days (chore_id, weekday)
      select v_id, w from (select distinct unnest(p_weekdays) as w) t;
    end if;

    v_ids := v_ids || v_id;
  end loop;

  return v_ids;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. toggle_chore_done(chore, date) — «хийсэн» чагт дарах / болиулах
--    Буцаах утга: шинэ төлөв (true = хийсэн).
-- ---------------------------------------------------------------------
create or replace function public.toggle_chore_done(p_chore_id bigint, p_date date)
returns boolean
language plpgsql set search_path = '' as $$
declare
  n int;
begin
  if p_date is null then
    raise exception using errcode = '22023', message = 'Огноо дамжуулна уу';
  end if;

  if exists (select 1 from public.chore_done where chore_id = p_chore_id and done_date = p_date) then
    delete from public.chore_done where chore_id = p_chore_id and done_date = p_date;
    get diagnostics n = row_count;
    if n = 0 then
      raise exception using errcode = '42501',
        message = 'Бусдын тэмдэглэгээг зөвхөн эцэг эх болиулна';
    end if;
    return false;
  end if;

  insert into public.chore_done (chore_id, done_date) values (p_chore_id, p_date);
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. shopping_list(include_got) — дэлгүүрийн захиалга       (Нүүр, Дэлгүүр хуудас)
-- ---------------------------------------------------------------------
create or replace function public.shopping_list(p_include_got boolean default false)
returns table (
  id bigint, text text, qty text,
  ordered_by uuid, ordered_by_name text,
  got boolean, got_by uuid, got_by_name text, got_at timestamptz, created_at timestamptz
)
language sql stable set search_path = '' as $$
  select s.id, s.text, s.qty,
         s.ordered_by, ob.name,
         s.got, s.got_by, gb.name, s.got_at, s.created_at
    from public.shopping s
    left join public.profiles ob on ob.id = s.ordered_by
    left join public.profiles gb on gb.id = s.got_by
   where s.family_id = (select family_id from public.profiles where id = auth.uid())
     and (p_include_got or not s.got)
   order by s.got, s.created_at desc;
$$;

-- ---------------------------------------------------------------------
-- 8. plans_for_day(date, member) — тарсны дараах ажил       (Нүүр: «Миний төлөвлөгөө»)
--    p_member_id = null бол гэр бүлийн бүх гишүүнийх.
-- ---------------------------------------------------------------------
create or replace function public.plans_for_day(p_date date, p_member_id uuid default null)
returns table (
  id bigint, member_id uuid, member_name text,
  plan_date date, from_time time, to_time time, text text
)
language sql stable set search_path = '' as $$
  select pl.id, pl.member_id, p.name, pl.plan_date, pl.from_time, pl.to_time, pl.text
    from public.plans pl
    join public.profiles p on p.id = pl.member_id
   where pl.plan_date = p_date
     and (p_member_id is null or pl.member_id = p_member_id)
     and p.family_id = (select family_id from public.profiles where id = auth.uid())
   order by pl.from_time, p.name;
$$;

-- ---------------------------------------------------------------------
-- 9. family_day_schedule(weekday) — сонгосон гарагт хэн хэзээ тарах вэ  (Хуваарь хуудас)
--    Сурагч тарах цаг оруулаагүй бол сүүлийн хичээлийн дуусах цагаар тооцно (Дүрэм 11).
--    place = null бол тухайн гарагт хуваарь оруулаагүй.
-- ---------------------------------------------------------------------
create or replace function public.family_day_schedule(p_weekday smallint)
returns table (
  member_id uuid, name text, role text, hue smallint, pin_set boolean,
  place text, start_time time, end_time time, lesson_count int, note text
)
language sql stable set search_path = '' as $$
  select p.id, p.name, p.role, p.hue, p.pin_set,
         sd.place,
         coalesce(sd.start_time, l.first_start),
         coalesce(sd.end_time,   l.last_end),
         coalesce(l.cnt, 0)::int,
         sd.note
    from public.profiles p
    left join public.schedule_days sd
           on sd.member_id = p.id and sd.weekday = p_weekday
    left join lateral (
           select count(*) as cnt, min(ls.start_time) as first_start, max(ls.end_time) as last_end
             from public.lessons ls
            where ls.member_id = p.id and ls.weekday = p_weekday) l on true
   where p.family_id = (select family_id from public.profiles where id = auth.uid())
   order by coalesce(sd.end_time, l.last_end) nulls last, p.name;
$$;

-- ---------------------------------------------------------------------
-- 10. member_week(member) — нэг гишүүний 7 хоногийн хуваарь + хичээлүүд  (Профайл / Хуваарь засах)
-- ---------------------------------------------------------------------
create or replace function public.member_week(p_member_id uuid)
returns table (
  weekday smallint, place text, start_time time, end_time time, note text, lessons jsonb
)
language sql stable set search_path = '' as $$
  select g.wd::smallint, sd.place, sd.start_time, sd.end_time, sd.note,
         coalesce((select jsonb_agg(jsonb_build_object(
                            'id', ls.id, 'name', ls.name, 'room', ls.room, 'teacher', ls.teacher,
                            'start_time', to_char(ls.start_time, 'HH24:MI'),
                            'end_time',   to_char(ls.end_time,   'HH24:MI'))
                          order by ls.start_time)
                     from public.lessons ls
                    where ls.member_id = p_member_id and ls.weekday = g.wd), '[]'::jsonb)
    from generate_series(1, 7) as g(wd)
    left join public.schedule_days sd
           on sd.member_id = p_member_id and sd.weekday = g.wd
   where exists (                                   -- зөвхөн өөрийн гэр бүлийн гишүүн
           select 1 from public.profiles p
            where p.id = p_member_id
              and p.family_id = (select family_id from public.profiles where id = auth.uid()))
   order by g.wd;
$$;

-- ---------------------------------------------------------------------
-- Эрх: зөвхөн нэвтэрсэн хэрэглэгч дуудна
-- ---------------------------------------------------------------------
revoke all on function public.me()                                         from public, anon;
revoke all on function public.family_members()                             from public, anon;
revoke all on function public.chores_for_day(date)                         from public, anon;
revoke all on function public.family_chores()                              from public, anon;
revoke all on function public.add_chore(text, uuid[], text, date, smallint[]) from public, anon;
revoke all on function public.toggle_chore_done(bigint, date)              from public, anon;
revoke all on function public.shopping_list(boolean)                       from public, anon;
revoke all on function public.plans_for_day(date, uuid)                    from public, anon;
revoke all on function public.family_day_schedule(smallint)                from public, anon;
revoke all on function public.member_week(uuid)                            from public, anon;

grant execute on function public.me()                                         to authenticated;
grant execute on function public.family_members()                             to authenticated;
grant execute on function public.chores_for_day(date)                         to authenticated;
grant execute on function public.family_chores()                              to authenticated;
grant execute on function public.add_chore(text, uuid[], text, date, smallint[]) to authenticated;
grant execute on function public.toggle_chore_done(bigint, date)              to authenticated;
grant execute on function public.shopping_list(boolean)                       to authenticated;
grant execute on function public.plans_for_day(date, uuid)                    to authenticated;
grant execute on function public.family_day_schedule(smallint)                to authenticated;
grant execute on function public.member_week(uuid)                            to authenticated;
