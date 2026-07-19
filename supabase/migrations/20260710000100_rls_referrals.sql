-- RLS for public.referrals (D-15, phase 04 domain)
-- Rule: always enable RLS and create all policies in the same migration file.
-- Enabling RLS without policies immediately denies all authenticated access.
-- Ownership anchor: profiles.auth_user_id = auth.uid() (mirrors storage_referrals RLS).
-- Additive only (D-04): no DML, no drops.

alter table public.referrals enable row level security;

create policy "Referrals select own"
on public.referrals for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Referrals insert own"
on public.referrals for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Referrals update own"
on public.referrals for update to authenticated
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

create policy "Referrals delete own"
on public.referrals for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
