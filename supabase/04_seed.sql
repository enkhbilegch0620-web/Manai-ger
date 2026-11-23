-- =====================================================================
--  «Манай гэр» — 04_seed.sql : ТУРШИЛТЫН өгөгдөл
--  Хоосон өгөгдлийн сан дээр НЭГ удаа ажиллуулна.
--  6-р долоо хоногт энэ өгөгдлийг цэвэрлэнэ (README-г үз).
--
--  Туршилтын хэрэглэгчид (бүгд PIN = 1234, Supabase нууц үг = mg_1234):
--    admin          Админ                  (гэр бүлгүй)
--    bat_aav        Аав     — эцэг эх      Батын гэр
--    bat_eej        Ээж     — эцэг эх      Батын гэр
--    bat_tuvshin    Түвшин  — хүүхэд       Батын гэр
--    bat_saraa      Сараа   — хүүхэд       Батын гэр  (анх нэвтрээгүй, PIN-гүй)
--    dorj_eej       Ээж     — эцэг эх      Дорждын гэр
--    dorj_temuulen  Тэмүүлэн — хүүхэд      Дорждын гэр
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Гэр бүлүүд
-- ---------------------------------------------------------------------
insert into public.families (id, name) overriding system value values
  (1, 'Батын гэр'),
  (2, 'Дорждын гэр');
select setval(pg_get_serial_sequence('public.families', 'id'), 2);

