-- =====================================================================
--  «Манай гэр» — 07_week2_test.sql
--  2-р долоо хоног: унших/нэмэх функцууд ба RLS — хэн юуг харж, нэмж чадах вэ
--  06_week2_queries.sql-ийн дараа ажиллуулна. Бүгд ROLLBACK — өгөгдөл өөрчлөгдөхгүй.
--  Алдаагүй дуусвал бүх шалгалт давсан. Алдаа гарвал "FAIL: ..." мөр шалтгааныг заана.
-- =====================================================================

begin;

-- =====================================================================
-- А. Түвшин (хүүхэд, Батын гэр) — УНШИХ
-- =====================================================================
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000013","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  v_tomorrow date := current_date + 1;
  v_expect   int;
begin
  -- me()
  if (select family_name from public.me()) <> 'Батын гэр' then raise exception 'FAIL: me() гэр бүлийн нэр'; end if;
  if (select count(*) from public.me()) <> 1 then raise exception 'FAIL: me() нэг мөр буцаах ёстой'; end if;

  -- family_members(): Батын гэрийн 4 гишүүн, Дорждынх харагдахгүй
  if (select count(*) from public.family_members()) <> 4 then raise exception 'FAIL: family_members() 4 гишүүн'; end if;

  -- chores_for_day(): маргааш = өдөр бүрийн 1 + нэг удаагийн 2 + (Да/Лх/Ба бол Хог гаргах 1)
  v_expect := 3 + case when extract(isodow from v_tomorrow) in (1, 3, 5) then 1 else 0 end;
  if (select count(*) from public.chores_for_day(v_tomorrow)) <> v_expect then
    raise exception 'FAIL: chores_for_day(маргааш) % мөр байх ёстой', v_expect; end if;
  -- өнөөдөр «Аяга угаах» хийгдсэн, Түвшин хийсэн
  if not (select done and done_by_name = 'Түвшин' from public.chores_for_day(current_date) where chore_id = 1) then
    raise exception 'FAIL: chores_for_day() хийсэн төлөв'; end if;
  -- хийгдээгүй нь эхэнд эрэмбэлэгдэнэ
  if (select bool_or(done) from (select done from public.chores_for_day(current_date) limit 1) t) then
    raise exception 'FAIL: chores_for_day() хийгдээгүй ажил эхэнд байх ёстой'; end if;
  raise notice 'OK: chores_for_day() — тухайн өдрийн ажил, хийсэн төлөв зөв';

  -- family_chores(): 4 ажил, «Хог гаргах»-ийн гарагууд {1,3,5}
  if (select count(*) from public.family_chores()) <> 4 then raise exception 'FAIL: family_chores() 4 ажил'; end if;
  if (select weekdays from public.family_chores() where chore_id = 2) <> '{1,3,5}'::smallint[] then
    raise exception 'FAIL: family_chores() гарагууд'; end if;
  raise notice 'OK: family_chores() — гэр бүлийн бүх ажил гарагтайгаа';

  -- shopping_list()
  if (select count(*) from public.shopping_list()) <> 2 then raise exception 'FAIL: shopping_list() аваагүй 2'; end if;
  if (select count(*) from public.shopping_list(true)) <> 3 then raise exception 'FAIL: shopping_list(true) бүгд 3'; end if;
  if (select got_by_name from public.shopping_list(true) where text = 'Талх') <> 'Аав' then
    raise exception 'FAIL: shopping_list() got_by_name'; end if;
  raise notice 'OK: shopping_list() — аваагүй / бүх захиалга, хэн захисан, хэн авсан';

  -- plans_for_day()
  if (select count(*) from public.plans_for_day(current_date)) <> 2 then raise exception 'FAIL: plans_for_day() гэр бүл 2'; end if;
  if (select count(*) from public.plans_for_day(current_date, auth.uid())) <> 1 then raise exception 'FAIL: plans_for_day() миний 1'; end if;
  if (select count(*) from public.plans_for_day(current_date, '00000000-0000-4000-a000-000000000022')) <> 0 then
    raise exception 'FAIL: өөр гэрийн төлөвлөгөө харагдлаа'; end if;
  raise notice 'OK: plans_for_day() — өөрийн / гэр бүлийн төлөвлөгөө';

  -- family_day_schedule(): Даваа — Түвшин хамгийн эрт тарна (сүүлийн хичээл 12:20)
  if (select end_time from public.family_day_schedule(1::smallint) where name = 'Түвшин') <> '12:20' then
    raise exception 'FAIL: тарах цагийг хичээлээс тооцсонгүй (Дүрэм 11)'; end if;
  if (select name from public.family_day_schedule(1::smallint) limit 1) <> 'Түвшин' then
    raise exception 'FAIL: family_day_schedule() эрт тарах нь эхэнд'; end if;
  if (select count(*) from public.family_day_schedule(1::smallint)) <> 4 then
    raise exception 'FAIL: family_day_schedule() 4 гишүүн'; end if;
  raise notice 'OK: family_day_schedule() — хэн хэзээ тарах, хичээлээс тооцох';

  -- member_week(): 7 мөр, Даваа 3 хичээл; өөр гэрийн гишүүнийх хоосон
  if (select count(*) from public.member_week(auth.uid())) <> 7 then raise exception 'FAIL: member_week() 7 өдөр'; end if;
  if (select jsonb_array_length(lessons) from public.member_week(auth.uid()) where weekday = 1) <> 3 then
    raise exception 'FAIL: member_week() Даваагийн хичээл'; end if;
  if (select count(*) from public.member_week('00000000-0000-4000-a000-000000000022')) <> 0 then
    raise exception 'FAIL: өөр гэрийн хүний хуваарь харагдлаа'; end if;
  raise notice 'OK: member_week() — 7 хоногийн хуваарь, хичээлүүд';
