-- Marks that the phone was linked via the WhatsApp code flow (bot), not just signup.
-- Dashboard shows "Conta vinculada" only when whatsapp_linked_at is set and phone is set.

alter table public.authenticated_users
  add column if not exists whatsapp_linked_at timestamptz null;

comment on column public.authenticated_users.whatsapp_linked_at is
  'Set when the user linked their WhatsApp via the code flow (bot). Null = not linked via WhatsApp.';
