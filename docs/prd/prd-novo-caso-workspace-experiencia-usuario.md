# PRD — Novo caso no painel (workspace com assistente Falaped)

**Tipo:** documento de produto **as-is** — descreve capacidades entregues ao usuário final\
**Versão:** 1.0\
**Data:** 2026-03-23

**Documentos relacionados (contexto de produto):** [chat-falaped-novo-caso.md](./chat-falaped-novo-caso.md), [transcricao-audio-novo-caso.md](./transcricao-audio-novo-caso.md)

***

## 1. Visão e contexto

O pediatra passa a abrir **novos atendimentos** diretamente no painel, em um fluxo dedicado chamado **Novo caso**. Após escolher a criança (paciente), ele entra num **workspace em tela cheia**: à esquerda, contexto do paciente e ações de navegação; ao centro, uma **conversa com o assistente Falaped** que conhece o histórico do thread e os dados do paciente. O pediatra pode **escrever** ou **falar** (áudio gravado no navegador, convertido em texto pela inteligência artificial). A conversa fica salva como parte do caso, alinhada ao mesmo modelo mental dos atendimentos iniciados pelo WhatsApp, mas **sem misturar** com um caso ativo já em curso nesse canal quando as regras de negócio exigem prioridade ao WhatsApp.

**Por que importa:** reduz fricção para quem já está no painel cadastrando ou acompanhando pacientes, centraliza registro clínico em linguagem natural e oferece atalhos inteligentes (chips) para ações frequentes — relatório, resumo, perguntas ao responsável, encerramento — com salvaguardas para não gerar conteúdo vazio ou encerrar sem intenção clara.

***

## 2. Problema e oportunidade

**Dor:** iniciar um atendimento só pelo canal WhatsApp ou fluxos paralelos pode deixar o pediatra sem um lugar único no painel para “pensar em voz alta” com apoio da IA, com histórico único e continuidade.

**Oportunidade:** um workspace focado em produtividade (chat + paciente + comandos em linguagem natural) que respeita a regra de **um caso ativo por telefone** quando já existe conversa viva pelo WhatsApp, evitando sobrescritas acidentais.

**Resultado esperado:** o pediatra consegue, em poucos passos, abrir caso no painel, conversar com o Falaped, transcrever áudio, pedir resumo ou sugestões de perguntas ao responsável, e avançar para relatório ou encerramento quando fizer sentido clínico e houver conteúdo mínimo na conversa.

***

## 3. Objetivos e métricas de sucesso

| Objetivo | Como verificar (qualitativo / operacional) |
|----------|---------------------------------------------|
| Tempo até primeira interação útil com o Falaped | Percepção de “rápido” após escolher paciente; poucos passos até o composer habilitado. |
| Continuidade do contexto em conversas longas | Respostas do assistente continuam coerentes com o início do atendimento; resumo rolante invisível ao usuário mas perceptível na qualidade. |
| Uso de voz sem quebrar o fluxo | Gravação → texto no campo de mensagem → envio explícito pelo pediatra (controle total). |
| Segurança de produto em ações críticas | Relatório e encerramento só quando regras de dados mínimos e confirmação forem atendidas; mensagens claras quando algo não pode ser feito ainda. |
| Convivência com WhatsApp | Se houver caso ativo pelo WhatsApp, o painel **orienta** a abrir esse caso em vez de criar conflito. |

***

## 4. Personas e atores

| Ator | Papel |
|------|--------|
| **Pediatra autenticado** | Usuário principal; cria caso pelo painel, conversa, grava áudio, usa chips, solicita relatório ou encerramento. |
| **Assistente Falaped (IA)** | Responde em português, segue histórico e dados do paciente, executa intenções detectadas (resumo, perguntas ao responsável, IMC, relatório, encerramento com confirmação). |
| **Responsável (fora do painel)** | Não usa a tela; é alvo das *sugestões de perguntas* que o pediatra pode levar para o contato (ex.: WhatsApp). |

