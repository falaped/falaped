-- Create profile in public.profiles when a new auth user is created (signup).
-- Uses raw_user_meta_data from signUp options.data (full_name, phone).
-- Only inserts when phone is present (required for our flow; profiles.phone is unique).

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data->>'phone' is not null
     and trim(coalesce(new.raw_user_meta_data->>'phone', '')) <> '' then
    insert into public.profiles (id, auth_user_id, phone, full_name, email, created_at, updated_at)
    values (
      gen_random_uuid(),
      new.id,
      new.raw_user_meta_data->>'phone',
      coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), ''),
      new.email,
      now(),
      now()
    );
  end if;
  return new;
end;
$$;

comment on function public.handle_new_auth_user() is
  'Trigger function: insert into public.profiles after auth.users insert (signup).';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
