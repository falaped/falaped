-- authenticated_users had updated_at dropped in phase1 (20260228120000), but a trigger
-- may still be attached that sets NEW.updated_at on UPDATE. Drop any such trigger.

do $$
declare
  tr record;
begin
  for tr in
    select t.tgname
    from pg_trigger t
    join pg_class c on t.tgrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'authenticated_users'
      and not t.tgisinternal
  loop
    execute format('drop trigger if exists %I on public.authenticated_users', tr.tgname);
  end loop;
end
$$;
