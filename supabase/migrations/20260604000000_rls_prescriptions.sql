-- RLS for public.prescriptions (SEC-02, domain 1/5)
-- Rule: always enable RLS and create all policies in the same migration file.
-- Enabling RLS without policies immediately denies all authenticated access.
-- Ownership anchor: profiles.auth_user_id = auth.uid() (mirrors storage_prescriptions RLS).
-- Additive only (D-04): no DML, no drops. Reversal: supabase/docs/rls-reversals.sql.

alter table public.prescriptions enable row level security;

create policy "Prescriptions select own"
on public.prescriptions for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Prescriptions insert own"
on public.prescriptions for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Prescriptions update own"
on public.prescriptions for update to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
)
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Prescriptions delete own"
on public.prescriptions for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
