-- Funil do admin: lead da landing (lp_leads) e prospect captado viram a mesma pessoa
-- em `prospects`, com linha do tempo (`prospect_events`), modelos de mensagem por
-- momento (`message_templates`) e histórico de envios (`message_sends`) com a taxa
-- de abertura/clique vinda do webhook da Resend. Tudo só via service role (admin).

-- 1. Etapas: novo → contatado → respondeu, ou perdido (com motivo). "Em teste" e
--    "Cliente" saem do perfil vinculado, não são gravados.
alter table public.prospects drop constraint prospects_status_check;
update public.prospects set status = 'respondeu' where status = 'fechou';
update public.prospects set status = 'perdido' where status = 'descartado';
alter table public.prospects
  add constraint prospects_status_check check (status in ('novo', 'contatado', 'respondeu', 'perdido')),
  add column lost_reason text,
  add column origin text not null default 'captacao' check (origin in ('captacao', 'landing', 'manual')),
  add column lead_at timestamptz,
  add column lead_source text,
  add column replied_at timestamptz,
  -- Últimos 10 dígitos: casa "(31) 99562-6630", "31995626630" e "5531995626630".
  add column phone_key text generated always as (nullif(right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10), '')) stored;

create index prospects_phone_key_idx on public.prospects (phone_key);
create index prospects_email_lower_idx on public.prospects (lower(email));

comment on column public.prospects.lead_at is 'Quando preencheu o formulário da landing (último envio).';
comment on column public.prospects.replied_at is 'Quando o admin marcou que respondeu (temperatura quente).';

-- 2. Linha do tempo.
create table public.prospect_events (
  id bigint generated always as identity primary key,
  prospect_id text not null references public.prospects(id) on delete cascade,
  kind text not null check (kind in (
    'captado', 'lead', 'email', 'whatsapp', 'telefone', 'nota', 'etapa',
    'entregue', 'aberto', 'clicou', 'bounce', 'reclamou'
  )),
  detail text,
  created_at timestamptz not null default now()
);
create index prospect_events_prospect_idx on public.prospect_events (prospect_id, created_at desc);
alter table public.prospect_events enable row level security;
revoke all on public.prospect_events from anon, authenticated;

insert into public.prospect_events (prospect_id, kind, detail, created_at)
select id, 'captado', array_to_string(sources, ', '), created_at from public.prospects;
insert into public.prospect_events (prospect_id, kind, detail, created_at)
select id, 'email', 'Convite frio', invited_at from public.prospects where invited_at is not null;
insert into public.prospect_events (prospect_id, kind, created_at)
select id, last_channel, last_contact_at from public.prospects
where last_channel in ('whatsapp', 'telefone') and last_contact_at is not null;
insert into public.prospect_events (prospect_id, kind, created_at)
select id, email_status, coalesce(last_contact_at, updated_at) from public.prospects
where email_status in ('aberto', 'clicou', 'bounce', 'reclamou');
insert into public.prospect_events (prospect_id, kind, detail, created_at)
select id, 'nota', notes, updated_at from public.prospects where notes <> '';

-- 3. Lead da landing → prospect. Casa por e-mail e, sem e-mail igual, pelo telefone.
create or replace function public.link_lp_lead(l public.lp_leads)
returns void language plpgsql security definer set search_path = public as $$
declare
  target text;
  key text := nullif(right(regexp_replace(coalesce(l.whatsapp, ''), '\D', '', 'g'), 10), '');
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

create or replace function public.lp_lead_to_prospect()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.link_lp_lead(new);
  return new;
end $$;

create trigger lp_leads_to_prospect
  after insert on public.lp_leads
  for each row execute function public.lp_lead_to_prospect();

select public.link_lp_lead(l) from public.lp_leads l order by l.created_at;

-- 4. Modelos de mensagem por momento e canal.
create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  moment text not null check (moment in (
    'convite', 'follow-up', 'boas-vindas', 'ajuda', 'teste-acabando', 'pagamento', 'reativacao'
  )),
  channel text not null check (channel in ('email', 'whatsapp')),
  name text not null,
  subject text,
  body text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.message_templates enable row level security;
revoke all on public.message_templates from anon, authenticated;

