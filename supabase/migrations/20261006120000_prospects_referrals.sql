-- Indicações diretas no funil: pediatras indicados por alguém (ex.: Dra. Gabriela Marinho).
-- Ficam numa seção própria, contam como quentes e só recebem os modelos do momento
-- "indicacao", que sempre dizem quem indicou ({indicado_por}).

alter table public.prospects drop constraint prospects_origin_check;
alter table public.prospects
  add constraint prospects_origin_check check (origin in ('captacao', 'landing', 'manual', 'indicacao')),
  add column referred_by text,
  add column referral_group text;

comment on column public.prospects.referred_by is 'Quem indicou (ex.: "Dra. Gabriela Marinho"). Preenchido = indicação: as mensagens citam essa pessoa.';
comment on column public.prospects.referral_group is 'Grupo da lista de quem indicou (ex.: "FOB · Consultório", "Barbacena").';

alter table public.prospect_events drop constraint prospect_events_kind_check;
alter table public.prospect_events add constraint prospect_events_kind_check check (kind in (
  'captado', 'lead', 'indicacao', 'email', 'whatsapp', 'telefone', 'nota', 'etapa',
  'entregue', 'aberto', 'clicou', 'bounce', 'reclamou'
));

alter table public.message_templates drop constraint message_templates_moment_check;
alter table public.message_templates add constraint message_templates_moment_check check (moment in (
  'convite', 'indicacao', 'follow-up', 'boas-vindas', 'ajuda', 'teste-acabando', 'pagamento', 'reativacao'
));

-- Modelos de indicação. {indicado_por} = prospects.referred_by.
insert into public.message_templates (moment, channel, name, subject, body) values
('indicacao', 'whatsapp', 'Indicação · primeiro contato', null,
'Olá, {tratamento}! Tudo bem? A {indicado_por} me passou seu contato e achou que você ia gostar de conhecer o Falaped.

Sou o {remetente}, CEO do Falaped. Criamos um assistente de IA para o consultório pediátrico:

• Você grava um áudio ou digita o que observou na consulta, e a IA deixa evolução, receita, atestado e pedido de exame prontos para revisar.
• Você aplica mais de 20 escalas pediátricas (M-CHAT-R, PEWS, FLACC, Glasgow, Apgar e outras), já filtradas pela idade da criança, e o resultado entra no relatório.
• A IA lê laudos de exame por foto e, na consulta seguinte, mostra o resumo da anterior e o que ficou pendente.

Que tal uma chamada de vídeo rápida, de alguns minutinhos, para eu apresentar o Falaped? Você escolhe o melhor horário.
Se quiser conhecer antes: {link}

Também deixei no site ferramentas gratuitas para o dia a dia, como calculadora de dose, curva de crescimento e calendário vacinal: https://falaped.com.br/ferramentas'),
('indicacao', 'whatsapp', 'Indicação · follow-up', null,
'Oi, {tratamento}! Aqui é o {remetente}, do Falaped. Escrevi há alguns dias, por indicação da {indicado_por}, e queria saber se você conseguiu ver a mensagem.

Uma chamada de vídeo de alguns minutinhos é suficiente para você ver na prática como o Falaped organiza a consulta, filtra as escalas pela idade da criança e deixa os documentos prontos para revisar. Você escolhe o melhor horário.

Enquanto isso, as ferramentas gratuitas do site ficam à sua disposição: https://falaped.com.br/ferramentas'),
('indicacao', 'email', 'Indicação · relato', '{tratamento}, a {indicado_por} me passou seu contato',
'Olá, {tratamento},

Sou {remetente}, CEO do Falaped. A {indicado_por} me passou seu contato e achou que você ia gostar de conhecer o que estamos construindo.

Ouvi de muitos pediatras a mesma história: a consulta termina, a criança já saiu, e o médico continua no teclado, escrevendo evolução, receita, atestado e relatório para a escola.

Criamos o Falaped, assistente de IA para o consultório pediátrico, para tirar esse trabalho das suas costas:

• Você grava um áudio ou digita o que observou na consulta, e a IA deixa evolução, receita, atestado e pedido de exame prontos para revisar.
• Você aplica mais de 20 escalas pediátricas (M-CHAT-R, PEWS, FLACC, Glasgow, Apgar e outras), já filtradas pela idade da criança, e o resultado entra no relatório.
• A IA lê laudos de exame por foto ou PDF e, na consulta seguinte, mostra o resumo da anterior e o que ficou pendente.

Que tal uma chamada de vídeo rápida, de alguns minutinhos, para eu apresentar o Falaped? É só responder este e-mail com o melhor dia e horário para você. Se preferir conhecer antes, está tudo em {link}

Também deixei no site ferramentas gratuitas para o dia a dia do consultório, como calculadora de dose pediátrica, curva de crescimento da OMS, percentil de IMC e calendário vacinal 2026: https://falaped.com.br/ferramentas

P.S.: Se não for o momento, responda "não", e eu não escrevo de novo.');