end $$;

-- =====================================================================
-- Б. Түвшин (хүүхэд) — НЭМЭХ
-- =====================================================================
do $$
declare v boolean;
begin
  -- Хүүхэд ажил өгч чадахгүй
  begin
    perform public.add_chore('Тест', array['00000000-0000-4000-a000-000000000013']::uuid[], 'daily');
    raise exception 'FAIL: хүүхэд ажил өглөө';
  exception when insufficient_privilege then
    raise notice 'OK: add_chore() — хүүхэд ажил өгч чадахгүй';
  end;

  -- Чагт дарах / болиулах
  v := public.toggle_chore_done(1, current_date + 1);
  if v is distinct from true then raise exception 'FAIL: toggle → true'; end if;
  v := public.toggle_chore_done(1, current_date + 1);
  if v is distinct from false then raise exception 'FAIL: toggle → false'; end if;
  raise notice 'OK: toggle_chore_done() — хийсэн / болиулах';

  -- Ээжийн тэмдэглэсэн чагтыг хүүхэд болиулж чадахгүй
  insert into public.chore_done (chore_id, done_date, done_by)
  values (2, current_date + 7, '00000000-0000-4000-a000-000000000012');
  begin
    perform public.toggle_chore_done(2, current_date + 7);
    raise exception 'FAIL: хүүхэд ээжийн тэмдэглэгээг болиулав';
  exception when insufficient_privilege then
    raise notice 'OK: бусдын тэмдэглэгээг хүүхэд болиулж чадахгүй';
  end;

  -- Өөр гэрийн ажлыг тэмдэглэхгүй
  begin
    perform public.toggle_chore_done(5, current_date);
    raise exception 'FAIL: өөр гэрийн ажлыг тэмдэглэв';
  exception when insufficient_privilege then
    raise notice 'OK: өөр гэрийн ажлыг тэмдэглэхгүй';
  end;

  -- Дэлгүүр: нэмэх (ordered_by, family_id автоматаар)
  insert into public.shopping (text, qty) values ('Жимс', '1 кг');
  if (select ordered_by_name from public.shopping_list() where text = 'Жимс') <> 'Түвшин' then
    raise exception 'FAIL: захиалга нэмэх'; end if;
  begin
    insert into public.shopping (text, family_id) values ('Тест', 2);
    raise exception 'FAIL: өөр гэрт захиалга нэмэв';
  exception when insufficient_privilege then
    raise notice 'OK: захиалга нэмэх — зөвхөн өөрийн гэрт';
  end;

  -- Төлөвлөгөө: өөртөө OK, анх нэвтрээгүй Сараад OK, PIN-тэй ээжид болохгүй
  insert into public.plans (member_id, plan_date, from_time, text)
  values ('00000000-0000-4000-a000-000000000013', current_date + 1, '16:00', 'Шатар');
  insert into public.plans (member_id, plan_date, from_time, text)
  values ('00000000-0000-4000-a000-000000000014', current_date + 1, '16:00', 'Бүжиг');
  begin
    insert into public.plans (member_id, plan_date, from_time, text)
    values ('00000000-0000-4000-a000-000000000012', current_date + 1, '16:00', 'Тест');
    raise exception 'FAIL: ээжийн төлөвлөгөө нэмэв';
  exception when insufficient_privilege then
    raise notice 'OK: төлөвлөгөө — өөртөө болон анх нэвтрээгүй гишүүнд нэмнэ';
  end;

  -- Хуваарь upsert + хичээл
  insert into public.schedule_days (member_id, weekday, place, start_time)
  values ('00000000-0000-4000-a000-000000000013', 6, 'school', '09:00')
  on conflict (member_id, weekday) do update set place = excluded.place, start_time = excluded.start_time;
  insert into public.lessons (member_id, weekday, start_time, end_time, name)
  values ('00000000-0000-4000-a000-000000000013', 6, '09:00', '10:20', 'Нэмэлт хичээл');
  if (select end_time from public.family_day_schedule(6::smallint) where name = 'Түвшин') <> '10:20' then
    raise exception 'FAIL: шинэ хичээлээр тарах цаг шинэчлэгдсэнгүй'; end if;
  raise notice 'OK: хуваарь, хичээл нэмэх (upsert)';
