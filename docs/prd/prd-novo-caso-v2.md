# PRD — Novo caso no painel com workspace Falaped (v2)

**Tipo:** documento de produto as-is  
**Status:** implementado na branch atual  
**Versão:** 2.0  
**Data:** 2026-03-23

---

## 1. Visão e contexto

O FALAPED passa a permitir que o pediatra abra um atendimento diretamente pelo painel, sem depender do início pelo WhatsApp. A jornada começa com a escolha de um paciente e leva a um workspace dedicado, em que o pediatra registra o caso em linguagem natural com apoio do Falaped, usando texto, voz e atalhos de ação.

O produto foi desenhado para atender uma necessidade específica de consultório: transformar o painel em um espaço de raciocínio e registro clínico, e não apenas em uma tela de acompanhamento de casos já existentes. O valor central está em reduzir fricção, manter continuidade do contexto clínico e acelerar tarefas como resumir, sugerir perguntas, calcular IMC, gerar relatório e encerrar o atendimento com segurança.

Na versão atual, a experiência foi refinada para se comportar mais como um ambiente de prontuário assistido. O Falaped adota postura menos intrusiva durante o registro de dados, priorizando confirmação breve e organização do fluxo, enquanto as interações mais opinativas ou exploratórias ficam concentradas em perguntas explícitas e sugestões rápidas.

---

## 2. Problema e oportunidade

### Problema

Antes desta feature, o pediatra não tinha um fluxo dedicado no painel para iniciar um novo atendimento de forma estruturada. A dependência de conversas originadas em outros canais gerava fricção, dispersão do raciocínio e menor previsibilidade na documentação clínica.

### Oportunidade

Criar um workspace único de atendimento no painel, pensado para o contexto do pediatra em consulta, permite:

- abrir um caso a partir de um paciente já cadastrado;
- registrar evolução clínica sem sair do dashboard;
- alimentar o caso por texto ou voz;
- transformar o histórico em insumo útil para resumo, seguimento, relatório e encerramento;
- preservar segurança operacional ao respeitar o caso ativo do WhatsApp quando ele já existe.

### Resultado esperado

O pediatra deve conseguir iniciar o caso rapidamente, registrar os dados do atendimento com fluidez, manter foco visual no chat e obter ajuda do Falaped no momento certo, sem excesso de interferência durante a coleta inicial de informações.

---

## 3. Objetivos e métricas de sucesso

| Objetivo | Como observar sucesso |
|----------|------------------------|
| Reduzir tempo até o primeiro registro útil | O pediatra escolhe o paciente e encontra o composer imediatamente disponível para iniciar o atendimento. |
| Melhorar experiência de registro clínico | O Falaped não interrompe excessivamente o fluxo de escrita do pediatra e responde de forma breve durante captura de dados. |
| Tornar a interface mais focada | A tela permanece visualmente estável, com scroll concentrado no chat e sem perda de contexto. |
| Aumentar utilidade operacional do caso | O histórico gerado no workspace sustenta resumo, perguntas sugeridas, IMC, relatório e encerramento com salvaguardas. |
| Evitar conflito entre canais | O sistema impede concorrência com caso ativo do WhatsApp e conduz o pediatra ao fluxo correto. |
| Melhorar qualidade percebida da IA | O Falaped deixa de repetir lembretes excessivos e passa a atuar mais como apoio contextual e registro assistido. |

---

## 4. Personas e atores

| Ator | Papel |
|------|------|
| **Pediatra autenticado** | Usuário principal. Seleciona paciente, registra informações clínicas, grava áudio, usa atalhos, pede relatório, resumo ou encerramento. |
| **Assistente Falaped** | Assistente de registro e apoio clínico. Confirma dados, responde perguntas, gera saídas úteis e protege ações críticas. |
| **Responsável pela criança** | Não acessa a interface. É destinatário indireto das perguntas sugeridas pelo Falaped para continuidade do caso. |

### Contexto real de uso

O uso acontece em ambiente de consultório, com pressa, alternância entre escuta clínica e digitação, e necessidade de não perder o fio da consulta. Por isso, a interface e o comportamento da IA privilegiam foco, rapidez e baixa interrupção.

