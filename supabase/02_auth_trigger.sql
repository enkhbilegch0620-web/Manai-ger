-- =====================================================================
--  «Манай гэр» — 02_auth_trigger.sql
--  auth.users -> profiles автомат trigger, нэвтрэх хуудсанд туслах функц
--
--  Нэвтрэх зарчим (Гишүүн 3-т):
--    * Гишүүн өөрөө бүртгүүлэхгүй. Админ server action-оор (service_role)
--      supabase.auth.admin.createUser(...) дуудаж гишүүн үүсгэнэ.
--    * email    = <username>@manai-ger.local   (жинхэнэ имэйл биш, зөвхөн дотоод)
--    * password = 'mg_' || PIN                 (Supabase хамгийн багадаа 6 тэмдэгт шаарддаг тул)
--    * role, family_id, username -> app_metadata (хэрэглэгч өөрөө өөрчилж чадахгүй)
--    * name                      -> user_metadata
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Шинэ auth хэрэглэгч үүсэхэд profiles-д мөр нэмэх
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role      text   := new.raw_app_meta_data ->> 'role';
  v_family_id bigint := nullif(new.raw_app_meta_data ->> 'family_id', '')::bigint;
  v_username  text   := lower(coalesce(new.raw_app_meta_data ->> 'username',
                                       split_part(new.email, '@', 1)));
  v_name      text   := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), v_username);
  v_pin_set   boolean := coalesce((new.raw_app_meta_data ->> 'pin_set')::boolean, false);
begin
  if v_role is null then
    -- app_metadata-гүй хэрэглэгч: зөвхөн хамгийн анхны админыг
    -- Supabase Dashboard -> Authentication -> Add user-ээр үүсгэж болно.
    if exists (select 1 from public.profiles where role = 'admin') then
      raise exception 'Хэрэглэгчийг зөвхөн админ үүсгэнэ (app_metadata.role алга)';
    end if;
    v_role    := 'admin';
    v_pin_set := true;   -- Dashboard дээр нууц үгтэй нь үүсгэсэн
  end if;

  insert into public.profiles (id, username, name, role, family_id, pin_set)
  values (new.id, v_username, v_name, v_role,
          case when v_role = 'admin' then null else v_family_id end,
          v_pin_set);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. Сүүлийн админыг устгахгүй (Дүрэм 15)
--    Админ өөрийгөө устгах эсэхийг server action дээр мөн шалгана.
-- ---------------------------------------------------------------------
create or replace function public.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'Системийн сүүлийн админыг устгах боломжгүй';
  end if;
  return old;
end;
$$;

create trigger profiles_protect_last_admin
before delete on public.profiles
for each row execute function public.protect_last_admin();

-- ---------------------------------------------------------------------
-- 3. Нэвтрэх хуудсанд: нэрээр нь гишүүний төлөвийг буцаана
--    'unknown'  — ийм нэр алга
--    'need_pin' — анх нэвтэрч байна, PIN үүсгэх цонх харуулна
--    'ok'       — PIN-ээ оруулж нэвтэрнэ
-- ---------------------------------------------------------------------
create or replace function public.login_state(p_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select case when p.pin_set then 'ok' else 'need_pin' end
       from public.profiles p
      where lower(p.username) = lower(trim(p_username))),
    'unknown');
$$;

revoke all on function public.login_state(text) from public;
grant execute on function public.login_state(text) to anon, authenticated;

-- Trigger функцуудыг гаднаас RPC-ээр дуудахыг хаана
revoke all on function public.handle_new_user()     from public, anon, authenticated;
revoke all on function public.protect_last_admin()  from public, anon, authenticated;