end $$;

-- =====================================================================
-- В. Ээж (эцэг эх) — add_chore
-- =====================================================================
reset role;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000012","role":"authenticated"}', true);
set local role authenticated;

do $$
declare ids bigint[];
begin
  -- Хоёр гишүүнд, Мягмар/Пүрэв гарагт
  ids := public.add_chore('  Цэцэг услах ',
           array['00000000-0000-4000-a000-000000000013','00000000-0000-4000-a000-000000000014']::uuid[],
           'weekly', null, array[2,4,4]::smallint[]);
  if cardinality(ids) <> 2 then raise exception 'FAIL: 2 гишүүнд 2 ажил үүсэх ёстой'; end if;
  if (select count(*) from public.chore_days where chore_id = any(ids)) <> 4 then
    raise exception 'FAIL: гараг давхардсан эсвэл дутуу'; end if;
  if (select title from public.chores where id = ids[1]) <> 'Цэцэг услах' then
    raise exception 'FAIL: нэрийн хоосон зайг арилгасангүй'; end if;
  if (select created_by from public.chores where id = ids[1]) <> auth.uid() then
    raise exception 'FAIL: created_by'; end if;
  raise notice 'OK: add_chore() — хэд хэдэн гишүүнд, гарагтай';

  ids := public.add_chore('Машин угаах', array['00000000-0000-4000-a000-000000000011']::uuid[], 'once', current_date + 3);
  if (select once_date from public.chores where id = ids[1]) <> current_date + 3 then
    raise exception 'FAIL: нэг удаагийн огноо'; end if;
  ids := public.add_chore('Ор засах', array['00000000-0000-4000-a000-000000000013']::uuid[], 'daily', current_date, array[1]::smallint[]);
  if (select once_date from public.chores where id = ids[1]) is not null
     or exists (select 1 from public.chore_days where chore_id = ids[1]) then
    raise exception 'FAIL: өдөр бүрийн ажилд огноо/гараг хадгалагдлаа'; end if;
  raise notice 'OK: add_chore() — нэг удаагийн, өдөр бүрийн';

  -- Дүрэм 9 шалгалтууд
  begin perform public.add_chore('', array['00000000-0000-4000-a000-000000000013']::uuid[], 'daily');
        raise exception 'FAIL: хоосон нэр';
  exception when invalid_parameter_value then null; end;
  begin perform public.add_chore('Тест', '{}'::uuid[], 'daily');
        raise exception 'FAIL: гишүүнгүй';
  exception when invalid_parameter_value then null; end;
  begin perform public.add_chore('Тест', array['00000000-0000-4000-a000-000000000013']::uuid[], 'weekly');
        raise exception 'FAIL: гараггүй';
  exception when invalid_parameter_value then null; end;
  begin perform public.add_chore('Тест', array['00000000-0000-4000-a000-000000000013']::uuid[], 'weekly', null, array[8]::smallint[]);
        raise exception 'FAIL: 8-р гараг';
  exception when invalid_parameter_value then null; end;
  begin perform public.add_chore('Тест', array['00000000-0000-4000-a000-000000000013']::uuid[], 'once');
        raise exception 'FAIL: огноогүй нэг удаагийн';
  exception when invalid_parameter_value then null; end;
  begin perform public.add_chore('Тест', array['00000000-0000-4000-a000-000000000013']::uuid[], 'monthly');
        raise exception 'FAIL: буруу давтамж';
  exception when invalid_parameter_value then null; end;
  raise notice 'OK: add_chore() — Дүрэм 9-ийн бүх шалгалт';

  -- Өөр гэрийн хүүхдэд ажил өгөхгүй
  begin
    perform public.add_chore('Тест', array['00000000-0000-4000-a000-000000000022']::uuid[], 'daily');
    raise exception 'FAIL: өөр гэрийн хүүхдэд ажил өглөө';
  exception when insufficient_privilege then
    raise notice 'OK: add_chore() — өөр гэрийн хүнд өгөхгүй';
  end;

  -- Эцэг эх хүүхдийн тэмдэглэгээг болиулж чадна
  if public.toggle_chore_done(1, current_date) is distinct from false then
    raise exception 'FAIL: эцэг эх тэмдэглэгээг болиулсангүй'; end if;
  raise notice 'OK: эцэг эх хүүхдийн тэмдэглэгээг болиулна';