---

## 5. Escopo

### 5.1 Dentro do escopo

- entrada explícita de **Novo caso** no painel;
- seleção de paciente antes da abertura do caso;
- criação de caso iniciado pelo painel;
- bloqueio quando existir caso ativo originado no WhatsApp;
- confirmação quando já existir caso ativo iniciado pelo painel;
- workspace dedicado para o atendimento;
- chat persistente com mensagens do pediatra e do Falaped;
- gravação de áudio com transcrição para o rascunho;
- envio manual após transcrição;
- sugestões rápidas e atalhos para ações frequentes;
- comportamento mais passivo do Falaped durante registro clínico;
- resumo, perguntas ao responsável, IMC, relatório e encerramento com regras de segurança;
- relatório apresentado no chat como mensagem-anexo de arquivo clicável;
- retorno seguro para listagem de casos;
- descarte do caso quando não houve nenhuma mensagem do pediatra.

### 5.2 Fora do escopo

- streaming palavra a palavra da resposta da IA;
- upload funcional de anexos além do relatório gerado;
- colaboração em tempo real entre múltiplos usuários;
- experiência mobile otimizada como objetivo principal da versão atual;
- tutorial guiado e bloqueante de primeiro uso.

---

## 6. Requisitos funcionais

**RF-01** — O sistema deve permitir abrir um novo caso pelo painel somente após seleção de um paciente válido.

**RF-02** — O sistema deve verificar conflito com casos ativos antes da criação.

**RF-03** — O sistema deve bloquear a abertura de novo caso quando houver um caso ativo originado no WhatsApp para o mesmo telefone profissional.

**RF-04** — O sistema deve solicitar confirmação quando já houver caso ativo iniciado pelo painel.

**RF-05** — O sistema deve abrir um workspace dedicado para casos iniciados pelo painel.

**RF-06** — O workspace deve persistir todas as mensagens do pediatra e do Falaped no histórico do caso.

**RF-07** — O composer deve aceitar texto multilinha, atalho de envio e quebra de linha sem disparo acidental.

**RF-08** — O sistema deve permitir gravar áudio, pausar, retomar e transcrever para português.

**RF-09** — A transcrição deve ser inserida no rascunho e nunca enviada automaticamente.

**RF-10** — O Falaped deve responder de modo breve e passivo quando identificar que o pediatra está apenas registrando dados do prontuário.

**RF-11** — O Falaped deve interagir de forma mais analítica quando o pediatra fizer pergunta explícita ou acionar um comando.

**RF-12** — O sistema deve oferecer atalhos de ação em menu sob demanda.

**RF-13** — O sistema deve oferecer sugestões rápidas contextuais próximas ao composer.

**RF-14** — O sistema deve suportar pedidos de resumo, perguntas ao responsável, IMC, relatório e encerramento.

**RF-15** — O relatório só pode ser gerado quando existir histórico clínico mínimo.

**RF-16** — O encerramento do caso deve ocorrer apenas após confirmação explícita.

**RF-17** — O relatório gerado deve aparecer no chat como uma mensagem com representação visual de arquivo.

**RF-18** — Ao clicar na mensagem de relatório, o sistema deve iniciar o download do PDF correspondente.

**RF-19** — O sistema deve permitir trocar o paciente associado ao caso sem recriar o histórico.

**RF-20** — Ao sair do workspace sem mensagens do pediatra, o sistema deve pedir confirmação para descartar.

**RF-21** — Com mensagens já enviadas pelo pediatra, o retorno à listagem não deve depender de modal de descarte.

---

## 7. Requisitos não funcionais