**Premissas de acesso:** conta com plano que habilita o assistente e transcrição; telefone profissional válido no perfil (necessário para amarrar o caso ao número usado nas integrações).

***

## 5. Escopo

### 5.1 Dentro do escopo (entregue)

* Rota de entrada **Novo caso** redirecionando para **seleção de paciente**.
* Tela de **seleção de paciente** com lista pesquisável, criação de caso vinculado ao paciente e tratamento de “já existe caso ativo no painel” (avisar antes de substituir).
* **Workspace** do caso: cabeçalho com paciente e saída; área de mensagens; campo de texto com envio por tecla dedicada; gravação de áudio com limites de duração e tamanho; área de **chips** (atalhos) estáticos ou sugeridos por IA após volume mínimo de mensagens.
* **Indicador de “digitando”** enquanto o assistente processa, com duração mínima visível para não “piscar” em respostas rápidas.
* **Mensagens otimistas** para o pediatra (aparecem antes da confirmação do servidor), com reversão e restauração do texto se falhar o envio.
* **Transcrição** com feedback acessível (“transcrevendo”), tratamento de áudio vazio ou suspeito, e possibilidade de tentar de novo em erro.
* **Comandos em linguagem natural** (e chips espelhando esses comandos) para: gerar relatório, encerrar caso, sugerir perguntas ao responsável, calcular IMC, resumir pontos principais, ou simplesmente conversar.
* **Encerramento em duas etapas:** o assistente pede confirmação; só encerra após confirmação explícita do pediatra.
* **Relatório** só quando houver conversa clínica mínima; caso contrário, mensagem explicativa.
* **Resumo** ancorado no histórico; se não houver base suficiente, o sistema recusa com mensagem clara.
* **Sugestões de perguntas ao responsável** só após número mínimo de mensagens do pediatra no thread; fallback amigável se a IA não retornar lista.
* **Sidebar / navegação** alinhada ao fluxo Novo caso.
* **Fechar workspace:** se ainda não houve mensagem do pediatra, diálogo de **descartar consulta**; se já houve, retorno direto à listagem de casos.

### 5.2 Fora do escopo (explícito)

* Resposta do assistente **palavra a palavra em tempo real** (streaming visual).
* Envio automático da transcrição como mensagem — o texto vai para o campo de mensagem e o pediatra **envia quando quiser**.
* Anexo de arquivos pelo botão de clipe: controle pode existir na interface como placeholder, sem pipeline completo de upload para o caso.
* Edição colaborativa ou segundo usuário no mesmo workspace em tempo real.

***

## 6. Requisitos funcionais

**RF-01** — O sistema deve permitir iniciar um **novo caso pelo painel** apenas após seleção de um paciente da lista do pediatra.

**RF-02** — O sistema deve **avisar** quando já existir caso ativo iniciado pelo painel para o mesmo contexto, antes de criar outro, permitindo prosseguir com ciência de que o caso anterior em curso no painel será encerrado ou substituído conforme a regra de produto.

**RF-03** — Se existir **caso ativo originado no WhatsApp** para o mesmo telefone profissional, o sistema deve **impedir** a criação de um novo caso concorrente no painel e **orientar** o pediatra a abrir o caso do WhatsApp.

**RF-04** — O sistema deve exibir o workspace apenas para casos **ativos** criados pelo **fluxo painel**; casos de outra origem ou estado inválido não devem ser acessíveis por essa rota.

**RF-05** — O sistema deve persistir **todas as mensagens** do pediatra e do assistente no caso, de forma que recarregar a página mantenha o histórico.

**RF-06** — O sistema deve permitir **associar ou trocar** o paciente vinculado ao caso a partir do workspace (fluxo em painel lateral ou folha, conforme desenhado na UI).

**RF-07** — O composer deve aceitar **texto multilinha**, **envio por atalho de teclado** principal e **quebra de linha** por atalho secundário, sem enviar acidentalmente durante composição de caracteres compostos.

