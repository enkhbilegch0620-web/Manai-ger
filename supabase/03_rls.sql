-- =====================================================================
--  «Манай гэр» — 03_rls.sql
--  Row Level Security: хэн юуг харж, нэмж, засаж, устгаж болох вэ
--
--  Товч дүрэм (шаардлагын баримтын 8-р хэсгээс):
--    * Гишүүн зөвхөн өөрийн гэр бүлийн мэдээллийг харна            (Дүрэм 5)
--    * Гэр бүл, гишүүн, PIN-ийг зөвхөн админ удирдана              (Дүрэм 6)
--    * Админ гэрийн ажил, хуваарь, захиалгыг ашиглахгүй            (Дүрэм 7)
--    * Гэрийн ажил өгөх, засах, устгах — зөвхөн эцэг эх            (Дүрэм 8)
--    * Хичээл зөвхөн хүүхдийн хуваарьт                             (Дүрэм 12)
--    * Анх нэвтрээгүй гишүүний хуваарийг гэр бүлийнхэн оруулж болно (Дүрэм 14)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Туслах функцууд (private schema — API-аар дуудагдахгүй)
-- ---------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function private.my_family_id()
returns bigint language sql stable security definer set search_path = '' as $$
  select family_id from public.profiles where id = auth.uid();
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function private.is_parent()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'parent' from public.profiles where id = auth.uid()), false);
$$;

-- Тухайн гишүүн миний гэр бүлийнх үү
create or replace function private.in_my_family(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
     where p.id = p_member
       and p.family_id = (select family_id from public.profiles where id = auth.uid())
  );
$$;

-- Тухайн гишүүн хүүхэд үү
create or replace function private.is_child(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = p_member and role = 'child');
$$;

-- Хуваарь засах эрх: өөрийнх, эсвэл миний гэр бүлийн анх нэвтрээгүй гишүүнийх
create or replace function private.can_edit_schedule(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_member = auth.uid()
      or exists (
        select 1 from public.profiles p
         where p.id = p_member
           and p.pin_set = false
           and p.role <> 'admin'
           and p.family_id = (select family_id from public.profiles where id = auth.uid())
      );
$$;

-- Тухайн ажил миний гэр бүлийнх үү
create or replace function private.chore_in_my_family(p_chore bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chores c
     where c.id = p_chore
       and c.family_id = (select family_id from public.profiles where id = auth.uid())
  );
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------
-- 1. Default утгууд: "хэн" гэдгийг клиентээс илгээх шаардлагагүй
-- ---------------------------------------------------------------------
alter table public.chores     alter column created_by set default auth.uid();
alter table public.chore_done alter column done_by    set default auth.uid();
alter table public.shopping   alter column ordered_by set default auth.uid();

-- ---------------------------------------------------------------------
-- 2. Эрх (GRANT): anon юу ч харахгүй. profiles-д зөвхөн name, hue засна.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon;

revoke insert, update, delete on public.profiles from authenticated;
grant  update (name, hue)     on public.profiles to authenticated;
-- profiles-ийн insert / delete / role / pin_set-ийг зөвхөн service_role (server action) хийнэ

-- ---------------------------------------------------------------------
-- 3. RLS асаах
-- ---------------------------------------------------------------------
alter table public.families      enable row level security;
alter table public.profiles      enable row level security;
alter table public.chores        enable row level security;
alter table public.chore_days    enable row level security;
alter table public.chore_done    enable row level security;
alter table public.schedule_days enable row level security;
alter table public.lessons       enable row level security;
alter table public.plans         enable row level security;
alter table public.shopping      enable row level security;

-- ---------------------------------------------------------------------
-- families
-- ---------------------------------------------------------------------
-- families: админ бүгдийг, гишүүн өөрийнхийг харна
create policy families_select
  on public.families for select to authenticated
  using ((select private.is_admin()) or id = (select private.my_family_id()));

-- families: зөвхөн админ нэмнэ
create policy families_insert
  on public.families for insert to authenticated
  with check ((select private.is_admin()));

-- families: зөвхөн админ засна
create policy families_update
  on public.families for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- families: зөвхөн админ устгана
create policy families_delete
  on public.families for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
-- profiles: өөрийгөө, гэр бүлээ харна; админ бүгдийг
create policy profiles_select
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or family_id = (select private.my_family_id())
    or (select private.is_admin())
  );

-- profiles: зөвхөн өөрийн нэр, өнгийг засна
create policy profiles_update
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- chores : гэр бүл харна, зөвхөн эцэг эх нэмж/засаж/устгана
-- ---------------------------------------------------------------------
-- chores: гэр бүлийнхэн харна
create policy chores_select
  on public.chores for select to authenticated
  using (family_id = (select private.my_family_id()));

-- chores: эцэг эх нэмнэ
create policy chores_insert
  on public.chores for insert to authenticated
  with check (
    (select private.is_parent())
    and family_id  = (select private.my_family_id())
    and created_by = (select auth.uid())
    and (member_id is null or private.in_my_family(member_id))
  );

-- chores: эцэг эх засна
create policy chores_update
  on public.chores for update to authenticated
  using ((select private.is_parent()) and family_id = (select private.my_family_id()))
  with check (
    (select private.is_parent())
    and family_id = (select private.my_family_id())
    and (member_id is null or private.in_my_family(member_id))
  );

