-- RLS for public.guidance_documents (D-15, phase 04 domain)
-- Rule: always enable RLS and create all policies in the same migration file.
-- Enabling RLS without policies immediately denies all authenticated access.
-- Ownership anchor: profiles.auth_user_id = auth.uid() (mirrors storage_guidance_documents RLS).
-- Additive only (D-04): no DML, no drops.

alter table public.guidance_documents enable row level security;

create policy "Guidance documents select own"
on public.guidance_documents for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Guidance documents insert own"
on public.guidance_documents for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Guidance documents update own"
on public.guidance_documents for update to authenticated
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

create policy "Guidance documents delete own"
on public.guidance_documents for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