**RF-08** — O sistema deve permitir **gravar áudio**, pausar/retomar conforme UI, respeitar limite máximo de duração, e **transcrever** para português no servidor.

**RF-09** — Após transcrição bem-sucedida, o texto deve ser **inserido no rascunho** da mensagem (concatenando se já houver texto), com realce breve opcional para o trecho novo.

**RF-10** — O sistema deve exibir **chips** de atalho: conjunto fixo inicialmente; após número mínimo de mensagens do pediatra, pode **sugerir chips via IA**, limitados a um máximo por leva, com debounce para não flicker.

**RF-11** — O sistema deve **ocultar** chips de ações pesadas (ex.: relatório, resumo) até que exista mensagem do pediatra com conteúdo substancial (não apenas comando curto).

**RF-12** — O assistente deve **rotear** pedidos do pediatra para: conversa geral, resumo, perguntas ao responsável, IMC, geração de relatório ou encerramento, com base em frases-chave em português (normalizadas).

**RF-13** — Para **encerrar caso**, o sistema deve exigir **confirmação explícita** após o aviso do assistente; sem isso, deve responder pedindo confirmação, não alterando o estado do caso.

**RF-14** — Para **gerar relatório**, o sistema deve exigir **histórico mínimo** de conversa clínica; se insuficiente, deve informar o pediatra sem gerar PDF vazio.

**RF-15** — Para **sugerir perguntas ao responsável**, o sistema deve exigir número mínimo de mensagens prévias do pediatra; se a IA não retornar perguntas, deve informar falha de forma acionável.

**RF-16** — Para **IMC**, o sistema deve extrair peso e altura do que o pediatra escreveu; se faltar dado, deve pedir esclarecimento.

**RF-17** — Para **resumo**, o sistema deve garantir que os itens citados tenham **âncora** no histórico; caso contrário, recusar com mensagem clara.

**RF-18** — O sistema deve manter uma **janela de contexto** para o modelo (limite de mensagens e caracteres) e um **resumo rolante** do que “saiu” da janela, para respostas longas não perderem o fio.

**RF-19** — Ao **fechar** o workspace sem nenhuma mensagem do pediatra, o sistema deve pedir **confirmação de descarte**; com mensagens, deve retornar à visão de casos sem modal bloqueante.

**RF-20** — Em erro de envio, transcrição ou serviço ocupado, o sistema deve mostrar **mensagem em português** e, quando aplicável, ação **tentar novamente**.

***

## 7. Requisitos não funcionais

* **Idioma:** toda interface visível ao pediatra em **português (Brasil)**, tom profissional e pediátrico.
* **Acessibilidade:** região de conversa e área do novo caso com rótulos compreensíveis para leitores de tela; estados de carregamento e erro com `aria-live` onde faz sentido; botões com rótulos acessíveis (enviar, microfone, anexo).
* **Performance percebida:** indicador de digitação estável; debounce em sugestões de chips; otimistic UI com recuperação em falha.
* **Limites:** tamanho máximo de arquivo de áudio e duração máxima de gravação comunicados ou aplicados de forma previsível (erro claro se exceder).
* **Disponibilidade:** indisponibilidade ou limite do provedor de IA deve resultar em mensagem humana (“serviço ocupado”, “tente novamente”), não em tela quebrada.
* **Privacidade:** dados do paciente e conteúdo clínico tratados como sensíveis; apenas o pediatra dono do perfil acessa o caso pelo painel.

***

## 8. Fluxos e estados (experiência e telas)

### 8.1 Macrofluxo

1. Pediatra acessa **Novo caso** no painel.
2. É levado à **Seleção de paciente**.
3. Escolhe paciente → sistema cria (ou reabre conforme regras) o caso do painel → abre **Workspace**.
4. Pediatra conversa (texto e/ou áudio transcrito), usa chips ou linguagem natural.
5. Quando adequado, pede **relatório** ou **encerramento** (com confirmação).
6. Fecha o workspace → volta à **listagem de casos** (ou confirma descarte se não houve mensagem).

