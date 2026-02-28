-- Table for WhatsApp linking codes: dashboard generates code, user sends it in WhatsApp, bot validates and links phone to profile.

create table public.phone_link_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz null
);

create index idx_phone_link_codes_code_unused on public.phone_link_codes (code)
  where used_at is null;

comment on table public.phone_link_codes is
  'One-time codes for linking WhatsApp phone to dashboard account (profile_id). Dashboard creates; bot consumes and sets used_at when linking.';
