-- RLS for the remaining public.* tables (SEC-02, domain 5/5)
-- Authoritative table list confirmed via MCP pg_tables query (2026-06-04).
-- Per-table ownership columns confirmed via information_schema before writing
-- each policy (A4/A6 — nothing assumed).
--
-- Covered here:
--   profiles               -> auth_user_id = auth.uid()
--   authenticated_users    -> profile_id anchor (app reads/updates own row)
--   case_reports           -> profile_id anchor (NOT NULL)
--   prescription_templates -> profile_id anchor (NOT NULL)
--   report_templates       -> user_id = auth.uid() (FK -> profiles.auth_user_id);
--                             select also allows is_default = true (shared default,
--                             user_id NULL — read by get-default-report-template)
--   phone_link_codes       -> profile_id anchor (NOT NULL; user client inserts/deletes)
--   discussions            -> dual anchor profile_id OR user_phone (same model as cases)
--   discussion_messages    -> via parent discussion
--   incoming_webhook_events-> phone anchor, select/delete only (delete-case.ts cleans
--                             these up with the USER client; writers are service_role)
--   trigger_buffer_runs    -> phone anchor, select/delete only (same delete-case flow)
--   leads, lp_leads        -> RLS enabled with NO client policies: zero app access
--                             (verified by repo-wide grep); written only by external
--                             integrations using service_role, which bypasses RLS.
--                             Deny-all for client roles is the INTENDED end state for
--                             these system tables, not an accidental enable-only.
--
-- Service-role / trigger paths are unaffected: service_role has bypassrls and the
-- table owner is exempt (RLS is not FORCEd). handle_new_auth_user /
-- handle_auth_user_deleted are security definer — profile lifecycle keeps working.
-- Additive only (D-04). Reversal: supabase/docs/rls-reversals.sql.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Profiles select own"
on public.profiles for select to authenticated
using (auth_user_id = auth.uid());

create policy "Profiles insert own"
on public.profiles for insert to authenticated
with check (auth_user_id = auth.uid());