### 8.2 Tela — Seleção de paciente

* **Layout:** página do dashboard, título e descrição curtos; lista ou cartões de pacientes com busca.
* **Estado carregando:** esqueleto ou indicador discreto.
* **Estado vazio:** mensagem orientando cadastro de pacientes (se aplicável ao produto).
* **Fluxo “já existe caso no painel”:** diálogo modal explicando que continuar encerrará ou substituirá o caso ativo anterior do painel; ações claras de cancelar ou confirmar.
* **Fluxo “WhatsApp ativo”:** notificação (ex.: toast) com caminho sugerido para abrir o caso correto, sem criar caso duplicado.

### 8.3 Tela — Workspace do novo caso

**Hierarquia visual (creative direction):**

* **Primário:** lista de mensagens (pediatra vs assistente) legível, com respiro; fundo discreto para não competir com o conteúdo.
* **Secundário:** chips abaixo ou acima do composer, conforme layout final; estados de loading dos chips não bloqueiam leitura do histórico.
* **Terciário:** metadados do paciente no cabeçalho, ações de trocar paciente e sair.

**Blocos:**

1. **Cabeçalho:** nome do paciente (e dados essenciais acordados no design system), ação para alterar paciente, ação para fechar/sair.
2. **Thread:** bolhas ou cartões distintos para usuário e assistente; estado vazio com mensagem acolhedora explicando que o Falaped está pronto para ajudar no atendimento.
3. **Área de chips:** atalhos como “Gerar relatório deste caso”, “Resumir principais pontos”, “Sugerir perguntas para o responsável”, “Encerrar caso”, etc.; após interação suficiente, chips podem ser **sugeridos pela IA** (variam conforme contexto).
4. **Composer:** campo multilinha, botão enviar, botão microfone, botão anexo (pode ser não funcional para arquivo conforme escopo).
5. **Indicador “digitando”:** estilo familiar de mensageiro, visível pelo tempo mínimo necessário para boa percepção.

**Estados:**

| Estado | Comportamento esperado |
|--------|-------------------------|
| **Aguardando primeira mensagem** | Empty state + saudação inicial do assistente (se houver na regra de produto). |
| **Enviando mensagem** | Mensagem do pediatra aparece; indicador de digitação do assistente. |
| **Erro de envio** | Remove otimista ou marca erro; restaura texto no composer; toast ou inline. |
| **Gravando áudio** | UI de gravação clara (tempo, pausar, cancelar conforme desenhado). |
| **Transcrevendo** | Badge ou texto “Transcrevendo…” com anúncio para leitores de tela. |
| **Transcrição vazia/suspeita** | Aviso amigável; não envia silêncio como mensagem. |
| **Chips carregando** | Área marcada como ocupada; cliques desabilitados. |
| **Gate de negócio** (ex.: relatório cedo demais) | Mensagem do assistente explicando o que falta (“converse um pouco mais sobre o caso”). |
| **Encerramento pendente** | Assistente pede confirmação; chip ou frase explícita de confirmação. |
| **Fechar sem mensagens** | Diálogo “Descartar consulta sem mensagens?” com salvar/continuar vs descartar. |

### 8.4 Papel da IA no fluxo (visão de produto)

| Momento | Como a IA ajuda |
|---------|------------------|
| **Conversa contínua** | Responde em JSON estruturado internamente mas apresenta texto natural + *insights* curtos quando fizer sentido, sempre ancorados no histórico e no paciente. |
| **Conversas longas** | Resume trechos antigos fora da janela para manter coerência sem ultrapassar limites do modelo. |
| **Poucas mensagens** | Chips padrão guiam o pediatra sem depender de sugestão dinâmica. |
| **Após várias mensagens** | Sugere chips contextuais para acelerar relatório, resumo ou follow-up. |
| **Voz** | Transcreve com vocabulário pediátrico em mente; qualidade sinalizada (ok / vazio / suspeito). |
| **Ações críticas** | Gates evitam relatório vazio, resumo alucinado, encerramento acidental; mensagens pedem dados ou confirmação. |

