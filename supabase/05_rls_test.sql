-- =====================================================================
--  «Манай гэр» — 05_rls_test.sql : RLS дүрмийг шалгах
--  04_seed.sql-ийн дараа SQL Editor дээр ажиллуулна.
--  Бүгд ROLLBACK хийгддэг тул өгөгдөл өөрчлөгдөхгүй.
--  Амжилттай бол "OK: ..." мөрүүд гарна, алдаа бол "FAIL: ..." гэж зогсоно.
-- =====================================================================

begin;

-- =====================================================================
-- 1. Түвшин (хүүхэд, Батын гэр)
-- =====================================================================
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000013","role":"authenticated"}', true);
set local role authenticated;

do $$
declare n int;
begin
  -- Харах
  if (select count(*) from public.chores) <> 4 then raise exception 'FAIL: хүүхэд 4 ажил харах ёстой'; end if;
  if exists (select 1 from public.chores where family_id = 2) then raise exception 'FAIL: өөр гэр бүлийн ажил харагдлаа'; end if;
  if (select count(*) from public.profiles) <> 4 then raise exception 'FAIL: зөвхөн 4 гэр бүлийн гишүүн харах ёстой'; end if;
  if (select count(*) from public.families) <> 1 then raise exception 'FAIL: зөвхөн өөрийн гэр бүлийг харах ёстой'; end if;
  if (select count(*) from public.shopping) <> 3 then raise exception 'FAIL: 3 захиалга харах ёстой'; end if;
  if exists (select 1 from public.plans where member_id = '00000000-0000-4000-a000-000000000022') then
    raise exception 'FAIL: өөр гэр бүлийн төлөвлөгөө харагдлаа'; end if;
  raise notice 'OK: хүүхэд зөвхөн өөрийн гэр бүлийн мэдээллийг харна';

  -- Гэрийн ажил өгөх боломжгүй
  begin
    insert into public.chores (title, member_id, mode, family_id)
    values ('Тест', '00000000-0000-4000-a000-000000000013', 'daily', 1);
    raise exception 'FAIL: хүүхэд гэрийн ажил өглөө';
  exception when insufficient_privilege then
    raise notice 'OK: хүүхэд гэрийн ажил өгч чадахгүй';
  end;

  update public.chores set title = 'Хакердсан' where id = 1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: хүүхэд ажил засав'; end if;
  delete from public.chores where id = 1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: хүүхэд ажил устгав'; end if;
  raise notice 'OK: хүүхэд ажил засаж, устгаж чадахгүй';

  -- Хийсэн гэж тэмдэглэх
  insert into public.chore_done (chore_id, done_date) values (3, current_date);
  if (select done_by from public.chore_done where chore_id = 3 and done_date = current_date)
     <> '00000000-0000-4000-a000-000000000013' then raise exception 'FAIL: done_by автоматаар бөглөгдсөнгүй'; end if;
  delete from public.chore_done where chore_id = 3 and done_date = current_date;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: өөрийн тэмдэглэгээг болиулж чадсангүй'; end if;
  raise notice 'OK: хүүхэд ажлыг хийсэн гэж тэмдэглэж, болиулна';

  begin
    insert into public.chore_done (chore_id, done_date) values (5, current_date);
    raise exception 'FAIL: өөр гэр бүлийн ажлыг тэмдэглэв';
  exception when insufficient_privilege then
    raise notice 'OK: өөр гэр бүлийн ажлыг тэмдэглэж чадахгүй';
  end;

  -- Хуваарь, хичээл
  insert into public.lessons (member_id, weekday, start_time, end_time, name)
  values ('00000000-0000-4000-a000-000000000013', 4, '09:30', '10:50', 'Газарзүй');
  raise notice 'OK: хүүхэд өөртөө хичээл нэмнэ';

  insert into public.schedule_days (member_id, weekday, place, start_time, end_time)
  values ('00000000-0000-4000-a000-000000000014', 1, 'school', '13:00', '17:00');
  raise notice 'OK: анх нэвтрээгүй Сараагийн хуваарийг оруулж болно';

  update public.schedule_days set end_time = '23:00'
   where member_id = '00000000-0000-4000-a000-000000000012';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: хүүхэд ээжийнхээ хуваарийг засав'; end if;
  raise notice 'OK: PIN-тэй гишүүний хуваарийг бусад засаж чадахгүй';

  -- Дэлгүүр
  insert into public.shopping (text, qty, family_id) values ('Чихэр', '1', 1);
  if (select ordered_by from public.shopping where text = 'Чихэр')
     <> '00000000-0000-4000-a000-000000000013' then raise exception 'FAIL: ordered_by автоматаар бөглөгдсөнгүй'; end if;
  update public.shopping set got = true where text = 'Сүү';
  if (select got_by from public.shopping where text = 'Сүү')
     <> '00000000-0000-4000-a000-000000000013' then raise exception 'FAIL: got_by автоматаар бөглөгдсөнгүй'; end if;
  delete from public.shopping where text = 'Сүү';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: хүүхэд бусдын захиалгыг устгав'; end if;
  raise notice 'OK: захиалга нэмэх, авсан гэж тэмдэглэх ажиллана; бусдынхыг устгахгүй';

  -- Профайл
  update public.profiles set name = 'Түвшинбаяр' where id = '00000000-0000-4000-a000-000000000013';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: өөрийн нэрээ засаж чадсангүй'; end if;
  update public.profiles set name = 'X' where id = '00000000-0000-4000-a000-000000000012';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: бусдын нэрийг засав'; end if;
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-4000-a000-000000000013';
    raise exception 'FAIL: өөрийгөө админ болгов';
  exception when insufficient_privilege then
    raise notice 'OK: зөвхөн өөрийн нэрийг засна, үүргээ өөрчилж чадахгүй';
  end;
