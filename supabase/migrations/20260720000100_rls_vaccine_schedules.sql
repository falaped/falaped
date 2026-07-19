-- RLS for the vaccine reference tables (D-07, phase 05).
-- Rule: always enable RLS and create all policies in the SAME migration file.
-- Enabling RLS without a SELECT policy = silent total denial (zero rows, no error).
-- Apply order matters: table -> rls -> seed.
--
-- DELIBERATE DIVERGENCE (D-07): this is the first global-read RLS in the repo.
-- Every other table is owner-scoped via profile_id in (select ... auth.uid()).
-- Here the SELECT policy is `using (true)` — any authenticated doctor reads the
-- identical reference rows. The ABSENCE of a profile_id filter AND the ABSENCE of
-- any insert/update/delete policy are BOTH intentional reference-data design:
-- reads are global, writes are seed-only via migration/service-role. Do NOT "fix"
-- this by adding an owner filter or a write policy.

alter table public.vaccine_schedules enable row level security;
alter table public.vaccine_schedule_items enable row level security;

-- Read: any authenticated user. NO profile_id filter — shared reference data (D-07).
create policy "Vaccine schedules readable by authenticated"
on public.vaccine_schedules for select to authenticated using (true);

create policy "Vaccine schedule items readable by authenticated"
on public.vaccine_schedule_items for select to authenticated using (true);

-- Intentionally NO insert/update/delete policies on either table: writes are
-- seed-only via migration (D-07). Client keys (publishable/authenticated) cannot mutate.
