# Falaped 2.0: reestruturação de fluxo e design

Documento vivo da versão 2.0. Toda decisão, etapa concluída ou mudança de rumo da reestruturação entra aqui, com a data no **Registro** no fim do arquivo.

- **Protótipo navegável:** [`docs/ux/fluxo-ideal.html`](./fluxo-ideal.html) (abrir no navegador, dados fictícios)
- **Wireframe final de todas as telas:** [`docs/ux/fluxo-falaped-2.0.html`](./fluxo-falaped-2.0.html) (sem cor; cada elemento numerado com o motivo e a heurística)
- **Branch:** `falaped-ui-2.0` (a partir da `main`)
- **Status:** fluxo ideal e wireframe final aprovados em 06/10/2026. Etapas 1 (auditoria visual) e 2 (ficha de design) concluídas; próxima é a Etapa 3, aplicar a ficha ao protótipo.

---

## 1. Objetivo

A consulta pediátrica precisa fluir sem fricção. O médico abre o paciente, conduz a consulta e emite os documentos sem sair da tela. A 2.0 ataca duas camadas, nesta ordem:

1. **Fluxo:** o que existe em cada tela e onde fica cada ação. ✅ Aprovado.
2. **Design:** hierarquia visual, tipografia, espaçamento, cor e estados, aplicados sobre o fluxo aprovado.

## 2. Diagnóstico do fluxo atual (06/10/2026)

Caminho de hoje da conta nova até o fim da primeira consulta: **9 telas**, com dois pontos em que o médico se perde.

### Redirecionamento depois de uma ação
- Cadastrar paciente durante "Criar novo caso" cai na ficha, não na consulta (`components/dashboard/patients/patient-form/patient-form.tsx:79`).
- "Abrir caso" no Início e na lista leva ao detalhe do caso, não ao chat. É preciso clicar ainda em "Retomar atendimento".
- "Sair do workspace" com mensagens leva ao detalhe do caso (`components/dashboard/cases/new-case-workspace.tsx:898`).
- Depois de encerrar há só um `router.refresh()`. Não aparece nenhum próximo passo.
- O cadastro manda para `/auth/sign-up-success`, mas o `proxy` redireciona para `/dashboard` (ver `PENDENCIAS.md`, item 1).

### Botões de ação que não aparecem
- Não há botão de encerrar dentro do workspace. Só pelo chat, ou saindo para um card **cinza** ("Encerrar caso").
- Receita e atestado ficam a 4 níveis da consulta: detalhe → Registros → Documentos → painel lateral.
- "Novo atendimento" na ficha fica no menu `⋮`, ao lado de "Excluir paciente".
- O cronômetro flutuante nasce no canto inferior direito, em cima de **Enviar** e **Gravar** (`consultation-timer-widget.tsx:259`).

### Layout
- A altura do workspace é calculada à mão (`-m-8 h-[calc(100dvh-2rem)]`); um erro de poucos pixels corta o compositor do chat.
- O "Voltar" e a posição da ação principal mudam de tela para tela.
- O Início não orienta quem acabou de chegar: contadores zerados e tabela vazia.

### Comportamentos que confundem
- "Descartar e sair" é só um `<Link>`: o caso continua ativo e gera o alerta "encerrar caso ativo?" na próxima consulta.
- O botão de cancelar desse diálogo se chama "Salvar e continuar".
- Os hubs de seção (`section-hub.tsx`) custam um clique a mais para chegar a qualquer tela.

### Menu lateral
- 4 itens que abrem páginas de cards. "Serviços" e "Atendimentos" não dizem o que há dentro. Financeiro é um hub com um card só.
- Não dá para iniciar consulta pelo menu nem ver que há uma consulta aberta.

### Lista de consultas
- As colunas não dizem do que foi a consulta (sem motivo, documentos, duração ou valor).
- Nas encerradas, o botão em destaque é "Reabrir caso", que ainda encerra a consulta ativa.
- Não há filtros nem paginação. "Painel" e "Outro canal" são termos internos.

### Lista de pacientes
- Mostra a data de nascimento em vez da idade, em ordem alfabética, e a busca não aceita telefone.
- Não há sinal de pendência nem botão para atender direto da linha.

### Ficha do paciente
- É uma página longa; o histórico fica no fim, e a alergia só aparece no meio.
- Editar troca a página inteira pelo formulário.

## 3. Fluxo ideal (aprovado)

Primeira consulta em **4 telas**: Cadastro → Início com o primeiro passo → Buscar ou cadastrar o paciente → Consulta (documentos e encerramento ali mesmo) → Próximo paciente.

