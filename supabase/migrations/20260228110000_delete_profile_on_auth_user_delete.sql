-- When an auth user is deleted, remove their profile so no orphan row remains.

create or replace function public.handle_auth_user_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.profiles
  where auth_user_id = old.id;
  return old;
end;
$$;

comment on function public.handle_auth_user_deleted() is
  'Trigger function: delete from public.profiles when auth.users row is deleted.';

create trigger on_auth_user_deleted
  before delete on auth.users
  for each row execute function public.handle_auth_user_deleted();
