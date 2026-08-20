---
phase: 260724-gyi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/globals.css
  - components/dashboard/agenda/appointment-status-style.ts
  - components/dashboard/agenda/calendar-time-grid.tsx
  - components/dashboard/agenda/calendar-month-indicator.tsx
autonomous: false
requirements: [G-1, G-2, G-3, G-4, G-5, G-6]
tags: [agenda, ui, palette, css, calendar]

must_haves:
  truths:
    - "Na Agenda (light), o fundo disponível é menta clara com degradê, folga é areia clara com degradê + hachura, e vazio é branco (G-4)."
    - "Os 5 status da consulta aparecem em tons pastéis distintos e legíveis, mantendo ícone e forma: pendente tracejado, cancelada com hachura + nome riscado, demais com borda sólida (G-4, G-6)."
    - "Confirmada passa a ser azul pastel (não mais azul sólido forte) — direção aprovada (G-6)."
    - "No dark mode, os mesmos matizes aparecem com claridade adaptada e permanecem legíveis (G-5)."
    - "A legenda/chips que consomem APPOINTMENT_STATUS_STYLE herdam as novas cores sem edição própria (G-4)."
  artifacts:
    - "app/globals.css com as vars da paleta pastel (--agenda-*) em :root e .dark + classes utilitárias (.agenda-*)"
    - "components/dashboard/agenda/appointment-status-style.ts com as classes .agenda-st-* nos 5 status"
    - "components/dashboard/agenda/calendar-time-grid.tsx usando .agenda-avail / .agenda-folga / .agenda-vazio no fundo"
    - "components/dashboard/agenda/calendar-month-indicator.tsx usando os tokens pastéis no indicador de disponibilidade"
  key_links:
    - "Classes .agenda-* em globals.css → aplicadas por className nos 3 componentes de agenda"
    - "APPOINTMENT_STATUS_STYLE.cell → propaga para blocos da grade, detalhe e legenda/chips"
---

<objective>
Aplicar a paleta pastel clara com degradê aprovada (mockup em disco) na Agenda, substituindo o verde saturado do f3j e os 5 status atuais. Centralizar as cores em `app/globals.css` como variáveis oklch + classes utilitárias, e trocar as classes de cor nos 3 componentes de agenda. CAMADA DE UI APENAS — só cor, sem mudança de comportamento.

Purpose: A Agenda ganha um visual leve e harmônico (pastel + degradê) onde a distinção vem de matiz + ícone + forma, não de saturação forte — validado pelo usuário no mockup.
Output: `globals.css` com a paleta `--agenda-*` (light + dark) e classes `.agenda-*`; os 3 componentes de agenda consumindo essas classes; vars `--calendar-available*` do f3j aposentadas.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/260724-gyi-aplicar-a-paleta-pastel-clara-com-degrad/260724-gyi-CONTEXT.md
@.planning/quick/260724-gyi-aplicar-a-paleta-pastel-clara-com-degrad/260724-gyi-DESIGN-MOCKUP.html
@app/globals.css
@components/dashboard/agenda/appointment-status-style.ts
@components/dashboard/agenda/calendar-time-grid.tsx
@components/dashboard/agenda/calendar-month-indicator.tsx

# Skills de design (ler para tom/convenção): .cursor/skills/pediatric-dashboard-design/SKILL.md, .cursor/skills/dashboard-falaped/SKILL.md

# NOTA de estrutura (globals.css): o arquivo tem DOIS blocos :root e DOIS blocos .dark
# (um em @layer base ~L75/L118, outro "bare" ~L193/L235). As vars --calendar-available*
# aparecem 4x (2 em :root, 2 em .dark). Aposentar as 4 ocorrências. Adicionar a paleta
# --agenda-* uma vez, em um bloco/@layer próprio no fim do arquivo (não duplicar).
</context>