| # | Tela | Decisões |
|---|---|---|
| 1 | Cadastro | Nome e sobrenome separados, CRM e UF pedidos no cadastro, entra direto no app |
| 2 | Primeiro acesso | Um CTA principal, **Iniciar consulta**, e uma lista dos primeiros passos que some quando concluída |
| 3 | Paciente | Buscar e cadastrar no mesmo painel. Cadastro curto (nome, nascimento, responsável, telefone) com **Cadastrar e iniciar consulta** |
| 4 | Consulta | **Encerrar consulta** fixo no cabeçalho, cronômetro dentro do cabeçalho e barra de documentos (Receita, Atestado, Exames, Encaminhar, Vacinas, Escalas) abrindo em painel lateral. A IA oferece "Abrir receita com isso". Coluna "Nesta consulta" com os documentos emitidos. Menu recolhido para ícones |
| 5 | Encerrada | Resumo (duração, valor, relatório, lembrete) e o CTA **Atender próximo paciente**. Reabrir em vez de "tem certeza?" |
| 6 | Menu lateral | Ver a seção 4 |
| 7 | Consultas | Consulta em andamento fixada no topo. Lista agrupada por dia com motivo, documentos, duração e valor. Filtros Hoje, Esta semana e Com pendência. "Reabrir" vai para o menu `⋯` |
| 8 | Pacientes | Idade, telefone e última consulta com o motivo. Ordem padrão "Atendidos recentemente" (A–Z como opção). Coluna **Atenção** com selos e botão **Atender** em cada linha |
| 9 | Ficha do paciente | Cabeçalho fixo (idade, responsável, telefone, **alergia**) com **Iniciar consulta** como ação principal. Abas Resumo, Consultas, Crescimento, Vacinas, Documentos, Anexos e escalas. O Resumo junta a última consulta, pendências, crescimento e dados clínicos |

## 4. Menu lateral ideal

```
[ Iniciar consulta ]   ← com consulta aberta: "● Helena D. 12:47 · Voltar à consulta"
[ Buscar paciente ⌘K ]
Início
Consultas
Pacientes
Documentos ▸  Receitas · Atestados · Pedidos de exame · Encaminhamentos · Relatórios · Orientações · Vacinas
Pergunte ao assistente
Financeiro
──────────
Modelos · Novidades · Avatar (Perfil, WhatsApp, Sair) · Admin (só para o gestor)
```

- 6 itens diretos, sem páginas-hub. `/appointments`, `/services` e `/financial` viram redirecionamentos.
- "Receituário em branco" vira o botão "Em branco" dentro de Receitas.
- Durante a consulta, o menu recolhe para ícones (`collapsible="icon"`).
- A busca ⌘K usa o `cmdk`, que já está instalado.

## 5. Decisões em aberto

- [ ] Renomear **Casos → Consultas** e **Discussões → Pergunte ao assistente** (o protótipo já usa os nomes novos).
- [ ] Vacinas: em Documentos (comprovantes) ou na ficha (calendário)? Proposta: as duas, com papéis diferentes.
- [ ] Motivo da consulta na lista: de onde tirar o resumo (`case_reports`?). Custo a levantar.
- [ ] Pendências do paciente (vacina atrasada, retorno vencido, ficha incompleta): cruzar o calendário vacinal, os lembretes e `patient-chart-incomplete.ts`. Custo a levantar.
- [x] **Fonte do app (aprovado 06/10/2026):** Lexend nos títulos (família da logo, indicada para saúde) e Inter no texto (igual à landing). Lexend nos títulos e Inter no texto (auditoria M3).
- [x] **Logo no app (aprovado 06/10/2026):** trocar a antiga (`full-logo.svg`) pela nova e trazer a compacta (`falaped-icon.svg`) para o menu recolhido (auditoria M1, M2).
- [x] **Botão principal (aprovado 06/10/2026):** opção A, texto escuro sobre o azul da marca, como no modo escuro (auditoria C1).
- [ ] `app/dashboard/agenda/page.tsx` existe no código, mas a tela não é usada: decidir se sai do código. A Agenda já saiu do protótipo.

## 6. Skills da reestruturação

Instaladas em `~/.agents/skills` em 06/10/2026.