end $$;

-- =====================================================================
-- 2. Ээж (эцэг эх, Батын гэр)
-- =====================================================================
reset role;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000012","role":"authenticated"}', true);
set local role authenticated;

do $$
declare n int; v_id bigint;
begin
  insert into public.chores (title, member_id, mode, family_id)
  values ('Цэцэг услах', '00000000-0000-4000-a000-000000000013', 'weekly', 1)
  returning id into v_id;
  insert into public.chore_days (chore_id, weekday) values (v_id, 2), (v_id, 4);
  raise notice 'OK: эцэг эх гарагаар давтагдах ажил өгнө';

  begin
    insert into public.chores (title, member_id, mode, family_id)
    values ('Тест', '00000000-0000-4000-a000-000000000022', 'daily', 1);
    raise exception 'FAIL: өөр гэр бүлийн хүүхдэд ажил өглөө';
  exception when insufficient_privilege then
    raise notice 'OK: өөр гэр бүлийн хүнд ажил өгч чадахгүй';
  end;

  begin
    insert into public.chores (title, mode, family_id) values ('Тест', 'daily', 2);
    raise exception 'FAIL: өөр гэр бүлд ажил нэмэв';
  exception when insufficient_privilege then
    raise notice 'OK: өөр гэр бүлд ажил нэмж чадахгүй';
  end;

  begin
    insert into public.chores (title, mode, family_id) values ('Тест', 'once', 1);
    raise exception 'FAIL: огноогүй нэг удаагийн ажил нэмэгдэв';
  exception when check_violation then
    raise notice 'OK: нэг удаагийн ажилд огноо заавал';
  end;

  update public.chores set title = 'Аяга таваг угаах' where id = 1;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: эцэг эх ажил засаж чадсангүй'; end if;
  delete from public.chores where id = 3;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: эцэг эх ажил устгаж чадсангүй'; end if;
  raise notice 'OK: эцэг эх ажил засаж, устгана';

  begin
    insert into public.lessons (member_id, weekday, start_time, end_time, name)
    values ('00000000-0000-4000-a000-000000000012', 1, '09:00', '10:00', 'Тест');
    raise exception 'FAIL: эцэг эхийн хуваарьт хичээл нэмэгдэв';
  exception when insufficient_privilege then
    raise notice 'OK: хичээлийг зөвхөн хүүхдийн хуваарьт нэмнэ';
  end;

  delete from public.shopping where text = 'Талх';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: эцэг эх авсан зүйлсийг цэвэрлэж чадсангүй'; end if;
  raise notice 'OK: эцэг эх авсан зүйлсийг цэвэрлэнэ';
end $$;

-- =====================================================================
-- 3. Дорждын гэрийн ээж — Батын гэрийн өгөгдлийг харахгүй
-- =====================================================================
reset role;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000021","role":"authenticated"}', true);
set local role authenticated;

