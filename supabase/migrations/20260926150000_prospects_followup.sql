-- Prospecção: cadência de contato, entrega do e-mail (webhook da Resend) e vínculo
-- com o perfil que se cadastrou — o funil passa a ir de "convidado" até "assinante".
alter table public.prospects
  add column next_contact_at timestamptz,
  add column last_contact_at timestamptz,
  add column last_channel text check (last_channel in ('email', 'whatsapp', 'telefone')),
  add column email_status text check (email_status in ('enviado', 'entregue', 'bounce', 'reclamou')),
  add column resend_email_id text,
  add column profile_id uuid references public.profiles(id) on delete set null;

create index prospects_resend_email_id_idx on public.prospects (resend_email_id);
create index prospects_next_contact_at_idx on public.prospects (next_contact_at);

comment on column public.prospects.next_contact_at is 'Quando o próximo toque vence (e-mail +3 dias, WhatsApp +7 dias).';
comment on column public.prospects.email_status is 'Último evento do convite na Resend: enviado → entregue, ou bounce / reclamou.';
comment on column public.prospects.profile_id is 'Perfil do Falaped que se cadastrou com o mesmo e-mail (casado por trigger).';

-- Vínculo por e-mail, dos dois lados: quando um perfil nasce (ou troca de e-mail) e
-- quando o admin preenche o e-mail do prospect. Backfill para quem já se cadastrou.
create or replace function public.link_prospect_from_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null then
    update public.prospects set profile_id = new.id
    where profile_id is null and lower(email) = lower(new.email);
  end if;
  return new;
end $$;

create or replace function public.link_profile_from_prospect()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null and new.profile_id is null then
    select id into new.profile_id from public.profiles
    where lower(email) = lower(new.email) limit 1;
  end if;
  return new;
end $$;

create trigger profiles_link_prospect
  after insert or update of email on public.profiles
  for each row execute function public.link_prospect_from_profile();

create trigger prospects_link_profile
  before insert or update of email on public.prospects
  for each row execute function public.link_profile_from_prospect();

update public.prospects p set profile_id = pr.id
from public.profiles pr
where p.profile_id is null and p.email is not null and lower(pr.email) = lower(p.email);