***

## 9. Dados e integrações (visão de negócio)

* **Paciente:** nome e dados cadastrais já existentes no painel; vínculo obrigatório na criação do caso.
* **Caso:** status (ativo/encerrado), origem (painel vs WhatsApp), resumo de contexto de chat acumulado para IA.
* **Mensagens:** remetente (pediatra ou assistente), conteúdo textual, ordem temporal; tipos lógicos de resposta (conversa, resumo, relatório, encerramento, etc.) refletidos no texto apresentado ao usuário.
* **Integrações externas:** provedor de **chat** e de **transcrição de voz**; falhas mapeadas para mensagens amigáveis.

***

## 10. User stories e critérios de aceite

### US-01 — Iniciar novo caso pelo painel com paciente

**Como** pediatra **quero** escolher um paciente e abrir um novo caso no painel **para** registrar o atendimento sem depender do WhatsApp.

**Critérios de aceite:**

* Dado que estou autenticado e com permissões de uso do assistente, quando escolho um paciente válido, então sou levado ao workspace do caso ativo do painel.
* Dado que já existe caso ativo do painel, quando tento criar outro, então vejo aviso explícito antes de prosseguir.
* Dado que existe caso ativo pelo WhatsApp para meu telefone, quando tento criar caso no painel, então sou impedido e orientado a abrir o caso do WhatsApp.

### US-02 — Conversar com o Falaped com contexto do paciente

**Como** pediatra **quero** enviar mensagens em texto **para** obter apoio clínico e administrativo durante o atendimento.

**Critérios de aceite:**

* Dado que estou no workspace, quando envio uma mensagem, então ela aparece no histórico e recebo resposta do assistente.
* Dado que o assistente responde, então vejo indicador de processamento de forma estável (não pisca em respostas instantâneas).
* Dado que o envio falha, então recupero meu texto e vejo mensagem de erro clara.

### US-03 — Usar voz para alimentar o chat

**Como** pediatra **quero** gravar áudio e ver o texto transcrito **para** digitar menos em consultório.

**Critérios de aceite:**

* Dado que permito o microfone, quando gravo dentro do limite, então posso transcrever e o texto aparece no composer sem enviar sozinho.
* Dado que o áudio está vazio ou ilegível, então vejo aviso e não sou induzido a enviar mensagem em branco.
* Dado erro de serviço ou limite, então vejo mensagem em português e posso tentar novamente quando aplicável.

### US-04 — Atalhos (chips) e comandos em linguagem natural

**Como** pediatra **quero** usar atalhos ou frases prontas **para** acionar relatório, resumo, perguntas ao responsável, IMC ou encerramento.

**Critérios de aceite:**

* Dado o início do caso, quando olho o composer, então vejo chips fixos alinhados aos comandos suportados.
* Dado poucas mensagens minhas, quando olho os chips, então ações pesadas não aparecem até haver conteúdo substancial.
* Dado mensagens suficientes, quando paro de digitar, então posso receber sugestões de chips pela IA (com atraso/debounce para suavidade).

### US-05 — Resumo fiel do atendimento

**Como** pediatra **quero** pedir um resumo dos principais pontos **para** revisar rapidamente antes de encaminhar ou documentar.

**Critérios de aceite:**

* Dado histórico suficiente ancorado na conversa, quando peço resumo, então recebo lista objetiva.
* Dado histórico insuficiente ou sem âncora, quando peço resumo, então recebo recusa explicada, sem inventar fatos.

### US-06 — Perguntas sugeridas para o responsável

**Como** pediatra **quero** sugestões de perguntas **para** continuar o diálogo com a família com qualidade.

