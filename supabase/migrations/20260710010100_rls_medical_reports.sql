-- RLS for public.medical_reports (D-15, phase 04 domain)
-- Rule: always enable RLS and create all policies in the same migration file.
-- Enabling RLS without policies immediately denies all authenticated access.
-- Ownership anchor: profiles.auth_user_id = auth.uid() (mirrors storage_medical_reports RLS).
-- Additive only (D-04): no DML, no drops.

alter table public.medical_reports enable row level security;

create policy "Medical reports select own"
on public.medical_reports for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Medical reports insert own"
on public.medical_reports for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Medical reports update own"
on public.medical_reports for update to authenticated
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

create policy "Medical reports delete own"
on public.medical_reports for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