-- 5. Envios: um por e-mail mandado ou link de WhatsApp aberto.
create table public.message_sends (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.message_templates(id) on delete set null,
  prospect_id text references public.prospects(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  moment text not null,
  subject text,
  body text not null,
  resend_email_id text,
  status text not null default 'enviado'
    check (status in ('enviado', 'entregue', 'aberto', 'clicou', 'bounce', 'reclamou')),
  created_at timestamptz not null default now(),
  check (prospect_id is not null or profile_id is not null)
);
create index message_sends_template_idx on public.message_sends (template_id);
create index message_sends_resend_idx on public.message_sends (resend_email_id);
create index message_sends_prospect_idx on public.message_sends (prospect_id, created_at desc);
create index message_sends_profile_idx on public.message_sends (profile_id, created_at desc);
alter table public.message_sends enable row level security;
revoke all on public.message_sends from anon, authenticated;

-- 6. Modelos iniciais. Variáveis: {tratamento} (Dr. Marcos), {nome}, {cidade},
--    {remetente}, {dias_teste}, {dias_restantes}, {preco_cheio}, {preco_fundador}, {link}.
--    No e-mail, linha começando com "• " vira destaque e "P.S." sai em cinza.
insert into public.message_templates (moment, channel, name, subject, body) values
('convite', 'email', 'Convite frio · relato', '{tratamento}, um convite para a versão inicial do Falaped',
'Olá, {tratamento},

Sou {remetente}, CEO do Falaped. Seu nome saiu numa seleção que fiz de pediatras de {cidade} e região, e quis escrever pessoalmente.

Construindo o Falaped, ouvi de muitos pediatras a mesma história: a consulta termina, a criança já saiu, e o médico continua no teclado. Evolução, receita, atestado, relatório para a escola.

O Falaped usa inteligência artificial para tirar isso das suas costas. Enquanto você conversa com a família e examina a criança, a IA transcreve a consulta e a transforma em evolução, receita, atestado e relatório, nos seus modelos. Você revisa, assina e chama o próximo.

Estou convidando um grupo pequeno de pediatras de Minas para a versão inicial. Quem entra agora ajuda a decidir o que o Falaped vira, e em troca você tem:

• {dias_teste} dias grátis, sem cartão.
• Fechando dentro desses {dias_teste} dias, o plano sai por {preco_fundador} por mês em vez de {preco_cheio}, e o valor fica enquanto a assinatura durar.

Se fizer sentido para o seu consultório, responda este e-mail dizendo que tem interesse. Eu mesmo faço o seu cadastro e mostro a plataforma em 15 minutos.

P.S.: Se não for o momento, responda "não" que eu não escrevo de novo.'),
('convite', 'whatsapp', 'Convite curto', null,
'Oi, {tratamento}! Aqui é o {remetente}, CEO do Falaped. Criei uma IA que transcreve a consulta pediátrica e já entrega evolução, receita e atestado prontos. Estou liberando {dias_teste} dias grátis para um grupo pequeno de pediatras de Minas. Posso te mostrar em 15 minutos?'),
('follow-up', 'email', 'Follow-up · dúvida rápida', 'Ficou alguma dúvida, {tratamento}?',
'Oi, {tratamento},

Te escrevi há alguns dias sobre o Falaped e quis saber se ficou alguma dúvida.

Se quiser, te mostro em 15 minutos como ele escreve a consulta e gera a receita enquanto você atende. Os {dias_teste} dias grátis continuam valendo.

P.S.: Se não for o momento, responda "não" que eu não escrevo de novo.'),
('follow-up', 'whatsapp', 'Follow-up do convite', null,
'Oi, {tratamento}! Aqui é o {remetente}, do Falaped. Te mandei um convite por e-mail esses dias. Ficou alguma dúvida? Posso te mostrar em 15 minutos como funciona.'),
('boas-vindas', 'whatsapp', 'Boas-vindas ao lead', null,
'Oi, {nome}! Aqui é o {remetente}, CEO do Falaped. Vi que você se cadastrou no nosso site, obrigado! Quer que eu te mostre em 15 minutos como o Falaped funciona na sua rotina?'),
('boas-vindas', 'email', 'Boas-vindas à conta nova', 'Bem-vindo ao Falaped, {tratamento}',
'Oi, {tratamento},

Aqui é o {remetente}, CEO do Falaped. Vi que sua conta foi criada e quis te dar as boas-vindas pessoalmente.

O jeito mais rápido de sentir o Falaped é cadastrar um paciente e gravar uma consulta: em segundos você tem a evolução e a receita prontas para revisar.

Se travar em qualquer coisa, responda este e-mail que eu mesmo te ajudo.'),
('ajuda', 'whatsapp', 'Oferecer ajuda para começar', null,
'Oi, {nome}! Aqui é o {remetente}, do Falaped. Vi que você ainda não começou a usar. Quer que eu te ajude a configurar em 15 minutos? Deixo seus modelos de receita prontos.'),
('teste-acabando', 'whatsapp', 'Teste acabando', null,
'Oi, {nome}! Aqui é o {remetente}, do Falaped. Seu teste grátis acaba em {dias_restantes}. Como está sendo? Se quiser continuar, consigo manter o preço de fundador de {preco_fundador} por mês para você.'),
('teste-acabando', 'email', 'Teste acabando · preço de fundador', 'Seu teste do Falaped acaba em {dias_restantes}',
'Oi, {tratamento},

Seu teste grátis do Falaped acaba em {dias_restantes}. Queria saber como está sendo e se posso ajudar em algo.

Fechando agora, o plano fica em {preco_fundador} por mês em vez de {preco_cheio}, e esse valor vale enquanto a assinatura durar. É só responder este e-mail que eu te mando o Pix.'),
('pagamento', 'whatsapp', 'Renovação da assinatura', null,
'Oi, {nome}! Aqui é o {remetente}, do Falaped. Sua assinatura vence nos próximos dias. Quer que eu te mande o Pix para renovar?'),
('reativacao', 'whatsapp', 'Senti sua falta', null,
'Oi, {nome}! Aqui é o {remetente}, do Falaped. Senti sua falta por aqui! Aconteceu alguma coisa? Se algo atrapalhou, me conta que eu resolvo.'),
('reativacao', 'email', 'Reativação · o que mudou', 'O que mudou no Falaped, {tratamento}',
'Oi, {tratamento},

Faz um tempo que você não aparece no Falaped e quis saber se algo atrapalhou. Cada resposta que recebo vira melhoria no produto.

Se quiser voltar, sua conta e seus pacientes continuam lá. E se preferir, te mostro em 15 minutos o que mudou.');

-- Os convites já enviados contam para o modelo "Convite frio · relato".
insert into public.message_sends (template_id, prospect_id, channel, moment, subject, body, resend_email_id, status, created_at)
select t.id, p.id, 'email', 'convite', null, '', p.resend_email_id, coalesce(p.email_status, 'enviado'), p.invited_at
from public.prospects p
cross join (select id from public.message_templates where name = 'Convite frio · relato') t
where p.invited_at is not null;
