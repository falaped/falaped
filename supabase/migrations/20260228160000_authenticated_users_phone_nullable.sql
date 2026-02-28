-- Allow authenticated_users.phone to be null so "unlink WhatsApp" can clear the phone.
-- Bot and getAuthenticatedUserPhone already treat missing/null phone as unlinked.

alter table public.authenticated_users
  alter column phone drop not null;