**Critérios de aceite:**

* Dado menos que o mínimo de mensagens minhas no thread, quando peço sugestões, então sou informado de que preciso conversar mais primeiro.
* Dado mínimo atendido, quando peço sugestões, então recebo perguntas em português; se a IA falhar, vejo mensagem clara.

### US-07 — Gerar relatório com salvaguarda

**Como** pediatra **quero** gerar o relatório do caso **para** documentar o atendimento.

**Critérios de aceite:**

* Dado conversa clínica mínima, quando peço relatório (texto ou chip), então o fluxo de geração é disparado.
* Dado conversa insuficiente, quando peço relatório, então sou informado do que falta, sem arquivo vazio.

### US-08 — Encerrar caso com confirmação

**Como** pediatra **quero** encerrar o caso **para** fechar o ciclo quando o atendimento terminou.

**Critérios de aceite:**

* Dado que peço encerramento, quando é a primeira vez, então o assistente solicita confirmação explícita.
* Dado que confirmo com frase aceita, então o caso passa a encerrado.
* Dado que não confirmo, então o caso permanece ativo.

### US-09 — Trocar paciente vinculado ao caso

**Como** pediatra **quero** ajustar o paciente associado **para** corrigir escolha errada sem recriar tudo.

**Critérios de aceite:**

* Dado que estou no workspace, quando abro o seletor e escolho outro paciente permitido, então o cabeçalho reflete o paciente correto e o contexto do assistente considera o novo vínculo nas mensagens seguintes.

### US-10 — Sair do workspace com segurança

**Como** pediatra **quero** fechar o workspace **para** voltar à lista sem perder trabalho involuntariamente.

**Critérios de aceite:**

* Dado que não enviei mensagem nenhuma, quando fecho, então vejo confirmação de descarte.
* Dado que já enviei mensagem, quando fecho, então retorno à listagem sem modal de descarte.

***

## 11. Priorização (MoSCoW — visão do que foi entregue)

| ID | Must | Should | Could | Won’t (agora) |
|----|------|--------|-------|----------------|
| US-01, US-02, RF persistência | ✓ | | | |
| US-03 transcrição | ✓ | | | |
| US-04 chips + IA | ✓ | | | |
| US-05–US-08 intents | ✓ | | | |
| US-09 trocar paciente | | ✓ | | |
| US-10 fechar/descartar | ✓ | | | |
| Streaming de resposta | | | | ✓ (fora) |
| Anexo de arquivo funcional | | | | ✓ (fora) |

***

## 12. Riscos, gargalos e premissas

| Item | Tipo | Mitigação / nota |
|------|------|-------------------|
| Detecção de intenção por palavras no texto | Risco médio | Pediatra pode disparar intent acidental (ex.: “IMC” em outro contexto); evolução futura pode ser classificador mais rígido ou confirmação extra. |
| Dependência de um único provedor de IA | Risco alto | Mensagens de indisponibilidade; fila/retry onde possível; monitoramento operacional. |
| Expectativa sobre anexo | Risco UX | Se o botão existir sem fluxo, comunicar como limitação ou remover na próxima iteração. |
| Limites de áudio/duração | Premissa | Pediatra deve saber que há teto; erros devem ser explícitos. |

***

## 13. Plano de rollout

* **Disponibilidade:** feature ligada ao ambiente em que o painel e o provedor de IA estão configurados; sem exigência de migração manual pelo pediatra além de login habitual.
* **Comunicação:** notas de release focadas em “Novo caso no painel com Falaped e voz”, sem detalhes de implementação.

***

## 14. Perguntas em aberto (produto)

1. O botão de **anexo** deve permanecer visível até o upload existir, ou deve ser ocultado para evitar frustração?
2. Há necessidade de **tutorial in-product** no primeiro acesso ao workspace?
3. Deve existir **atalho** na listagem de pacientes (“Iniciar caso”) além do menu Novo caso?

***
