-- =====================================================================
--  «Манай гэр» — Supabase өгөгдлийн сан
--  01_schema.sql : бүх хүснэгт, холбоос, шалгалт (constraint), индекс
--  Хариуцагч: Гишүүн 2 (Backend / Database) · 1-р долоо хоног
--
--  ERD (Java + SQLite хувилбар) -> Supabase (Postgres) хөрвүүлэлт:
--    members   -> profiles   (id = auth.users.id, uuid)
--    pins      -> хасагдсан  (PIN-ийг Supabase Auth өөрөө шифрлэж хадгална,
--                             profiles.pin_set багана "PIN үүсгэсэн эсэх"-ийг заана)
--    members.manual -> profiles.pin_set (manual = NOT pin_set)
--    бусад 8 хүснэгт ERD-тэй ижил нэр, ижил баганатай.
--
--  Supabase SQL Editor дээр 01 -> 02 -> 03 -> 04 дарааллаар ажиллуулна.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. families : гэр бүлүүд
-- ---------------------------------------------------------------------
create table public.families (
  id          bigint generated always as identity primary key,
  name        text        not null check (length(trim(name)) > 0),
  created_at  timestamptz not null default now()
);
-- Гэр бүлийн нэр давхардахгүй (том жижиг үсэг ялгахгүй)
create unique index families_name_uk on public.families (lower(trim(name)));

comment on table public.families is 'Гэр бүлүүд. Админ нэмнэ.';

-- ---------------------------------------------------------------------
-- 2. profiles : системийн бүх хүн (ERD-ийн members)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  username    text        not null check (username ~ '^[a-z0-9_.]{3,30}$'),
  name        text        not null check (length(trim(name)) > 0),
  role        text        not null check (role in ('admin', 'parent', 'child')),
  family_id   bigint      references public.families (id) on delete cascade,
  hue         smallint    not null default 0 check (hue between 0 and 11),
  pin_set     boolean     not null default false,
  created_at  timestamptz not null default now(),
  -- Админ гэр бүлгүй, эцэг эх/хүүхэд заавал гэр бүлтэй
  constraint profiles_family_by_role check (
    (role = 'admin' and family_id is null) or
    (role <> 'admin' and family_id is not null)
  )
);
-- Нэвтрэх нэр бүх гэр бүлд давхардахгүй
create unique index profiles_username_uk on public.profiles (lower(username));
create index profiles_family_idx on public.profiles (family_id);

comment on table  public.profiles          is 'Админ, эцэг эх, хүүхэд бүгд. auth.users-тэй 1:1.';
comment on column public.profiles.username is 'Нэвтрэх нэр (латин, админ өгнө, өөрчлөгдөхгүй)';
comment on column public.profiles.name     is 'Харагдах нэр (кирилл байж болно, гишүүн өөрөө засна)';
comment on column public.profiles.pin_set  is 'PIN үүсгэсэн бол true. false = анх нэвтрээгүй (ERD-ийн manual = 1)';