- **Tom e idioma:** toda a experiência deve permanecer em PT-BR, com linguagem profissional e compatível com o contexto pediátrico.
- **Acessibilidade:** botões, atalhos, estado de transcrição, indicador de processamento e mensagens de erro devem ser legíveis por tecnologias assistivas.
- **Foco visual:** a tela deve permanecer com altura máxima do viewport e o scroll deve acontecer apenas na seção de mensagens do chat.
- **Hierarquia visual:** fundo mais escuro que os cards, cards mais claros e conteúdo centralizado em blocos com contraste suficiente.
- **Performance percebida:** a digitação do assistente não deve piscar; o envio do pediatra deve parecer imediato.
- **Robustez:** falhas de IA ou transcrição devem resultar em mensagens claras, humanas e recuperáveis.
- **Privacidade:** somente o pediatra dono do perfil pode acessar o caso e o seu histórico.

---

## 8. Fluxos e estados

### 8.1 Macrofluxo

1. O pediatra entra em **Novo caso** no painel.
2. Escolhe um paciente em uma lista pesquisável.
3. O sistema verifica conflitos com casos ativos.
4. Se não houver bloqueio, o caso é aberto no workspace.
5. O pediatra registra informações por texto ou voz.
6. O Falaped confirma, ajuda ou executa ações conforme o momento da conversa.
7. Quando apropriado, o pediatra pede relatório, resumo, perguntas ou encerramento.
8. O caso pode ser fechado, mantido ativo ou descartado conforme o estado do histórico.

### 8.2 Tela de seleção de paciente

#### Objetivo da tela

Reduzir fricção entre intenção e início do atendimento. O pediatra precisa encontrar a criança rapidamente e começar o caso sem esforço cognitivo extra.

#### Estrutura visual

- título e descrição curtos;
- campo de busca por nome do paciente ou responsável;
- cartões de pacientes com informações essenciais;
- botão para iniciar caso;
- estado vazio orientando cadastro de paciente;
- diálogo de confirmação quando já existe caso ativo no painel.

#### Comportamentos

- se houver caso ativo do WhatsApp, a criação é bloqueada e o pediatra é direcionado ao caso correto;
- se houver caso ativo do painel, o sistema pede confirmação antes de substituí-lo;
- se não houver conflitos, o workspace abre diretamente.

### 8.3 Tela de workspace

#### Objetivo da tela

Ser um ambiente de prontuário assistido, em que o pediatra consegue registrar, revisar e transformar o caso sem disputar atenção com elementos secundários.

#### Estrutura visual atual

**1. Shell do app com sidebar geral**

O workspace aparece dentro da navegação principal do dashboard, preservando familiaridade com o restante do produto.

**2. Header do caso**

O header concentra:

- nome da paciente;
- status do caso;
- responsável;
- dados essenciais do paciente;
- ações de trocar paciente, abrir detalhes, acessar atalhos e sair.

O texto decorativo e descrições redundantes foram removidos para priorizar informação útil.

**3. Área central do chat**

O chat é o bloco dominante da tela. Toda a parte rolável da experiência fica concentrada nele. A página não deve se mover verticalmente; o histórico cresce apenas dentro da área de mensagens.

**4. Footer do chat**

O footer concentra:

- sugestões rápidas contextuais;
- campo multilinha;
- feedback de transcrição;
- controles de voz;
- botão de envio.

#### Hierarquia visual

- **Primário:** histórico da conversa;
- **Secundário:** composer e sugestões rápidas;
- **Terciário:** dados do paciente e ações do caso.

#### Estados principais

| Estado | Comportamento |
|--------|----------------|
| Primeiro acesso | Empty state com explicação curta e profissional |
| Digitando dados | O Falaped confirma sem interromper excessivamente |
| Fazendo pergunta | O Falaped responde de forma mais interativa |
| Gerando relatório | O retorno aparece como mensagem de arquivo no chat |
| Gravando áudio | Tempo e estado de gravação ficam visíveis |
| Transcrevendo | Feedback textual aparece no footer |
| Erro | O sistema informa de forma clara e mantém controle com o pediatra |
| Fechando sem mensagens | Exibe confirmação de descarte |

---

## 9. Dados e integrações

### Entidades centrais

- **Paciente**: identidade da criança, responsável e dados clínicos já cadastrados.
- **Caso**: atendimento ativo ou encerrado, com origem própria do painel ou do WhatsApp.
- **Mensagens**: histórico do pediatra e do Falaped.
- **Relatório**: saída estruturada gerada a partir do histórico do caso.