do $$
declare n int;
begin
  if (select count(*) from public.chores)   <> 1 then raise exception 'FAIL: Дорждын гэр 1 ажил харах ёстой'; end if;
  if (select count(*) from public.shopping) <> 1 then raise exception 'FAIL: Дорждын гэр 1 захиалга харах ёстой'; end if;
  if (select count(*) from public.lessons)  <> 0 then raise exception 'FAIL: өөр гэрийн хичээл харагдлаа'; end if;
  update public.shopping set got = true where family_id = 1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: өөр гэрийн захиалгыг өөрчлөв'; end if;
  raise notice 'OK: гэр бүлүүд бие биенээсээ тусгаарлагдсан';
end $$;

-- =====================================================================
-- 4. Админ
-- =====================================================================
reset role;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}', true);
set local role authenticated;

do $$
begin
  if (select count(*) from public.families) <> 2 then raise exception 'FAIL: админ бүх гэр бүлийг харах ёстой'; end if;
  if (select count(*) from public.profiles) <> 7 then raise exception 'FAIL: админ бүх гишүүнийг харах ёстой'; end if;
  insert into public.families (name) values ('Туршилтын гэр');
  raise notice 'OK: админ гэр бүл нэмж, бүх гишүүнийг харна';

  begin
    insert into public.families (name) values ('батын гэр');
    raise exception 'FAIL: давхардсан гэр бүлийн нэр нэмэгдэв';
  exception when unique_violation then
    raise notice 'OK: гэр бүлийн нэр давхардахгүй';
  end;

  if (select count(*) from public.chores) <> 0 or (select count(*) from public.shopping) <> 0 then
    raise exception 'FAIL: админ гэрийн ажил / захиалга харах ёсгүй'; end if;
  begin
    insert into public.chores (title, mode, family_id) values ('Тест', 'daily', 1);
    raise exception 'FAIL: админ гэрийн ажил өглөө';
  exception when insufficient_privilege then
    raise notice 'OK: админ гэрийн ажил, захиалгын хэсгийг ашиглахгүй';
  end;
end $$;

-- =====================================================================
-- 5. Нэвтрээгүй хэрэглэгч (anon)
-- =====================================================================
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$
begin
  begin
    perform 1 from public.profiles;
    raise exception 'FAIL: нэвтрээгүй хүн profiles уншив';
  exception when insufficient_privilege then
    raise notice 'OK: нэвтрээгүй хүн хүснэгт уншиж чадахгүй';
  end;
  if public.login_state('bat_saraa')   <> 'need_pin' then raise exception 'FAIL: login_state need_pin'; end if;
  if public.login_state('BAT_EEJ ')    <> 'ok'       then raise exception 'FAIL: login_state ok'; end if;
  if public.login_state('baihgui_hun') <> 'unknown'  then raise exception 'FAIL: login_state unknown'; end if;
  raise notice 'OK: login_state() ажиллана';
end $$;

-- =====================================================================
-- 6. Server (service_role / postgres): устгах, trigger
-- =====================================================================
reset role;

do $$
begin
  begin
    delete from auth.users where id = '00000000-0000-4000-a000-000000000001';
    raise exception 'FAIL: сүүлийн админ устав';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'OK: сүүлийн админыг устгахгүй';
  end;

  delete from auth.users where id = '00000000-0000-4000-a000-000000000014';  -- Сараа
  if exists (select 1 from public.profiles where id = '00000000-0000-4000-a000-000000000014')
     or exists (select 1 from public.schedule_days where member_id = '00000000-0000-4000-a000-000000000014') then
    raise exception 'FAIL: гишүүний профайл / хуваарь устсангүй'; end if;
  if (select member_id from public.chores where id = 2) is not null then
    raise exception 'FAIL: ажил «хэнд ч өгөөгүй» болсонгүй'; end if;
  raise notice 'OK: гишүүн устгахад хуваарь нь устаж, ажил нь «хэнд ч өгөөгүй» болно';

  begin
    insert into auth.users (instance_id, id, aud, role, email)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(),
            'authenticated', 'authenticated', 'hacker@manai-ger.local');
    raise exception 'FAIL: app_metadata-гүй хэрэглэгч бүртгэгдэв';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'OK: гишүүн өөрөө бүртгүүлж чадахгүй';
  end;

  raise notice '==== БҮХ ШАЛГАЛТ АМЖИЛТТАЙ ====';
end $$;

rollback;
