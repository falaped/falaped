-- Chave de telefone = DDD + 8 últimos dígitos: casa celular com e sem o 9 extra
-- ("553194773759" do perfil e "31994773759" da landing) e com ou sem DDI.
create or replace function public.phone_key(phone text)
returns text language sql immutable as $$
  select case when length(d) in (10, 11) then left(d, 2) || right(d, 8) end
  from (select regexp_replace(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '^55(\d{10,11})$', '\1') as d) x
$$;

drop index public.prospects_phone_key_idx;
alter table public.prospects drop column phone_key;
alter table public.prospects add column phone_key text generated always as (public.phone_key(phone)) stored;
create index prospects_phone_key_idx on public.prospects (phone_key);

create or replace function public.link_lp_lead(l public.lp_leads)
returns void language plpgsql security definer set search_path = public as $$
declare
  target text;
  key text := public.phone_key(l.whatsapp);
  ts timestamptz := coalesce(l.created_at, now());
begin
  select id into target from prospects where lower(email) = lower(l.email) limit 1;
  if target is null and key is not null then
    select id into target from prospects where phone_key = key limit 1;
  end if;

  if target is null then
    target := 'lp-' || l.id;
    insert into prospects (id, name, full_name, email, phone, has_whatsapp, origin, lead_at, lead_source, created_at, updated_at)
    values (target, split_part(trim(l.name), ' ', 1), trim(l.name), l.email, l.whatsapp, l.whatsapp is not null,
            'landing', ts, l.source, ts, ts);
  else
    update prospects set
      lead_at = greatest(coalesce(lead_at, ts), ts),
      lead_source = l.source,
      email = coalesce(email, l.email),
      phone = coalesce(phone, l.whatsapp),
      has_whatsapp = has_whatsapp or l.whatsapp is not null,
      updated_at = now()
    where id = target;
  end if;

  insert into prospect_events (prospect_id, kind, detail, created_at) values (target, 'lead', l.source, ts);
end $$;

-- Vínculo prospect ↔ perfil também pelo telefone (badge "já é assinante").
create or replace function public.link_prospect_from_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.prospects set profile_id = new.id
  where profile_id is null
    and ((new.email is not null and lower(email) = lower(new.email))
      or (public.phone_key(new.phone) is not null and phone_key = public.phone_key(new.phone)));
  return new;
end $$;

drop trigger profiles_link_prospect on public.profiles;
create trigger profiles_link_prospect
  after insert or update of email, phone on public.profiles
  for each row execute function public.link_prospect_from_profile();

create or replace function public.link_profile_from_prospect()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.profile_id is null then
    select id into new.profile_id from public.profiles
    where (new.email is not null and lower(email) = lower(new.email))
       or (public.phone_key(new.phone) is not null and public.phone_key(phone) = public.phone_key(new.phone))
    order by (new.email is not null and lower(email) = lower(new.email)) desc
    limit 1;
  end if;
  return new;
end $$;

drop trigger prospects_link_profile on public.prospects;
create trigger prospects_link_profile
  before insert or update of email, phone on public.prospects
  for each row execute function public.link_profile_from_prospect();

update public.prospects p set profile_id = pr.id
from public.profiles pr
where p.profile_id is null and p.phone_key is not null and public.phone_key(pr.phone) = p.phone_key;