### Integrações externas

- transcrição de áudio para converter fala em texto;
- IA conversacional para respostas, resumo, perguntas sugeridas e resumo de contexto;
- geração de PDF para o relatório do caso.

### Papel do histórico

O histórico do chat é a base do valor da feature. Ele alimenta:

- continuidade clínica;
- sugestões rápidas;
- resumo fiel;
- geração de relatório;
- contexto de encerramento.

---

## 10. User stories e critérios de aceite

### US-01 — Abrir um caso pelo painel

**Como** pediatra  
**Quero** escolher um paciente e abrir um atendimento pelo painel  
**Para** iniciar a documentação clínica sem depender do WhatsApp

**Critérios de aceite:**

- a criação exige seleção prévia de paciente;
- conflito com caso do WhatsApp bloqueia o fluxo;
- conflito com caso do painel pede confirmação;
- após sucesso, o workspace é aberto.

### US-02 — Registrar informações com fluidez

**Como** pediatra  
**Quero** registrar dados em sequência no chat  
**Para** manter o ritmo da consulta

**Critérios de aceite:**

- o composer aceita texto multilinha;
- o envio é rápido e com feedback imediato;
- o Falaped responde de forma breve quando detectar modo de registro;
- o histórico fica salvo ao recarregar.

### US-03 — Usar voz sem perder controle

**Como** pediatra  
**Quero** ditar trechos do caso  
**Para** reduzir digitação durante a consulta

**Critérios de aceite:**

- é possível gravar, pausar, retomar e transcrever;
- a transcrição vai para o rascunho;
- o envio continua sendo decisão do pediatra;
- falhas de áudio ou transcrição são comunicadas claramente.

### US-04 — Acionar ajuda no momento certo

**Como** pediatra  
**Quero** usar atalhos e sugestões rápidas  
**Para** pedir apoio sem quebrar meu fluxo

**Critérios de aceite:**

- atalhos ficam disponíveis em menu dedicado;
- sugestões aparecem próximas ao composer;
- o conjunto de sugestões evolui conforme o conteúdo do caso;
- ações críticas continuam protegidas por regras.

### US-05 — Gerar um relatório do caso

**Como** pediatra  
**Quero** gerar relatório a partir do que já registrei  
**Para** transformar a conversa em documentação útil

**Critérios de aceite:**

- o sistema exige conversa mínima antes de gerar;
- quando disponível, o retorno aparece no chat como um arquivo;
- ao clicar, o PDF é baixado;
- se a base estiver insuficiente, o Falaped explica o motivo.

### US-06 — Encerrar ou descartar com segurança

**Como** pediatra  
**Quero** sair ou encerrar o caso sem risco de perda involuntária  
**Para** manter segurança operacional

**Critérios de aceite:**

- encerramento exige confirmação explícita;
- descarte só é permitido quando ainda não houve mensagem do pediatra;
- com histórico já iniciado, sair retorna à lista de casos sem modal desnecessário.

---

## 11. Priorização

### Must

- seleção de paciente;
- checagem de conflito entre canais;
- workspace com chat persistente;
- transcrição para rascunho;
- modo passivo do Falaped durante registro;
- atalhos e sugestões rápidas;
- relatório com salvaguarda;
- encerramento com confirmação;
- scroll restrito ao chat.

### Should

- refino progressivo das sugestões para tipos de consulta específicos, como puericultura;
- maior especialização do Falaped por tipo de atendimento;
- enriquecimento visual futuro de anexos além do relatório.

### Could

- tutorial leve não bloqueante;
- mais variações de atalhos por especialidade de fluxo;
- automações adicionais de seguimento.

### Won’t (agora)

- streaming de resposta em tempo real;
- upload de anexos gerais;
- experiência multiusuário simultânea;
- mobile como experiência principal da feature.

---

## 12. Riscos, gargalos e premissas

