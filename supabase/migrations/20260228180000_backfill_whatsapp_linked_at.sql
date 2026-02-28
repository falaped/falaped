-- Backfill: users who already have phone set (linked before column existed or bot not updated)
-- get whatsapp_linked_at = now() so the dashboard shows "Conta vinculada".

update public.authenticated_users
set whatsapp_linked_at = now()
where phone is not null
  and trim(phone) <> ''
  and whatsapp_linked_at is null;
