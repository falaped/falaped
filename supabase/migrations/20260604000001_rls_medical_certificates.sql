-- RLS for public.medical_certificates (SEC-02, domain 2/5)
-- Rule: always enable RLS and create all policies in the same migration file.
-- Ownership anchor: profiles.auth_user_id = auth.uid().
-- Additive only (D-04). Reversal: supabase/docs/rls-reversals.sql.

alter table public.medical_certificates enable row level security;

create policy "Medical Certificates select own"
on public.medical_certificates for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Medical Certificates insert own"
on public.medical_certificates for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Medical Certificates update own"
on public.medical_certificates for update to authenticated
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

create policy "Medical Certificates delete own"
on public.medical_certificates for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