-- ---------------------------------------------------------------------
-- 3. chores : гэрийн ажлын жагсаалт
-- ---------------------------------------------------------------------
create table public.chores (
  id          bigint generated always as identity primary key,
  title       text        not null check (length(trim(title)) > 0),
  member_id   uuid        references public.profiles (id) on delete set null,  -- устгавал «хэнд ч өгөөгүй»
  mode        text        not null check (mode in ('daily', 'weekly', 'once')),
  once_date   date,
  created_by  uuid        references public.profiles (id) on delete set null,
  family_id   bigint      not null references public.families (id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- Нэг удаагийн ажил бол огноо заавал
  constraint chores_once_date check (
    (mode = 'once' and once_date is not null) or
    (mode <> 'once' and once_date is null)
  )
);
create index chores_family_idx     on public.chores (family_id);
create index chores_member_idx     on public.chores (member_id);
create index chores_created_by_idx on public.chores (created_by);

comment on column public.chores.member_id is 'Хэн хийх вэ. Хэд хэдэн гишүүнд өгвөл гишүүн тус бүрд нэг мөр.';

-- ---------------------------------------------------------------------
-- 4. chore_days : гарагаар давтагдах ажил аль гарагт хийгдэх
-- ---------------------------------------------------------------------
create table public.chore_days (
  chore_id  bigint   not null references public.chores (id) on delete cascade,
  weekday   smallint not null check (weekday between 1 and 7),   -- 1 = Даваа ... 7 = Ням
  primary key (chore_id, weekday)
);

-- ---------------------------------------------------------------------
-- 5. chore_done : ажил хийгдсэн тэмдэглэл (өдөр бүрээр)
-- ---------------------------------------------------------------------
create table public.chore_done (
  chore_id   bigint not null references public.chores (id) on delete cascade,
  done_date  date   not null default current_date,
  done_by    uuid   references public.profiles (id) on delete set null,
  primary key (chore_id, done_date)
);
create index chore_done_done_by_idx on public.chore_done (done_by);

-- ---------------------------------------------------------------------
-- 6. schedule_days : гараг бүрийн хуваарь (нэг хүн нэг гарагт нэг мөр)
-- ---------------------------------------------------------------------
create table public.schedule_days (
  member_id   uuid     not null references public.profiles (id) on delete cascade,
  weekday     smallint not null check (weekday between 1 and 7),
  place       text     not null check (place in ('work', 'school', 'rest')),
  start_time  time,
  end_time    time,
  note        text,
  primary key (member_id, weekday),
  -- Ажлын өдөрт тарах цаг заавал. Сургуулийн өдөр хоосон бол хичээлийн дуусах цагаар тооцно.
  constraint schedule_work_end check (place <> 'work' or end_time is not null),
  constraint schedule_time_order check (start_time is null or end_time is null or end_time > start_time)
);

-- ---------------------------------------------------------------------
-- 7. lessons : сурагчийн хичээлүүд (schedule_days-ийн нэг өдөрт олон хичээл)
-- ---------------------------------------------------------------------
create table public.lessons (
  id          bigint generated always as identity primary key,
  member_id   uuid     not null,
  weekday     smallint not null,
  start_time  time     not null,
  end_time    time     not null,
  name        text     not null check (length(trim(name)) > 0),
  room        text,
  teacher     text,
  constraint lessons_time_order check (end_time > start_time),
  -- ERD: lessons (member_id, weekday) -> schedule_days
  constraint lessons_schedule_fk foreign key (member_id, weekday)
    references public.schedule_days (member_id, weekday) on delete cascade
);
create index lessons_member_day_idx on public.lessons (member_id, weekday);

-- ---------------------------------------------------------------------
-- 8. plans : тарсны дараах ажил (бэлтгэл, дугуйлан ...)
-- ---------------------------------------------------------------------
create table public.plans (
  id          bigint generated always as identity primary key,
  member_id   uuid        not null references public.profiles (id) on delete cascade,
  plan_date   date        not null,
  from_time   time        not null,
  to_time     time,
  text        text        not null check (length(trim(text)) > 0),
  created_at  timestamptz not null default now(),
  constraint plans_time_order check (to_time is null or to_time > from_time)
);
create index plans_member_date_idx on public.plans (member_id, plan_date);

-- ---------------------------------------------------------------------
-- 9. shopping : дэлгүүрийн захиалга
-- ---------------------------------------------------------------------
create table public.shopping (
  id          bigint generated always as identity primary key,
  text        text        not null check (length(trim(text)) > 0),
  qty         text,
  ordered_by  uuid        references public.profiles (id) on delete set null,  -- устгавал хоосорно
  got         boolean     not null default false,
  got_by      uuid        references public.profiles (id) on delete set null,
  got_at      timestamptz,
  family_id   bigint      not null references public.families (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index shopping_family_idx     on public.shopping (family_id, got);
create index shopping_ordered_by_idx on public.shopping (ordered_by);
create index shopping_got_by_idx     on public.shopping (got_by);

-- «Авсан» гэж тэмдэглэхэд got_by / got_at-ийг автоматаар бөглөнө
create or replace function public.shopping_set_got()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.got and not coalesce(old.got, false) then
    new.got_by := coalesce(new.got_by, auth.uid());
    new.got_at := coalesce(new.got_at, now());
  elsif not new.got then
    new.got_by := null;
    new.got_at := null;
  end if;
  return new;
end;
$$;

create trigger shopping_set_got
before insert or update of got on public.shopping
for each row execute function public.shopping_set_got();