| Etapa | Skill | Papel |
|---|---|---|
| 1. Auditoria visual | `redesign-existing-projects` | Aponta o que hoje parece genérico ou "feito por IA" sem quebrar o que funciona |
| 2. Ficha de design | `design-taste-frontend` | Direção visual e checagem contra cara de template |
| 2. Ficha de design | `high-end-visual-design` | Fontes, espaçamento, sombras e estrutura de cards de nível premium |
| 2. Ficha de design | `refactoring-ui` | Hierarquia, escalas de espaçamento e cor, profundidade, tokens |
| 3. Aplicar no protótipo | as três acima | As 9 telas do `fluxo-ideal.html` com a ficha aplicada, validadas no navegador |
| 4. Revisão | `ux-heuristics` | Garante que a estética não escondeu ações nem atrapalhou a leitura |
| Apoio às etapas 2 e 3 | `ui-ux-pro-max` | Banco de tipos de produto, estilos, paletas e fontes: confere o encaixe com o nicho de saúde |
| Apoio às etapas 2 e 3 | `better-colors` | Rampas em oklch, papel de cada cor, tokens de status e medição de contraste |
| 5. Implementação | `vercel:shadcn` | Tokens no `globals.css`, variantes `cva` e componentes de `components/ui` |

**Fora desta reestruturação:**
- `minimalist-ui`: proíbe gradiente e prefere estilo editorial, o que contradiz o visual aprovado no admin.
- `industrial-brutalist-ui`: só como referência pontual da marca.
- `gpt-taste` (animação de landing), `brandkit`, `imagegen-*`, `image-to-code` e `full-output-enforcement`: não se aplicam ao app.

## 7. Restrições de design já aprovadas pelo gestor

- Usar os tokens do app: Geist, azul da marca `#8AB4EB` (`--primary`), `--primary-ink` para texto azul, cards brancos com contorno, ícone em chip azul.
- Gradiente radial da marca cobrindo o **card inteiro** (canto superior esquerdo → branco), não uma faixa.
- "Minimalista" = hierarquia clara com toda a informação. **Nunca** o estilo "bloco de notas": texto solto, divisórias finas, números grandes sem card.
- Selos coloridos de status, avatar com iniciais, listas ordenadas por urgência com o motivo e a ação pronta.
- Validar em protótipo HTML **local** antes de codar. Nada publicado como Artifact.
- O app continua bloqueado abaixo de `lg` (`DesktopOnlyNotice`); a 2.0 é desktop-first.

## 8. Plano de execução

- [x] Análise do fluxo atual (cadastro → fim da consulta, consultas, pacientes, ficha, menu)
- [x] Protótipo do fluxo ideal (`fluxo-ideal.html`, 9 passos)
- [x] Wireframe final de todas as telas (`fluxo-falaped-2.0.html`), aprovado em 06/10/2026
- [ ] **Próximo pedido do gestor (guardado em 06/10/2026):** fluxo de IA no workspace da consulta. Retomar antes da Etapa 1.
- [x] **Etapa 1:** auditoria visual do app atual (`redesign-existing-projects`): [`auditoria-visual.md`](./auditoria-visual.md), nota 6/10
- [x] **Etapa 2:** ficha de design (`ficha-design.html`, aba "Ficha de design"): tokens de tipografia, espaçamento, cor, raio, sombra, estados e densidade
- [x] **Etapa 3:** protótipo com a ficha (`prototipo.html`, aba "Protótipo"). Rodada 1 (8 telas sem a Consulta) aprovada em 07/10/2026; rodada 2 (Consulta e painéis) aprovada
- [ ] **Etapa 4:** revisão de usabilidade (`ux-heuristics`) da versão com design
- [ ] **Etapa 5:** implementação, por ordem de dor: Consulta → Pacientes → Ficha → Consultas → Menu → Início e cadastro

Ganhos rápidos que podem entrar antes da etapa 5, porque não dependem do design:
- [ ] Voltar à consulta depois de cadastrar o paciente (`patient-form.tsx:79` → `/dashboard/cases/select-patient?patientId=`)
- [ ] Cronômetro nascendo no canto superior direito
- [ ] "Abrir caso" no Início apontando para o workspace
- [ ] "Descartar" apagando de verdade o caso vazio; o botão de cancelar passa a se chamar "Voltar à consulta"

---

## Registro