end $$;

-- =====================================================================
-- Г. Админ — гэр бүлийн хэсэгт юу ч харахгүй, нэмэхгүй
-- =====================================================================
reset role;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  if (select count(*) from public.family_members()) <> 0
     or (select count(*) from public.chores_for_day(current_date)) <> 0
     or (select count(*) from public.shopping_list(true)) <> 0
     or (select count(*) from public.family_day_schedule(1::smallint)) <> 0 then
    raise exception 'FAIL: админд гэр бүлийн өгөгдөл харагдлаа'; end if;
  if (select role from public.me()) <> 'admin' then raise exception 'FAIL: админы me()'; end if;
  begin
    perform public.add_chore('Тест', array['00000000-0000-4000-a000-000000000013']::uuid[], 'daily');
    raise exception 'FAIL: админ ажил өглөө';
  exception when insufficient_privilege then
    raise notice 'OK: админ гэр бүлийн хэсгийг харахгүй, ажил өгөхгүй';
  end;
end $$;

-- =====================================================================
-- Д. Нэвтрээгүй (anon) — функц дуудаж чадахгүй
-- =====================================================================
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$
begin
  begin
    perform public.chores_for_day(current_date);
    raise exception 'FAIL: anon функц дуудав';
  exception when insufficient_privilege then
    raise notice 'OK: нэвтрээгүй хүн функц дуудаж чадахгүй';
  end;
  raise notice '==== 2-Р ДОЛОО ХОНОГИЙН БҮХ ШАЛГАЛТ АМЖИЛТТАЙ ====';
end $$;

rollback;