-- chores: эцэг эх устгана
create policy chores_delete
  on public.chores for delete to authenticated
  using ((select private.is_parent()) and family_id = (select private.my_family_id()));

-- ---------------------------------------------------------------------
-- chore_days : ажлын гарагууд — эцэг эх удирдана
-- ---------------------------------------------------------------------
-- chore_days: гэр бүлийнхэн харна
create policy chore_days_select
  on public.chore_days for select to authenticated
  using (private.chore_in_my_family(chore_id));

-- chore_days: эцэг эх нэмнэ
create policy chore_days_insert
  on public.chore_days for insert to authenticated
  with check ((select private.is_parent()) and private.chore_in_my_family(chore_id));

-- chore_days: эцэг эх устгана
create policy chore_days_delete
  on public.chore_days for delete to authenticated
  using ((select private.is_parent()) and private.chore_in_my_family(chore_id));

-- ---------------------------------------------------------------------
-- chore_done : хийсэн тэмдэглэл — гэр бүлийн хэн ч тэмдэглэнэ
-- ---------------------------------------------------------------------
-- chore_done: гэр бүлийнхэн харна
create policy chore_done_select
  on public.chore_done for select to authenticated
  using (private.chore_in_my_family(chore_id));

-- chore_done: гэр бүлийн гишүүн тэмдэглэнэ
create policy chore_done_insert
  on public.chore_done for insert to authenticated
  with check (private.chore_in_my_family(chore_id) and private.in_my_family(done_by));

-- chore_done: өөрийнхөө эсвэл эцэг эх тэмдэглэгээг болиулна
create policy chore_done_delete
  on public.chore_done for delete to authenticated
  using (
    private.chore_in_my_family(chore_id)
    and (done_by = (select auth.uid()) or (select private.is_parent()))
  );

-- ---------------------------------------------------------------------
-- schedule_days : гэр бүл харна (хэн хэзээ тарахыг), өөрийнхөө засна
-- ---------------------------------------------------------------------
-- schedule_days: гэр бүлийнхэн харна
create policy schedule_days_select
  on public.schedule_days for select to authenticated
  using (private.in_my_family(member_id));

-- schedule_days: өөрийн / анх нэвтрээгүйнхийг нэмнэ
create policy schedule_days_insert
  on public.schedule_days for insert to authenticated
  with check (private.can_edit_schedule(member_id));

-- schedule_days: өөрийн / анх нэвтрээгүйнхийг засна
create policy schedule_days_update
  on public.schedule_days for update to authenticated
  using (private.can_edit_schedule(member_id))
  with check (private.can_edit_schedule(member_id));

-- schedule_days: өөрийн / анх нэвтрээгүйнхийг устгана
create policy schedule_days_delete
  on public.schedule_days for delete to authenticated
  using (private.can_edit_schedule(member_id));

-- ---------------------------------------------------------------------
-- lessons : зөвхөн хүүхдийн хуваарьт
-- ---------------------------------------------------------------------
-- lessons: гэр бүлийнхэн харна
create policy lessons_select
  on public.lessons for select to authenticated
  using (private.in_my_family(member_id));

-- lessons: хүүхдийн хуваарьт нэмнэ
create policy lessons_insert
  on public.lessons for insert to authenticated
  with check (private.can_edit_schedule(member_id) and private.is_child(member_id));

-- lessons: засна
create policy lessons_update
  on public.lessons for update to authenticated
  using (private.can_edit_schedule(member_id))
  with check (private.can_edit_schedule(member_id) and private.is_child(member_id));

-- lessons: устгана
create policy lessons_delete
  on public.lessons for delete to authenticated
  using (private.can_edit_schedule(member_id));

-- ---------------------------------------------------------------------
-- plans : тарсны дараах ажил
-- ---------------------------------------------------------------------
-- plans: гэр бүлийнхэн харна
create policy plans_select
  on public.plans for select to authenticated
  using (private.in_my_family(member_id));

-- plans: нэмнэ
create policy plans_insert
  on public.plans for insert to authenticated
  with check (private.can_edit_schedule(member_id));

-- plans: засна
create policy plans_update
  on public.plans for update to authenticated
  using (private.can_edit_schedule(member_id))
  with check (private.can_edit_schedule(member_id));

-- plans: устгана
create policy plans_delete
  on public.plans for delete to authenticated
  using (private.can_edit_schedule(member_id));

-- ---------------------------------------------------------------------
-- shopping : гэр бүлийн хэн ч нэмж, авсан гэж тэмдэглэнэ
-- ---------------------------------------------------------------------
-- shopping: гэр бүлийнхэн харна
create policy shopping_select
  on public.shopping for select to authenticated
  using (family_id = (select private.my_family_id()));

-- shopping: гэр бүлийн гишүүн нэмнэ
create policy shopping_insert
  on public.shopping for insert to authenticated
  with check (
    family_id  = (select private.my_family_id())
    and ordered_by = (select auth.uid())
  );

-- shopping: гэр бүлийн гишүүн авсан гэж тэмдэглэнэ
create policy shopping_update
  on public.shopping for update to authenticated
  using (family_id = (select private.my_family_id()))
  with check (family_id = (select private.my_family_id()));

-- shopping: өөрийн захиалгаа, эсвэл эцэг эх устгана
create policy shopping_delete
  on public.shopping for delete to authenticated
  using (
    family_id = (select private.my_family_id())
    and (ordered_by = (select auth.uid()) or (select private.is_parent()))
  );
