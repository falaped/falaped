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
'Oi, {tratamento}! A {indicado_por} me passou seu contato e achou que você ia gostar de conhecer o Falaped.

Sou o {remetente}, CEO do Falaped. Criamos um assistente de IA para o consultório pediátrico:

• Você grava um áudio ou digita o que observou na consulta, e a IA deixa evolução, receita, atestado e pedido de exame prontos para revisar.
• Você aplica mais de 20 escalas pediátricas (M-CHAT-R, PEWS, FLACC, Glasgow, Apgar e outras), já filtradas pela idade da criança, e o resultado entra no relatório.
• A IA lê laudos de exame por foto e, na consulta seguinte, mostra o resumo da anterior e o que ficou pendente.

Que tal uma chamada de vídeo rápida, de alguns minutinhos, para eu apresentar o Falaped? Você escolhe o melhor horário. Se quiser conhecer antes: {link}

Também deixei no site ferramentas gratuitas para o dia a dia, como calculadora de dose, curva de crescimento e calendário vacinal: https://falaped.com.br/ferramentas'),
('indicacao', 'whatsapp', 'Indicação · follow-up', null,
'Oi, {tratamento}! Aqui é o {remetente}, do Falaped, por indicação da {indicado_por}.
Conseguiu ver minha mensagem? Os {dias_teste} dias grátis continuam reservados para você.
Posso te mostrar em 15 minutos como funciona. Se quiser conhecer antes: {link}

Enquanto isso, as ferramentas gratuitas do site (dose pediátrica, curva de crescimento, calendário vacinal) ficam liberadas pra você: https://falaped.com.br/ferramentas'),
('indicacao', 'email', 'Indicação · relato', '{tratamento}, a {indicado_por} me passou seu contato',
'Olá, {tratamento},

Sou {remetente}, CEO do Falaped. A {indicado_por} me passou seu contato e sugeriu que eu te escrevesse.

Construindo o Falaped, ouvi de muitos pediatras a mesma história: a consulta termina, a criança já saiu, e o médico continua no teclado. Evolução, receita, atestado, relatório para a escola.

O Falaped usa inteligência artificial para tirar isso das suas costas. Enquanto você conversa com a família e examina a criança, a IA transcreve a consulta e a transforma em evolução, receita, atestado e relatório, nos seus modelos. Você revisa, assina e chama o próximo.

Por ser indicação da {indicado_por}, você entra direto na versão inicial:

• {dias_teste} dias grátis, sem cartão.
• Fechando dentro desses {dias_teste} dias, o plano sai por {preco_fundador} por mês em vez de {preco_cheio}, e o valor fica enquanto a assinatura durar.

Se fizer sentido para o seu consultório, responda este e-mail dizendo que tem interesse. Eu mesmo faço o seu cadastro e mostro a plataforma em 15 minutos. Se preferir conhecer antes, está tudo em {link}

E um presente, independente do convite: deixei no site ferramentas gratuitas para o dia a dia do consultório, como calculadora de dose pediátrica, curva de crescimento da OMS, percentil de IMC e calendário vacinal 2026. Pode usar à vontade, sem custo: https://falaped.com.br/ferramentas

P.S.: Se não for o momento, responda "não" que eu não escrevo de novo.');