<constraints>
- CAMADA DE UI APENAS. NÃO editar: lib/**, actions/**, modules/**, supabase/migrations/**, app/dashboard/agenda/page.tsx. Somente `app/globals.css` + os 3 componentes de agenda listados.
- Todas as cores em globals.css em oklch (sem hex/rgb novos). Degradês em oklch (linear-gradient 160deg).
- Sem deps novas. Copy PT-BR.
- Manter comportamento: só trocar cor/classe. Ícones (lucide) e forma preservados (pendente tracejado; cancelada hachura + riscado; demais borda sólida).
- Valores oklch EXATOS vêm do mockup (G-1); dark fica a critério dentro das faixas de G-5.
</constraints>

<tasks>

<task type="tracer">
  <name>Task 1: Definir a paleta pastel em globals.css e provar o fundo da grade end-to-end</name>
  <files>app/globals.css, components/dashboard/agenda/calendar-time-grid.tsx</files>
  <read_first>
    - .planning/quick/260724-gyi-aplicar-a-paleta-pastel-clara-com-degrad/260724-gyi-DESIGN-MOCKUP.html (valores oklch/degradês em :root; overlays de hachura em `.cell.folga` e `HATCH_F`)
    - app/globals.css (os DOIS blocos :root e DOIS .dark; as 4 ocorrências de --calendar-available*)
    - components/dashboard/agenda/calendar-time-grid.tsx (a faixa de fundo por estado: available/off/empty, ~L296-305)
  </read_first>
  <action>
    Em `app/globals.css`, adicionar UM bloco novo de paleta da Agenda no fim do arquivo (após o último bloco existente), definindo as vars pastéis em `:root` e `.dark` e as classes utilitárias — via G-2 e G-3. Não duplicar em outros blocos.

    Vars (light — valores EXATOS do mockup, G-1): `--agenda-avail` = linear-gradient(160deg, oklch(0.99 0.016 162), oklch(0.968 0.038 162)); `--agenda-avail-line` oklch(0.87 0.045 162); `--agenda-avail-ink` oklch(0.53 0.07 162). `--agenda-folga` = linear-gradient(160deg, oklch(0.992 0.004 75), oklch(0.968 0.008 75)); `--agenda-folga-line` oklch(0.9 0.008 75); `--agenda-folga-ink` oklch(0.57 0.015 75). `--agenda-vazio` oklch(1 0 0). Status (base + `-line` + `-ink`): `--agenda-st-pending` grad oklch(0.986 0.018 74)→oklch(0.958 0.046 72), line oklch(0.87 0.08 72), ink oklch(0.55 0.1 62); `--agenda-st-confirmed` grad oklch(0.978 0.02 248)→oklch(0.948 0.046 248), line oklch(0.84 0.07 250), ink oklch(0.51 0.1 255); `--agenda-st-done` grad oklch(0.982 0.018 300)→oklch(0.952 0.042 300), line oklch(0.87 0.05 300), ink oklch(0.54 0.085 300); `--agenda-st-no_show` grad oklch(0.982 0.018 24)→oklch(0.952 0.046 22), line oklch(0.88 0.075 22), ink oklch(0.57 0.12 22); `--agenda-st-canceled` grad oklch(0.988 0.003 262)→oklch(0.968 0.005 262), line oklch(0.91 0.005 262), ink oklch(0.59 0.01 262). Definir também duas vars de overlay de hachura (oklch com alpha): `--agenda-folga-hatch` = repeating-linear-gradient(45deg, oklch(0.9 0.01 75 / 0.45) 0 5px, transparent 5px 11px); `--agenda-canceled-hatch` = repeating-linear-gradient(45deg, oklch(0.9 0.005 262 / 0.5) 0 5px, transparent 5px 10px).

    Dark (`.dark`, dentro das faixas de G-5 — Claude's Discretion): manter cada HUE das vars acima, mas preenchimentos ~L 0.26–0.34, bordas ~L 0.42–0.52, texto ~L 0.82–0.9. Ajustar os alphas da hachura para permanecerem visíveis no fundo escuro.

    Classes utilitárias (uma vez): `.agenda-avail { background: var(--agenda-avail); border-color: var(--agenda-avail-line); color: var(--agenda-avail-ink); }`; `.agenda-folga { background: var(--agenda-folga-hatch), var(--agenda-folga); border-color: var(--agenda-folga-line); color: var(--agenda-folga-ink); }`; `.agenda-vazio { background: var(--agenda-vazio); }`. Colocar num `@layer utilities` (ou bloco próprio) para consumo por className. NÃO remover ainda as vars do verde antigo (f3j) nesta tarefa (a Task 2 as aposenta após trocar o último consumidor) — mas NÃO adicionar novas cores fora da paleta acima.

    Em `calendar-time-grid.tsx` (TRACER — provar o fundo end-to-end): trocar as classes de fundo da faixa read-only. Onde hoje o estado `available` usa `[background-color:var(--calendar-available)]` + hover strong, `off` usa `bg-muted`, e `empty` usa hover:bg-muted, passar a aplicar as novas classes: `available` → `agenda-avail`; `off` → `agenda-folga`; `empty` → `agenda-vazio`. Manter o `border-b border-b-border/60`, o posicionamento (top/height %) e o `transition-colors` intactos. Manter o comportamento de clique (handleBackgroundClick) inalterado. Não introduzir hex/rgb.
  </action>
  <verify>
    <automated>yarn typecheck</automated>
    <automated>test $(grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(' components/dashboard/agenda/calendar-time-grid.tsx | wc -l | tr -d ' ') -eq 0</automated>
    <automated>grep -q "agenda-avail" app/globals.css && grep -q "agenda-st-canceled" app/globals.css</automated>
    <automated>grep -q "agenda-avail" components/dashboard/agenda/calendar-time-grid.tsx</automated>
  </verify>
  <done>globals.css contém as vars --agenda-* (light + dark) e as classes .agenda-avail/.agenda-folga/.agenda-vazio; calendar-time-grid.tsx aplica essas classes ao fundo (disponível=menta degradê, folga=areia+hachura, vazio=branco); `yarn typecheck` passa; zero hex/rgb no .tsx tocado.</done>
</task>

<task type="auto">
  <name>Task 2: Trocar os 5 status por classes pastéis e o indicador do Mês; aposentar --calendar-available*</name>
  <files>components/dashboard/agenda/appointment-status-style.ts, components/dashboard/agenda/calendar-month-indicator.tsx, app/globals.css, components/dashboard/agenda/calendar-time-grid.tsx</files>
  <read_first>
    - .planning/quick/260724-gyi-aplicar-a-paleta-pastel-clara-com-degrad/260724-gyi-DESIGN-MOCKUP.html (classes .s-pend/.s-conf/.s-done/.s-falta/.s-canc — mapeamento de fill/borda/texto/forma)
    - components/dashboard/agenda/appointment-status-style.ts (o mapa APPOINTMENT_STATUS_STYLE.cell + os flags strike/hatch)
    - components/dashboard/agenda/calendar-month-indicator.tsx (o ponto de disponibilidade ~L115)
  </read_first>
  <action>
    Definir em globals.css (no mesmo bloco da paleta) as classes utilitárias dos status, uma por status, aplicando background (degradê), border-color e color a partir das vars `--agenda-st-*`: `.agenda-st-pending` (fill + ink; a BORDA tracejada vem do componente, ver abaixo), `.agenda-st-confirmed`, `.agenda-st-done`, `.agenda-st-no_show`, `.agenda-st-canceled` (fill com a hachura: `background: var(--agenda-canceled-hatch), <grad canceled>`; ink neutro). Cada uma seta `border-color: var(--agenda-st-*-line)`.

    Em `appointment-status-style.ts`, no mapa `APPOINTMENT_STATUS_STYLE`, trocar SOMENTE o campo `cell` de cada status, mantendo Icon, label, strike e hatch como estão. Preservar EXATAMENTE a forma que hoje é expressa por utilities Tailwind: pendente mantém a borda tracejada (`border border-dashed` + a classe pastel `agenda-st-pending` que fornece cor da borda/fill/texto); confirmada/realizada/falta mantêm `border` sólida + a classe pastel correspondente; cancelada mantém `border` sólida + `agenda-st-canceled` (o strike continua vindo do flag `strike` já consumido no render, e a hachura do flag `hatch`). Ou seja: `cell` passa a ser a combinação da classe utilitária de layout de borda (border/border-dashed) + a classe de cor `.agenda-st-*`. NÃO alterar os flags strike/hatch nem os ícones.

    ATENÇÃO à hachura da célula cancelada renderizada em `calendar-time-grid.tsx`: hoje o overlay de hachura usa `var(--color-muted-foreground)`. Trocar esse overlay para consumir `var(--agenda-canceled-hatch)` (ou aplicar via a classe) para ficar coerente com a nova paleta — só cor, sem mudar a estrutura do `<span aria-hidden>`.

    Em `calendar-month-indicator.tsx`, o ponto de disponibilidade que hoje usa `[background-color:var(--calendar-available-strong)]` passa a usar a cor pastel de disponível — usar `[background-color:var(--agenda-avail-line)]` (a linha/menta mais saturada da paleta, boa para um ponto pequeno legível). Nada mais muda no componente.

    APOSENTAR as vars do f3j: agora que nenhum componente referencia mais as duas vars do verde antigo (a base `--calendar-available` e a `-strong`), remover as 4 ocorrências (2 em :root, 2 em .dark) e os comentários E-1 associados em globals.css. Confirmar por grep que sobrou 0. <!-- planner-discipline-allow: calendar-available -->

  </action>
  <verify>
    <automated>yarn typecheck</automated>
    <automated>test $(grep -c "calendar-available" app/globals.css) -eq 0</automated>
    <automated>test $(grep -rc "calendar-available" components/dashboard/agenda/ | grep -v ':0$' | wc -l | tr -d ' ') -eq 0</automated>
    <automated>test $(grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(' components/dashboard/agenda/appointment-status-style.ts components/dashboard/agenda/calendar-month-indicator.tsx components/dashboard/agenda/calendar-time-grid.tsx | wc -l | tr -d ' ') -eq 0</automated>
    <automated>grep -q "agenda-st-pending" app/globals.css && grep -q "agenda-st-canceled" components/dashboard/agenda/appointment-status-style.ts</automated>
    <automated>yarn build</automated>
  </verify>
  <done>Os 5 status usam classes `.agenda-st-*` (cor) mantendo ícone e forma (pendente tracejado, cancelada hachura+riscado, demais sólidos); o ponto do Mês usa a cor menta da paleta; as vars `--calendar-available*` foram removidas (grep = 0 em globals.css e nos componentes); zero hex/rgb nos .tsx tocados; `yarn build` e `yarn typecheck` passam.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Paleta pastel clara com degradê aplicada na Agenda: fundo da grade (disponível=menta degradê, folga=areia degradê+hachura, vazio=branco), 5 status pastéis (pendente pêssego tracejado, confirmada azul, realizada lavanda, falta rosa, cancelada neutro+hachura+riscado), ponto do Mês em menta. Vars centralizadas em globals.css (`--agenda-*`), verde do f3j aposentado. Só cor — comportamento inalterado.
  </what-built>
  <how-to-verify>
    1. `yarn dev` e abrir `/dashboard/agenda`.
    2. NO LIGHT (tema claro): confirmar no fundo da grade Dia/Semana — disponível = menta clara com degradê suave; folga = areia clara com degradê + hachura diagonal; vazio = branco.
    3. Conferir os 5 status em blocos de consulta: pendente (pêssego, borda TRACEJADA, ícone relógio), confirmada (azul pastel), realizada (lavanda), falta (rosa), cancelada (neutro com HACHURA + nome RISCADO). Todos distintos e legíveis; nada saturado/escuro demais; nenhum bloco "pula" na tela.
    4. Conferir a aba Mês: ponto de disponibilidade em menta, coerente.
    5. Conferir a legenda/chips (se visível) — deve herdar as mesmas cores dos status.
    6. Alternar para o DARK (toggle de tema) e repetir 2-5: mesmos matizes, claridade adaptada, tudo legível (fundos escuros, texto/ícones claros, hachura visível).
    7. Confirmar que NENHUM comportamento mudou (clicar slot livre abre criação; clicar consulta abre detalhe; linha de agora azul).
  </how-to-verify>
  <resume-signal>Digite "approved" se a paleta está correta no light E no dark, ou descreva o que ajustar (ex.: "folga escura demais no dark", "cancelada pouco distinta").</resume-signal>
</task>

</tasks>

<verification>
- `yarn typecheck` e `yarn build` passam.
- `grep -c "calendar-available" app/globals.css` = 0; nenhum componente de agenda referencia mais essas vars.
- Zero hex/rgb (normalizado; oklch e gradientes não contam) nos 3 .tsx tocados.
- globals.css: paleta `--agenda-*` presente em :root e .dark + classes `.agenda-*`.
- Verificação visual humana [BLOCKING] aprovada no light E no dark.
</verification>

<success_criteria>
- A Agenda usa a paleta pastel com degradê aprovada (fundo + 5 status) no light e no dark, mantendo ícones e forma (tracejado/hachura/riscado).
- Cores centralizadas em globals.css (oklch); verde do f3j aposentado; sem regressão de comportamento.
- Todas as decisões G-1..G-6 implementadas.
</success_criteria>

<output>
Create `.planning/quick/260724-gyi-aplicar-a-paleta-pastel-clara-com-degrad/260724-gyi-01-SUMMARY.md` when done
</output>
