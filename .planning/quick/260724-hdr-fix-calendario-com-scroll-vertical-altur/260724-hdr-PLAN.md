---
phase: quick-260724-hdr
plan: 01
type: execute
wave: 1
autonomous: false
requirements: [FIX-scroll-vertical]
files_modified:
  - components/dashboard/agenda/calendar-editor.tsx
  - components/dashboard/agenda/calendar-time-grid.tsx
must_haves:
  truths:
    - "A agenda não introduz scroll vertical: nem a página rola por causa da grade, nem aparece scrollbar-y dentro da grade."
    - "A altura da grade é medida dinamicamente (innerHeight − topo do container − folga inferior), substituindo o calc(100svh-16rem) fixo; recalcula em resize e ao trocar de aba/semana."
    - "A grade continua com overflow-x-auto (scroll horizontal quando muitas colunas) mas overflow-y travado (hidden)."
  artifacts:
    - components/dashboard/agenda/calendar-editor.tsx
    - components/dashboard/agenda/calendar-time-grid.tsx
---

<objective>
Corrigir o scroll vertical da Agenda. Causa 1: `h-[calc(100svh-16rem)]` subestima o chrome real (sidebar p-8 + border-t-8 + header da página + toolbar + dica + TabsList) → a grade fica mais alta que o espaço e a PÁGINA rola. Causa 2: o wrapper da grade usa `overflow-x-auto`, e pela regra do CSS o eixo Y computa `auto` junto → pode surgir scrollbar-y interno. CAMADA DE UI apenas.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@components/dashboard/agenda/calendar-editor.tsx
@components/dashboard/agenda/calendar-time-grid.tsx

Estrutura relevante do editor (hoje):
- 3 containers (abas dia/semana/mes) com `className="flex h-[calc(100svh-16rem)] min-h-0 flex-col"`; só o da aba ativa monta (Radix Tabs desmonta inativos).
- Cadeia de altura acima é toda `min-h-svh`/`flex-1` (sidebar-inset), sem altura FIXA no topo → flex-fill puro não basta; por isso medir é a rota robusta.
Grade (`calendar-time-grid.tsx`): wrapper externo `<div className="flex h-full flex-col overflow-x-auto">`.
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Altura medida dinamicamente no editor + overflow-y travado na grade</name>
  <files>components/dashboard/agenda/calendar-editor.tsx, components/dashboard/agenda/calendar-time-grid.tsx</files>
  <action>
(A) `calendar-time-grid.tsx`: no wrapper externo, trocar `overflow-x-auto` por `overflow-x-auto overflow-y-hidden` (impede scrollbar-y interno; mantém o scroll horizontal). Nada mais muda.

(B) `calendar-editor.tsx`: substituir o `h-[calc(100svh-16rem)]` fixo dos 3 containers por uma ALTURA MEDIDA:
  - Criar um `ref` (callback ref) atribuído ao container de altura da aba ATIVA (o mesmo ref nos 3, só o montado registra) e um estado `gridHeight: number | null` (default null).
  - `measure()`: se o ref existe, `const top = ref.current.getBoundingClientRect().top; setGridHeight(Math.max(320, window.innerHeight - top - BOTTOM))` onde `BOTTOM = 32` (≈ p-8 inferior do layout) + pequena folga; piso de 320px pra telas curtas.
  - Chamar `measure()`: no mount (via `requestAnimationFrame` após pintar), em `window` `resize`, e quando `activeTab`/a semana (`nav`/cursor) mudar (dep no `useEffect`). Limpar o listener no cleanup. Usar `ResizeObserver` no `document.documentElement` (ou window resize) para robustez.
  - Aplicar nos 3 containers: manter `className="flex min-h-0 flex-col"` e passar `style={{ height: gridHeight ?? undefined }}`; enquanto `gridHeight` é null (primeiro paint/SSR), usar um fallback de classe `h-[calc(100svh-16rem)]` que é sobrescrito assim que mede. (Ou seja: `className="... h-[calc(100svh-16rem)]"` + `style` com height quando medido — o inline vence.)
  - NÃO mudar mais nada (drawer, tabs, lógica). Só a fonte da altura.
Tokens/estrutura inalterados; sem hex/rgb novos; sem deps novas.
  </action>
  <verify>
    <automated>yarn typecheck</automated>
    <automated>yarn build 2>&1 | tail -5</automated>
    <automated>grep -q "overflow-y-hidden" components/dashboard/agenda/calendar-time-grid.tsx || (echo "faltou overflow-y-hidden" && exit 1)</automated>
    <automated>grep -q "getBoundingClientRect" components/dashboard/agenda/calendar-editor.tsx || (echo "faltou medicao de altura" && exit 1)</automated>
  </verify>
  <acceptance_criteria>
    - `calendar-time-grid.tsx` wrapper externo tem `overflow-y-hidden` (grep).
    - `calendar-editor.tsx` mede a altura (grep `getBoundingClientRect`) e aplica via `style` height nos containers; recalcula em resize e troca de aba (grep `resize` e dep de `activeTab`).
    - `yarn typecheck` e `yarn build` passam.
  </acceptance_criteria>
  <done>A altura da grade é medida (sem calc fixo), a página não rola e a grade não tem scroll-y interno; recalcula em resize/troca de aba; typecheck+build limpos.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2 [BLOCKING]: Verificação visual do scroll</name>
  <action>Checkpoint — sem código. Rodar e conferir.</action>
  <how-to-verify>
1. `yarn dev` → `/dashboard/agenda` (perfil pago).
2. Dia, Semana e Mês: NÃO deve haver scroll vertical — nem na página, nem dentro da grade. A grade termina exatamente no rodapé visível.
3. Redimensione a janela (menor/maior) e troque de aba (Dia/Semana/Mês) e de semana (‹ ›): a grade deve reajustar a altura sem criar scroll vertical.
4. Se muitas colunas (Semana) estreitarem demais, o scroll HORIZONTAL ainda funciona.
  </how-to-verify>
  <resume-signal>Digite "aprovado" ou descreva o que ainda rola.</resume-signal>
</task>

</tasks>

<verification>
- `yarn typecheck` + `yarn build` passam.
- Sem scroll vertical (página nem grade) em Dia/Semana/Mês; altura reajusta em resize/troca de aba; scroll-x preservado.
- Só UI; nenhum arquivo de backend/page.tsx tocado.
</verification>

<output>
Create `.planning/quick/260724-hdr-fix-calendario-com-scroll-vertical-altur/260724-hdr-SUMMARY.md` when done.
</output>