| Item | Tipo | Mitigação |
|------|------|-----------|
| IA ainda soar ativa demais em certos contextos | Risco UX | Manter postura passiva por padrão e deslocar sugestões para área de atalhos e sugestões rápidas |
| Relatório ser pedido cedo demais | Risco de produto | Exigir histórico mínimo antes da geração |
| Crescimento do histórico impactar fluidez | Risco técnico e UX | Resumo rolante de contexto e scroll concentrado no chat |
| Dependência de transcrição e IA | Risco operacional | Mensagens claras de indisponibilidade e retry |
| Confusão entre caso do painel e caso do WhatsApp | Risco operacional | Bloqueio explícito e redirecionamento ao fluxo correto |

---

## 13. Plano de rollout

- feature disponível no ambiente configurado do painel;
- comunicação orientada ao valor: abrir caso no painel, registrar por voz e gerar relatório;
- adoção natural por pediatras já habituados a pacientes, casos e relatórios no dashboard.

---

## 14. Perguntas em aberto

1. A próxima evolução deve priorizar especialização por tipo de consulta, como puericultura, pronto atendimento ou seguimento?
2. O menu de atalhos deve se tornar adaptativo também por perfil de uso do pediatra?
3. A mensagem-anexo de relatório deve futuramente suportar outras ações no próprio chat, como visualizar ou compartilhar?

---

## 15. MUDANÇAS PEDIDAS APOS IMPLEMENTAÇÃO

Esta seção registra os ajustes solicitados após a primeira versão visual e comportamental da feature.

### 15.1 Ajustes visuais e de layout

- o fundo do workspace foi escurecido levemente em relação aos cards, para reforçar foco visual;
- informações duplicadas do paciente foram removidas de áreas redundantes;
- a sidebar interna do caso foi eliminada em favor da sidebar geral do app;
- os dados do paciente passaram a ficar no header;
- os atalhos deixaram de ocupar espaço fixo na tela e passaram para um botão com menu;
- as sugestões rápidas foram reposicionadas para a área imediatamente acima do footer do chat;
- textos explicativos excessivos do header foram removidos;
- o scroll da página inteira passou a ser tratado como problema e a meta visual ficou clara: apenas o chat deve rolar;
- a altura máxima da experiência passou a ser tratada como equivalente ao viewport, preservando estabilidade visual.

### 15.2 Ajustes no comportamento do Falaped

- o Falaped deixou de repetir lembretes longos sobre dados já fornecidos;
- respostas excessivamente didáticas ou redundantes foram desincentivadas;
- o foco principal do Falaped passou a ser registrar as informações do pediatra;
- durante lançamento de prontuário, o assistente responde de forma curta e não interrogativa;
- lembretes e próximos passos passaram a ser mais apropriados para sugestões rápidas do que para o corpo principal da conversa;
- o assistente passou a interagir de forma mais rica principalmente quando o pediatra faz uma pergunta explícita.

### 15.3 Ajustes na forma de entregar valor

- o relatório passou a ser apresentado como mensagem de arquivo dentro do chat;
- isso aproxima a experiência de uma conversa real com assistente, em vez de uma ação separada e distante do contexto do histórico;
- o clique direto no arquivo reforça a percepção de continuidade entre conversa, geração e uso do documento.

---

## 16. Valor gerado para o usuário

O valor desta feature não está apenas em “abrir um novo caso”, mas em transformar o painel em um espaço funcional de trabalho clínico.

Hoje, o pediatra ganha:

- um caminho rápido para iniciar atendimentos pelo painel;
- um ambiente de registro mais próximo do raciocínio natural da consulta;
- redução de carga operacional ao usar voz, atalhos e sugestões;
- documentação progressiva e reaproveitável do caso;
- um Falaped mais alinhado ao papel de apoio e menos intrusivo;
- um fluxo mais seguro para relatório, encerramento e convivência com o WhatsApp.

Em termos de experiência, a feature gera valor porque combina foco, contexto, continuidade e conversão prática do histórico em saídas úteis. Em termos de produto, ela aproxima o FALAPED de uma ferramenta central de condução do atendimento, e não apenas de acompanhamento posterior.
