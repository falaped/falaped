-- RLS for public.cases + public.case_messages (SEC-02, domain 4/5)
-- Rule: always enable RLS and create all policies in the same migration file.
--
-- Cases ownership model (decided from live data via MCP, 2026-06-04):
--   SELECT origin, count(*), count(profile_id) FROM cases GROUP BY origin
--   => dashboard: 32/32 with profile_id (no WhatsApp-origin rows yet)
--   profile_id is reliable TODAY, but the app also reads cases by user_phone
--   (get-case-by-id, get-cases-by-patient-id resolve phone via authenticated_users),
--   and future WhatsApp-origin cases may carry user_phone without profile_id.
--   => dual anchor: profile_id OR user_phone, no security definer helper needed
--   (avoids the auth_user_phone() attack surface entirely — T-01-09).
--
-- case_messages has no ownership column; it inherits ownership from its parent case.
-- Indexes: idx_cases_profile_id_*, idx_cases_user_phone_*, idx_authenticated_users_phone,
-- idx_case_messages_case_id_created_at all pre-exist (Pitfall 3 verified — none added).
-- Additive only (D-04). Reversal: supabase/docs/rls-reversals.sql.

alter table public.cases enable row level security;

create policy "Cases select own"
on public.cases for select to authenticated
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

create policy "Cases insert own"
on public.cases for insert to authenticated
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

create policy "Cases update own"
on public.cases for update to authenticated
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

create policy "Cases delete own"
on public.cases for delete to authenticated
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

-- case_messages: ownership via parent case (case_id -> cases.id).
-- The subquery on public.cases runs as the calling role, so the cases policies
-- above already restrict it to the user's own cases; the explicit predicate is
-- repeated for clarity and so this policy stands alone if cases policies change.

alter table public.case_messages enable row level security;

create policy "Case Messages select own"
on public.case_messages for select to authenticated
using (
  case_id in (
    select c.id from public.cases c
    where c.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
    or c.user_phone in (
      select au.phone from public.authenticated_users au
      where au.profile_id in (
        select id from public.profiles where auth_user_id = auth.uid()
      )
    )
  )
);

create policy "Case Messages insert own"
on public.case_messages for insert to authenticated
with check (
  case_id in (
    select c.id from public.cases c
    where c.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
    or c.user_phone in (
      select au.phone from public.authenticated_users au
      where au.profile_id in (
        select id from public.profiles where auth_user_id = auth.uid()
      )
    )
  )
);

create policy "Case Messages update own"
on public.case_messages for update to authenticated
using (
  case_id in (
    select c.id from public.cases c
    where c.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
    or c.user_phone in (
      select au.phone from public.authenticated_users au
      where au.profile_id in (
        select id from public.profiles where auth_user_id = auth.uid()
      )
    )
  )
)
with check (
  case_id in (
    select c.id from public.cases c
    where c.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
    or c.user_phone in (
      select au.phone from public.authenticated_users au
      where au.profile_id in (
        select id from public.profiles where auth_user_id = auth.uid()
      )
    )
  )
);

create policy "Case Messages delete own"
on public.case_messages for delete to authenticated
using (
  case_id in (
    select c.id from public.cases c
    where c.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
    or c.user_phone in (
      select au.phone from public.authenticated_users au
      where au.profile_id in (
        select id from public.profiles where auth_user_id = auth.uid()
      )
    )
  )
);