create policy "Profiles update own"
on public.profiles for update to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create policy "Profiles delete own"
on public.profiles for delete to authenticated
using (auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- authenticated_users
-- ---------------------------------------------------------------------------
alter table public.authenticated_users enable row level security;

create policy "Authenticated Users select own"
on public.authenticated_users for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Authenticated Users insert own"
on public.authenticated_users for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Authenticated Users update own"
on public.authenticated_users for update to authenticated
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

create policy "Authenticated Users delete own"
on public.authenticated_users for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- case_reports
-- ---------------------------------------------------------------------------
alter table public.case_reports enable row level security;

create policy "Case Reports select own"
on public.case_reports for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Case Reports insert own"
on public.case_reports for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Case Reports update own"
on public.case_reports for update to authenticated
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

create policy "Case Reports delete own"
on public.case_reports for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- prescription_templates
-- ---------------------------------------------------------------------------
alter table public.prescription_templates enable row level security;

create policy "Prescription Templates select own"
on public.prescription_templates for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Prescription Templates insert own"
on public.prescription_templates for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Prescription Templates update own"
on public.prescription_templates for update to authenticated
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

create policy "Prescription Templates delete own"
on public.prescription_templates for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- report_templates (user_id references profiles.auth_user_id, i.e. auth.uid();
-- the shared project default has user_id NULL + is_default = true and must stay
-- readable by everyone, but only owners can write their own templates)
-- ---------------------------------------------------------------------------
alter table public.report_templates enable row level security;

create policy "Report Templates select own or default"
on public.report_templates for select to authenticated
using (user_id = auth.uid() or is_default = true);

create policy "Report Templates insert own"
on public.report_templates for insert to authenticated
with check (user_id = auth.uid());

create policy "Report Templates update own"
on public.report_templates for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Report Templates delete own"
on public.report_templates for delete to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- phone_link_codes
-- ---------------------------------------------------------------------------
alter table public.phone_link_codes enable row level security;

create policy "Phone Link Codes select own"
on public.phone_link_codes for select to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Phone Link Codes insert own"
on public.phone_link_codes for insert to authenticated
with check (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Phone Link Codes update own"
on public.phone_link_codes for update to authenticated
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

create policy "Phone Link Codes delete own"
on public.phone_link_codes for delete to authenticated
using (
  profile_id in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- discussions (dual anchor — same tenancy model as cases)
-- ---------------------------------------------------------------------------
alter table public.discussions enable row level security;

create policy "Discussions select own"
on public.discussions for select to authenticated
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

create policy "Discussions insert own"
on public.discussions for insert to authenticated
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

create policy "Discussions update own"
on public.discussions for update to authenticated
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

create policy "Discussions delete own"
on public.discussions for delete to authenticated
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

-- ---------------------------------------------------------------------------
-- discussion_messages (via parent discussion)
-- ---------------------------------------------------------------------------
alter table public.discussion_messages enable row level security;

create policy "Discussion Messages select own"
on public.discussion_messages for select to authenticated
using (
  discussion_id in (
    select d.id from public.discussions d
    where d.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
    or d.user_phone in (
      select au.phone from public.authenticated_users au
      where au.profile_id in (
        select id from public.profiles where auth_user_id = auth.uid()
      )
    )
  )
);

create policy "Discussion Messages insert own"
on public.discussion_messages for insert to authenticated
with check (
  discussion_id in (
    select d.id from public.discussions d
    where d.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
    or d.user_phone in (
      select au.phone from public.authenticated_users au
      where au.profile_id in (
        select id from public.profiles where auth_user_id = auth.uid()
      )
    )
  )
);

create policy "Discussion Messages update own"
on public.discussion_messages for update to authenticated
using (
  discussion_id in (
    select d.id from public.discussions d
    where d.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
    or d.user_phone in (
      select au.phone from public.authenticated_users au
      where au.profile_id in (
        select id from public.profiles where auth_user_id = auth.uid()
      )
    )
  )
)
with check (
  discussion_id in (
    select d.id from public.discussions d
    where d.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
    or d.user_phone in (
      select au.phone from public.authenticated_users au
      where au.profile_id in (
        select id from public.profiles where auth_user_id = auth.uid()
      )
    )
  )
);

create policy "Discussion Messages delete own"
on public.discussion_messages for delete to authenticated
using (
  discussion_id in (
    select d.id from public.discussions d
    where d.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
    or d.user_phone in (
      select au.phone from public.authenticated_users au
      where au.profile_id in (
        select id from public.profiles where auth_user_id = auth.uid()
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- incoming_webhook_events (select/delete own-phone only — delete-case.ts cleans
-- these with the user client; inserts come from external webhooks via service_role)
-- ---------------------------------------------------------------------------
alter table public.incoming_webhook_events enable row level security;

create policy "Incoming Webhook Events select own"
on public.incoming_webhook_events for select to authenticated
using (
  phone in (
    select au.phone from public.authenticated_users au
    where au.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
);

create policy "Incoming Webhook Events delete own"
on public.incoming_webhook_events for delete to authenticated
using (
  phone in (
    select au.phone from public.authenticated_users au
    where au.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
);

-- ---------------------------------------------------------------------------
-- trigger_buffer_runs (select/delete own-phone only — same delete-case flow)
-- ---------------------------------------------------------------------------
alter table public.trigger_buffer_runs enable row level security;

create policy "Trigger Buffer Runs select own"
on public.trigger_buffer_runs for select to authenticated
using (
  phone in (
    select au.phone from public.authenticated_users au
    where au.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
);

create policy "Trigger Buffer Runs delete own"
on public.trigger_buffer_runs for delete to authenticated
using (
  phone in (
    select au.phone from public.authenticated_users au
    where au.profile_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  )
);

-- ---------------------------------------------------------------------------
-- leads / lp_leads: system tables with zero app access (repo-wide grep, 2026-06-04).
-- RLS enabled with no client policies = deny-all for anon/authenticated by design;
-- external writers (n8n/webhooks) use service_role, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.leads enable row level security;
alter table public.lp_leads enable row level security;
