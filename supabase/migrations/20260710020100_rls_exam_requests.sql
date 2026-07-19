-- RLS for public.exam_requests (D-15, phase 04 domain)
-- Rule: always enable RLS and create all policies in the same migration file.
-- Enabling RLS without policies immediately denies all authenticated access.
-- Ownership anchor: profiles.auth_user_id = auth.uid() (mirrors storage_exam_requests RLS).
-- Additive only (D-04): no DML, no drops.

alter table public.exam_requests enable row level security;

create policy "Exam requests select own"
on public.exam_requests for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Exam requests insert own"
on public.exam_requests for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Exam requests update own"
on public.exam_requests for update to authenticated
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

create policy "Exam requests delete own"
on public.exam_requests for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);