-- ---------------------------------------------------------------------
-- 2. Auth хэрэглэгчид (trigger нь profiles-ийг автоматаар үүсгэнэ)
-- ---------------------------------------------------------------------
with seed (id, username, name, role, family_id, pin_set) as (
  values
    ('00000000-0000-4000-a000-000000000001'::uuid, 'admin',         'Админ',    'admin',  null::bigint, true),
    ('00000000-0000-4000-a000-000000000011'::uuid, 'bat_aav',       'Аав',      'parent', 1,            true),
    ('00000000-0000-4000-a000-000000000012'::uuid, 'bat_eej',       'Ээж',      'parent', 1,            true),
    ('00000000-0000-4000-a000-000000000013'::uuid, 'bat_tuvshin',   'Түвшин',   'child',  1,            true),
    ('00000000-0000-4000-a000-000000000014'::uuid, 'bat_saraa',     'Сараа',    'child',  1,            false),
    ('00000000-0000-4000-a000-000000000021'::uuid, 'dorj_eej',      'Ээж',      'parent', 2,            true),
    ('00000000-0000-4000-a000-000000000022'::uuid, 'dorj_temuulen', 'Тэмүүлэн', 'child',  2,            true)
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', s.id, 'authenticated', 'authenticated',
  s.username || '@manai-ger.local',
  -- PIN-гүй гишүүнд санамсаргүй нууц үг (анх нэвтрэхдээ PIN үүсгэнэ)
  extensions.crypt(case when s.pin_set then 'mg_1234' else gen_random_uuid()::text end,
                   extensions.gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'),
                     'username', s.username, 'role', s.role,
                     'family_id', s.family_id, 'pin_set', s.pin_set),
  jsonb_build_object('name', s.name),
  now(), now(), '', '', '', ''
from seed s;

-- Supabase-ийн нэвтрэлт ажиллахад identity мөр хэрэгтэй
insert into auth.identities (id, user_id, provider_id, provider, identity_data,
                             last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.email like '%@manai-ger.local';

-- Аватарын өнгө
update public.profiles set hue = 2 where username = 'bat_aav';
update public.profiles set hue = 5 where username = 'bat_eej';
update public.profiles set hue = 8 where username = 'bat_tuvshin';
update public.profiles set hue = 10 where username = 'bat_saraa';
update public.profiles set hue = 4 where username = 'dorj_eej';
update public.profiles set hue = 7 where username = 'dorj_temuulen';

-- ---------------------------------------------------------------------
-- 3. Гэрийн ажил
-- ---------------------------------------------------------------------
insert into public.chores (id, title, member_id, mode, once_date, created_by, family_id)
overriding system value values
  (1, 'Аяга угаах',  '00000000-0000-4000-a000-000000000013', 'daily',  null,              '00000000-0000-4000-a000-000000000012', 1),
  (2, 'Хог гаргах',  '00000000-0000-4000-a000-000000000014', 'weekly', null,              '00000000-0000-4000-a000-000000000012', 1),
  (3, 'Шал угаах',   '00000000-0000-4000-a000-000000000013', 'once',   current_date + 1,  '00000000-0000-4000-a000-000000000011', 1),
  (4, 'Шал угаах',   '00000000-0000-4000-a000-000000000014', 'once',   current_date + 1,  '00000000-0000-4000-a000-000000000011', 1),
  (5, 'Ор засах',    '00000000-0000-4000-a000-000000000022', 'daily',  null,              '00000000-0000-4000-a000-000000000021', 2);
select setval(pg_get_serial_sequence('public.chores', 'id'), 5);

-- «Хог гаргах» — Даваа, Лхагва, Баасан
insert into public.chore_days (chore_id, weekday) values (2, 1), (2, 3), (2, 5);

-- Өнөөдөр Түвшин аяга угаасан
insert into public.chore_done (chore_id, done_date, done_by)
values (1, current_date, '00000000-0000-4000-a000-000000000013');

-- ---------------------------------------------------------------------
-- 4. Долоо хоногийн хуваарь (Даваа–Баасан)
-- ---------------------------------------------------------------------
insert into public.schedule_days (member_id, weekday, place, start_time, end_time, note)
select m.id, d, m.place, m.st, m.en, null
from (values
  ('00000000-0000-4000-a000-000000000011'::uuid, 'work',   '09:00'::time, '18:00'::time),
  ('00000000-0000-4000-a000-000000000012'::uuid, 'work',   '08:30'::time, '17:30'::time),
  ('00000000-0000-4000-a000-000000000013'::uuid, 'school', '08:00'::time, null::time),
  ('00000000-0000-4000-a000-000000000022'::uuid, 'school', '13:00'::time, '17:20'::time)
) as m(id, place, st, en)
cross join generate_series(1, 5) as d;

-- Аав Бямбад амарна, Ээж Бямба гарагт эмнэлэгт
insert into public.schedule_days (member_id, weekday, place, start_time, end_time, note) values
  ('00000000-0000-4000-a000-000000000011', 6, 'rest', null,    null,    null),
  ('00000000-0000-4000-a000-000000000012', 6, 'work', '10:00', '14:00', 'Эмнэлэг');

-- Түвшиний хичээлүүд (тарах цаг = сүүлийн хичээлийн дуусах цаг)
insert into public.lessons (member_id, weekday, start_time, end_time, name, room, teacher) values
  ('00000000-0000-4000-a000-000000000013', 1, '08:00', '09:20', 'Математик',  '301', 'Сарнай'),
  ('00000000-0000-4000-a000-000000000013', 1, '09:30', '10:50', 'Монгол хэл', '204', 'Оюун'),
  ('00000000-0000-4000-a000-000000000013', 1, '11:00', '12:20', 'Англи хэл',  '112', 'Болд'),
  ('00000000-0000-4000-a000-000000000013', 2, '08:00', '09:20', 'Физик',      '305', 'Ганбаатар'),
  ('00000000-0000-4000-a000-000000000013', 2, '09:30', '10:50', 'Түүх',       '210', 'Нармандах'),
  ('00000000-0000-4000-a000-000000000013', 3, '08:00', '09:20', 'Математик',  '301', 'Сарнай'),
  ('00000000-0000-4000-a000-000000000013', 3, '09:30', '10:50', 'Биологи',    '308', 'Цэцэг'),
  ('00000000-0000-4000-a000-000000000013', 3, '11:00', '12:20', 'Биеийн тамир', 'Заал', 'Батзориг'),
  ('00000000-0000-4000-a000-000000000013', 4, '08:00', '09:20', 'Хими',       '306', 'Мөнхзул'),
  ('00000000-0000-4000-a000-000000000013', 5, '08:00', '09:20', 'Англи хэл',  '112', 'Болд'),
  ('00000000-0000-4000-a000-000000000013', 5, '09:30', '10:50', 'Мэдээлэл зүй', '401', 'Энхжаргал');

-- ---------------------------------------------------------------------
-- 5. Тарсны дараах ажил
-- ---------------------------------------------------------------------
insert into public.plans (member_id, plan_date, from_time, to_time, text) values
  ('00000000-0000-4000-a000-000000000013', current_date,     '15:00', '17:00', 'Сагсны бэлтгэл'),
  ('00000000-0000-4000-a000-000000000013', current_date + 2, '14:00', '15:30', 'Робот техникийн дугуйлан'),
  ('00000000-0000-4000-a000-000000000012', current_date,     '18:00', '19:00', 'Йог'),
  ('00000000-0000-4000-a000-000000000022', current_date,     '18:00', '19:30', 'Хөлбөмбөг');

-- ---------------------------------------------------------------------
-- 6. Дэлгүүрийн захиалга
-- ---------------------------------------------------------------------
insert into public.shopping (text, qty, ordered_by, got, got_by, family_id) values
  ('Сүү',    '2л',     '00000000-0000-4000-a000-000000000012', false, null, 1),
  ('Талх',   '1',      '00000000-0000-4000-a000-000000000013', true,  '00000000-0000-4000-a000-000000000011', 1),
  ('Өндөг',  '10 ш',   '00000000-0000-4000-a000-000000000011', false, null, 1),
  ('Алим',   '1 кг',   '00000000-0000-4000-a000-000000000021', false, null, 2);

commit;
