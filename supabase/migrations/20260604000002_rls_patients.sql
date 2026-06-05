-- RLS for public.patients (SEC-02, domain 3/5)
-- Rule: always enable RLS and create all policies in the same migration file.
-- Dual ownership anchor (confirmed against live data + app code 2026-06-04):
--   - profile_id: 26/26 live rows populated; dashboard flows query by profile_id
--   - user_phone: nullable, used by get-patients-by-user-phone (WhatsApp-origin flow)
-- Both paths must stay visible, so the predicate accepts either anchor.
-- Additive only (D-04). Reversal: supabase/docs/rls-reversals.sql.

alter table public.patients enable row level security;

create policy "Patients select own"
on public.patients for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
  or user_phone in (
    select au.phone from public.authenticated_users au
    where au.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
);

create policy "Patients insert own"
on public.patients for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
  or user_phone in (
    select au.phone from public.authenticated_users au
    where au.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
);

create policy "Patients update own"
on public.patients for update to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
  or user_phone in (
    select au.phone from public.authenticated_users au
    where au.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
)
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
  or user_phone in (
    select au.phone from public.authenticated_users au
    where au.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
);

create policy "Patients delete own"
on public.patients for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
  or user_phone in (
    select au.phone from public.authenticated_users au
    where au.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
);