- **06/10/2026:** análise do fluxo atual e protótipo do fluxo ideal (cadastro, primeiro acesso, paciente, consulta, encerrada), depois o menu lateral, Consultas, Pacientes e Ficha. Agenda removida do protótipo. Fluxo ideal aprovado. Skills instaladas: `ux-heuristics`, `refactoring-ui` e o pacote `taste-skill`. Plano de 5 etapas aprovado; próxima é a auditoria visual.
- **06/10/2026:** branch `falaped-ui-2.0` criada a partir da `main`. Wireframe final `fluxo-falaped-2.0.html`: 41 telas em cinza, agrupadas em A (fluxo principal, 12 telas), B (rotina, 11), C (fora do fluxo, 9), D (estrutura: menu, ⌘K, menu do usuário, Perfil, WhatsApp, teste encerrado) e E (acesso e avisos). Cada tela traz objetivo, de onde vem e para onde vai, e o motivo de cada elemento com a regra de usabilidade (`ux-heuristics`). Admin e Books ficaram de fora. Aguardando a aprovação do gestor.
- **06/10/2026:** wireframe aprovado pelo gestor ("ficou muito bom"). Regra nova: um commit local ao fim de cada etapa. Iniciada a Etapa 1 (auditoria visual).
- **06/10/2026:** Etapa 1 concluída: `auditoria-visual.md`, nota visual 6/10. Três problemas de gravidade 3 na ação principal: texto branco sobre o azul claro (contraste de 2:1), `text-primary` usado como texto (62 usos) e botão principal sem hover nem resposta ao clique. Faltam tokens de status, escala tipográfica, sistema de cards e estado vazio padrão. A lista do que a Etapa 2 precisa definir está no fim da auditoria.
- **06/10/2026:** a auditoria virou a aba "Auditoria visual" no `fluxo-falaped-2.0.html` (o `.md` continua sendo a fonte), com uma demonstração em cor do contraste do botão principal.
- **06/10/2026:** a auditoria ganhou a seção Marca (logo antiga no menu, falta a compacta, fonte Geist no app e Inter na landing) e a observação de que o modo escuro já resolve o contraste do botão. Nova aba **Componentes atuais** no HTML (`componentes-atuais.html`): tokens e componentes de `components/ui` renderizados com as classes reais, nos modos claro e escuro, como ponto de partida da Etapa 2. A aba Auditoria agora é gerada do `.md` por `gerar-aba-auditoria.py`.
- **06/10/2026:** instaladas as skills `ui-ux-pro-max` e `better-colors`. Seção "Encaixe no nicho" na auditoria: o banco indica Accessible & Ethical + Minimalism/Swiss para clínica (a base do shadcn), azul médico calmo com **texto escuro sobre a cor principal** (confirma a opção A) e Lexend para títulos em saúde. Neo-brutalismo fica na logo e no marketing. A `better-colors` deu Block: 2 HIGH (botão 2,02:1 e `text-primary` 2,14:1), rampa azul incompleta e status sem token. Rampas necessárias: sucesso, atenção, perigo.
- **06/10/2026:** gestor aprovou as três decisões: Lexend (títulos) + Inter (texto); botão principal com texto escuro sobre o azul da marca; logo nova no menu e a compacta no menu recolhido. Iniciada a Etapa 2 (ficha de design).
- **06/10/2026:** Etapa 2 concluída: `ficha-design.html` (aba "Ficha de design"). O bloco `:root`/`.dark`/`@theme` no topo do arquivo é a fonte dos tokens e vai direto para `app/globals.css`. Rampas oklch no matiz da marca (255,41): neutros frios, marca 50→800, sucesso/atenção/perigo; tokens semânticos (`accent`, `accent-text`, `on-accent`, `text-secondary`…) e todos os pares medidos no AA nos dois modos (botão 2,0→8,1:1; texto azul 2,1→5,5:1; contorno de campo 3,1:1). Escala tipográfica nomeada (Lexend 600 nos títulos, Inter no resto), raios 8/12/16/6, sombras com o matiz da marca, três superfícies (destaque com gradiente no card inteiro, comum, apoio), botões 28–40 px com hover/clique/foco, selos com papel fixo, campos, estado vazio, skeleton e sobreposições com um fundo só.
- **06/10/2026:** gestor revisou a ficha: a logo principal é a **empilhada** (`falaped-logo.svg`), também no menu; a sombra dura de "assinatura" foi descartada, o neo-brutalismo fica só na logo.
- **06/10/2026:** ficha reescrita com os **nomes do shadcn** (aprovado pelo gestor): `primary`/`primary-foreground` = azul da marca e texto escuro, `primary-ink` = texto azul, `accent` continua sendo hover, `muted-foreground` = texto secundário. Novos: `subtle-foreground`, `border-strong`, `primary-hover/active/soft/soft-border/ink-strong`, rampas `success/warning/danger-*` e `gradient-highlight`; `--radius` 8 px (md 6 · lg 8 · xl 12 · 2xl 16). Tabela "Nomes no código" na ficha. `shadow-hard-*` e `ink` ficam (são do Books).
- **06/10/2026:** ficha cobre os 31 componentes de `components/ui`. Regra de "qual usar quando" para Sheet (drawer), Dialog, AlertDialog, Popover, DropdownMenu, Toast, Tooltip e Command; um fundo só para sobreposições (`foreground/30`, sem blur); Sheet com larguras 420/560/720; AlertDialog só para o irreversível, com confirmação em vermelho suave; o que dá para desfazer vai para toast com "Desfazer"; toast colorido só no ícone. Fluxo de IA no workspace adiado de novo: avisar o gestor em 07/10.
- **06/10/2026:** **Guia de escrita** na ficha (`#escrita`), a pedido do gestor. Regra zero: muda só o texto da tela, nunca o dado: nada de migration, enum, valor de status, nome de tabela/coluna, rota ou código por causa de texto; o que já está gravado não é reescrito; tradução de valor do banco via mapa de rótulos no front; prompts da IA ficam fora. Glossário (consulta no lugar de caso/atendimento, modelo no lugar de template, emitir × gerar…), voz de colega, fórmula por tipo de texto e antes/depois com textos reais.
- **06/10/2026:** Etapa 3, rodada 1: `prototipo.html` (aba "Protótipo") com 8 telas fora da Consulta: menu (3 estados), Início, Buscar paciente, Cadastro rápido, Pacientes, Ficha (Resumo), Consultas (com o menu ⋯ aberto) e Consulta encerrada. Tokens copiados da ficha, ícones Lucide (os do app), textos do guia de escrita, modo claro e escuro, telas ligadas por clique. As demais telas vão do wireframe + ficha direto para o código. Rodada 2 (Consulta) depende do fluxo de IA.
- **07/10/2026:** gestor aprovou a rodada 1 do protótipo ("ficou tudo muito bom"), incluindo as decisões de botão com contorno quando já existe uma ação azul na tela. Próximo: fluxo de IA no workspace, depois rodada 2 (Consulta) e Etapa 4.
- **07/10/2026:** fluxo de IA adiado sem data pelo gestor. Etapa 3, rodada 2: 8 telas da Consulta no `prototipo.html`, com a área do assistente como no wireframe (Consulta, Receita, Receita emitida, Atestado com prévia, Escala com escore ao vivo, Ler exame com valor fora da faixa em destaque, Encerrar consulta e Consulta encerrada). Na Consulta, "Encerrar consulta" é a ação azul e "Enviar" fica com contorno.
- **08/10/2026:** gestor aprovou a rodada 2. Etapa 3 concluída (16 telas no protótipo).
- **08/10/2026:** Etapa 3 reaberta para ajustes pedidos pelo gestor antes da Etapa 4:
  - **Alertas viram símbolos.** Selos de texto (alergia, vacina etc.) viram símbolos redondos; o detalhe aparece no hover, no foco ou no toque. Isso vale no Início, no cabeçalho da Consulta, em Pacientes e na Ficha. Na Receita a alergia continua escrita por extenso. A regra foi registrada na ficha (Selos → Símbolos de atenção).
  - **Menu lateral.** Logo maior e centralizada. No menu recolhido entram Modelos, Novidades e o avatar, que leva ao Perfil.
  - **Início.** Cartões "Precisam de atenção" e "Atendidos hoje" com a mesma altura. Os números do mês ganham um cartão próprio, "Seu mês".
  - **Encerrar consulta em duas etapas:** 1) revisar o relatório, os documentos e o lembrete; 2) cobrança e encerrar.
  - **Ficha refeita em três faixas:** resumo clínico em números; última consulta e "O que fazer" lado a lado; histórico e crescimento.
  - **Tela nova de Perfil** com o índice das seções: dados profissionais, marca nos documentos com prévia do cabeçalho, relatório, valores, WhatsApp, aparência, plano e conta.
  - O protótipo agora tem 18 telas.
- **08/10/2026:** Início do 1º acesso refeito como no fluxo ideal: uma ação principal (Iniciar consulta, que leva à busca com cadastro na hora), passos "Conta criada → Atenda o primeiro paciente → Emita uma receita ou atestado → Personalize o cabeçalho" e contadores zerados. Pacientes, consultas e documentos são dados que o app já tem; a agenda do dia não existe, por isso o Início normal mostra "Consultas recentes".
