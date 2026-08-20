# Quick Task 260724-gyi: Aplicar paleta pastel clara com degradê na Agenda — Context

**Gathered:** 2026-07-24
**Status:** Ready for planning
**Branch:** `redesign/agenda-hibrida` (continua du8 + kej + m6r + cfl + f3j)

<domain>
## Task Boundary

Substituir o esquema de cores atual da Agenda (o verde saturado do f3j + os 5 status atuais) pela **paleta pastel clara com degradê** aprovada pelo usuário (mockup `260724-gyi-DESIGN-MOCKUP.html` nesta pasta). CAMADA DE UI apenas. Editar `app/globals.css` é o núcleo da tarefa. NÃO mudar comportamento — só cores (mantendo forma: tracejado do pendente, hachura+riscado do cancelado, ícones).
</domain>

<decisions>
## Implementation Decisions (LOCKED)

- **G-1 (fonte da verdade):** As cores EXATAS vêm do mockup aprovado `260724-gyi-DESIGN-MOCKUP.html` (abrir e ler os valores oklch e os degradês). Não reinventar tons.
- **G-2 (centralizar em globals.css):** Definir a paleta como variáveis CSS em `app/globals.css` (`:root` + `.dark`), cada preenchimento como um **degradê oklch** (linear-gradient 160°), mais `-line` (borda) e `-ink` (texto/ícone). Preferir nomes semânticos, ex.: `--agenda-avail`/`--agenda-avail-line`/`--agenda-avail-ink`, `--agenda-folga*`, e `--agenda-st-pending*`/`-confirmed*`/`-done*`/`-no_show*`/`-canceled*`. Substituir/aposentar as vars `--calendar-available*` do f3j.
- **G-3 (consumo por classe):** Como os preenchimentos são GRADIENTES (background-image), criar classes utilitárias em `app/globals.css` (ex.: `.agenda-avail`, `.agenda-folga`, `.agenda-vazio`, `.agenda-st-pending` … `.agenda-st-canceled`) que aplicam `background`, `border-color`/estilo e `color` a partir das vars. Os componentes passam a usar essas classes em vez das utilities Tailwind de cor atuais.
- **G-4 (o que muda):**
  - Fundo da grade (calendar-time-grid + calendar-month-indicator): disponível → `.agenda-avail` (menta clara com degradê); folga → `.agenda-folga` (areia clara com degradê + hachura); vazio → branco.
  - 5 status (appointment-status-style.ts): trocar as classes de fill/borda/texto pelas novas classes/vars pastéis, MANTENDO os ícones e a FORMA (pendente = borda tracejada; cancelada = hachura + nome riscado; realizada/falta/confirmada = borda sólida). A legenda e os chips que consomem `APPOINTMENT_STATUS_STYLE` herdam automaticamente.
- **G-5 (dark mode):** Fornecer variantes `.dark` coerentes: manter os MATIZES, mas adaptar a claridade para fundo escuro (preenchimentos ~L 0.26–0.34 com o hue, bordas ~L 0.42–0.52, texto ~L 0.82–0.9). Não deixar o dark ilegível. (O app usa next-themes; `.dark` já existe em globals.css.)
- **G-6 (sem regressão):** Nada de comportamento novo. Confirmada deixa de ser azul sólido forte e passa a ser o azul pastel do mockup — é a direção aprovada. Contraste texto/fundo deve permanecer legível (o mockup foi validado).

### Valores (do mockup — light; conferir no HTML)
- avail: `linear-gradient(160deg, oklch(0.99 0.016 162), oklch(0.968 0.038 162))`; line `oklch(0.87 0.045 162)`; ink `oklch(0.53 0.07 162)`
- folga: `linear-gradient(160deg, oklch(0.992 0.004 75), oklch(0.968 0.008 75))` + hachura; line `oklch(0.9 0.008 75)`; ink `oklch(0.57 0.015 75)`
- vazio: `oklch(1 0 0)`
- pending: `linear-gradient(160deg, oklch(0.986 0.018 74), oklch(0.958 0.046 72))`; line `oklch(0.87 0.08 72)` (tracejada); ink `oklch(0.55 0.1 62)`
- confirmed: `linear-gradient(160deg, oklch(0.978 0.02 248), oklch(0.948 0.046 248))`; line `oklch(0.84 0.07 250)`; ink `oklch(0.51 0.1 255)`
- done: `linear-gradient(160deg, oklch(0.982 0.018 300), oklch(0.952 0.042 300))`; line `oklch(0.87 0.05 300)`; ink `oklch(0.54 0.085 300)`
- no_show (falta): `linear-gradient(160deg, oklch(0.982 0.018 24), oklch(0.952 0.046 22))`; line `oklch(0.88 0.075 22)`; ink `oklch(0.57 0.12 22)`
- canceled: `linear-gradient(160deg, oklch(0.988 0.003 262), oklch(0.968 0.005 262))` + hachura; line `oklch(0.91 0.005 262)`; ink `oklch(0.59 0.01 262)`; nome riscado

### Claude's Discretion
- Nomes exatos das classes/vars; onde colocá-las em globals.css (um bloco/`@layer`).
- Valores oklch precisos do `.dark` (dentro das faixas de G-5).
- Cor exata da hachura no dark.
</decisions>

<canonical_refs>
## Canonical References

- `.planning/quick/260724-gyi-aplicar-a-paleta-pastel-clara-com-degrad/260724-gyi-DESIGN-MOCKUP.html` — FONTE DA VERDADE das cores/degradês.
- `app/globals.css` — onde a paleta vive (`:root` + `.dark`); aposentar `--calendar-available*` do f3j.
- `components/dashboard/agenda/appointment-status-style.ts` — mapa dos 5 status (trocar fills/bordas/texto por classes pastéis; manter ícones/forma).
- `components/dashboard/agenda/calendar-time-grid.tsx` — fundo das células (avail/folga/vazio).
- `components/dashboard/agenda/calendar-month-indicator.tsx` — cores coerentes no Mês.
- Legenda/chips (se houver) consomem APPOINTMENT_STATUS_STYLE — herdam.
- NÃO alterar: lib/**, actions/**, modules/**, supabase/migrations/**, app/dashboard/agenda/page.tsx.
</canonical_refs>
