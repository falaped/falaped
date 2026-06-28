# Phase 1: Experiência da Consulta - Research

**Researched:** 2026-06-28
**Domain:** Pediatric consultation UX — precise age engine, persisted consultation timer, PDF print-spacing fix (Next.js 16 + React 19 + Supabase + `@falaped/falaped-kit/pdf`)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Cronômetro de Consulta**
- **D-01:** Timer vinculado ao caso/atendimento — reusa `cases.started_at` / `cases.ended_at` (já existem). NÃO criar cronômetro avulso desvinculado.
- **D-02:** Auto-start ao abrir o caso — começa a contar quando o atendimento é aberto/criado, sem botão "Iniciar consulta".
- **D-03:** Suporta pausar/retomar. ⚠️ Pausa/retomada exige persistência ALÉM de `started_at`/`ended_at`. Reconciliar o âncora de tempo (contar de `started_at` da criação do caso vs timestamp explícito de início de consulta). Resolver o modelo de dados no planejamento.
- **D-04:** UI = widget flutuante reposicionável por drag-and-drop. Reaproveita `@dnd-kit`. Persistir a posição entre sessões é discrição do Claude.
- **Nota:** tick client-side calculando a partir do timestamp (setInterval só repinta) — não usar contador incremental que zera no reload.

**Exibição da Idade**
- **D-05:** Idade no perfil/cabeçalho do paciente, no cabeçalho do caso (junto do cronômetro) e (intenção) nos documentos — documentos se concretiza na Fase 3; aqui só registra a intenção. NÃO mostrar em listas de pacientes.
- **D-06:** A idade acompanha a data de nascimento (exibe ambos, ex: "12/03/2025 · 3 meses e 12 dias").
- **D-07:** Faixa etária: 0–28 dias → dias; ~1–3 meses → semanas (até ~12 semanas); ~3–24 meses → meses + dias; ≥24 meses → anos + meses. Derivado da data de nascimento, sem armazenar idade.
- **D-08:** Texto por extenso ("3 meses e 12 dias"). Forma abreviada em espaços compactos fica a critério do Claude.

**Casos de Borda da Idade**
- **D-09:** Sem data de nascimento → aviso/CTA para completar o cadastro (não vazio, não quebrar).
- **D-10:** Idade corrigida de prematuro ENTRA neste ciclo. ⚠️ Requer campo novo de idade gestacional ao nascer no cadastro (migração `patients` + input no formulário) e cálculo de idade corrigida até ~24 meses de idade corrigida, com rótulo distinguindo corrigida vs cronológica.
- **D-11:** Mostrar idade em semanas até ~3 meses (12 semanas), depois trocar para meses+dias.
- **D-12:** Data de nascimento inválida ou no futuro → mostrar erro/aviso (não silenciar, não tratar como ausente).
- **Nota:** motor de idade = helper único e testado em `lib/`, com data-calendário em meia-noite local (não `new Date("YYYY-MM-DD")` UTC, não divisão de ms), com fim de mês, ano bissexto, virada de ano e recém-nascido. Reaproveitado pela vacina (Fase 5).

**Correção de Impressão (CONS-04) — delegada ao pesquisador (resolvida abaixo).**

### Claude's Discretion
- Estilo/posição exata do badge de idade por contexto (extenso no perfil; pode abreviar em cabeçalhos/áreas apertadas).
- Persistência (ou não) da posição do widget flutuante entre sessões.
- Estrutura de dados da pausa (segmentos vs acumulado), desde que o tempo sobreviva a reload e seja correto.

### Deferred Ideas (OUT OF SCOPE)
- **Analytics de tempo de consulta** (média, histórico por paciente) — v2 (AI-02). O cronômetro só gera os dados; agregação fica para depois.
- **Discussão da correção do PDF (CONS-04)** — não discutida por escolha do usuário; resolvida via pesquisa, continua no escopo da Fase 1.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONS-01 | Idade da criança por faixa etária (dias / semanas / meses+dias / anos+meses) + idade corrigida de prematuro (D-10) | Single tested `lib/compute-pediatric-age.ts` using `date-fns@4.4.0`; replaces existing untested `formatAgeFromBirthDate`. Migration adds `patients.gestational_age_weeks` (+ optional days). See Age Engine sections. |
| CONS-02 | Cronômetro de consulta contando ao vivo | Custom `useConsultationTimer` hook computing `elapsed = Date.now() - anchor - pausedMs`; `setInterval` repaints only. Floating draggable widget via `@dnd-kit@6.3.1`. |
| CONS-03 | Início/fim persistido, sobrevive a reload/navegação | Anchor from `cases.started_at` (DB-persisted on insert). Pause/resume needs a NEW column (`consultation_paused_ms` accumulator + `consultation_paused_at`). See Timer Data Model. |
| CONS-04 | PDF de relatório sem página em branco extra nem faixa de espaço no rodapé | Root cause confirmed in `@falaped/falaped-kit@0.2.7` (mixed flow/absolute model, estimate≠render drift, forced footer reserve). Kit is a PUBLISHED package (dist-only, not editable here) → requires kit release OR app-side mitigation. See CONS-04 dedicated section. |
</phase_requirements>

## Summary

Everything in Phase 1 is achievable with **zero new runtime dependencies** — `date-fns@4.4.0` (verified installed), `@dnd-kit/core@6.3.1` (verified installed), React 19, and the existing Supabase three-tier slice pattern cover age, timer, and the persistence model. The work is correctness engineering, two small `patients`/`cases` migrations, one tested `lib/` helper, one client hook + draggable widget, and a decision on how to land the PDF fix given the kit is consumed as a published artifact.

The most important and most uncertain finding is **CONS-04**: the root cause is fully confirmed by reading the kit's compiled `dist/pdf/index.js`, but **`@falaped/falaped-kit` is pinned to `0.2.7` as a published npm package (`node_modules/@falaped/falaped-kit`, `dist`-only, no `src`, not a workspace symlink, no local `file:`/`workspace:` path)**. There is no kit source in this repo. So the clean fix (refactor the report builder to one layout model) cannot be done from this repo — it requires a coordinated kit release and version bump. This research lays out BOTH paths concretely: (A) the kit fix (source change + release + bump), and (B) an **app-side mitigation** that materially reduces the bug without touching the kit, by sanitizing `sections` content before calling `buildReportPdf` (collapsing the `\n\n` empty-paragraph inflation that `htmlToPlainTextForPdf` produces and dropping empty sections). Path B is feasible today and partially satisfies the success criteria; full elimination of the phantom page at the ~1.05-page boundary requires Path A.

The second keystone is the **age engine**. There is already an inline, untested `formatAgeFromBirthDate` in `modules/falaped-assistant/lib/formatters.ts` that is exactly the anti-pattern CONS-01 forbids: years/months only (no days, no weeks, no months+days), no leap/month-end handling, no corrected-age. The plan must introduce ONE tested `lib/compute-pediatric-age.ts`, route the patient hero, case header, and assistant context through it, and add the `gestational_age_weeks` field for corrected age (D-10).

**Primary recommendation:** Build `lib/compute-pediatric-age.ts` (tested, local-midnight, range-banded per D-07/D-11, corrected-age aware) as the keystone; model the timer on `cases.started_at` + a new pause accumulator column with a client hook computing elapsed from the timestamp; and for CONS-04, ship **Path B app-side sanitization now** and **flag Path A (kit release) as the only complete fix** for the planner to schedule with the kit owner.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pediatric age computation (CONS-01) | `lib/` pure helper | `modules/`, components consume it | Pure calendar math; must be unit-tested and reused (display + vaccines Fase 5). No DB, no I/O. |
| Gestational-age field (D-10) | Database (`patients`) + `modules/patients` | `app/` form + action | New column + form input + validation; same patient slice extension. |
| Age display (CONS-01) | `app/`/components (presentation) | `lib/` helper | Pure render from DOB; no storage of derived age (D-07). |
| Timer anchor persistence (CONS-03) | Database (`cases`) + `modules/cases` | `actions/cases` | Start/end/pause are durable consultation state; survives reload. |
| Live timer tick (CONS-02) | Browser/client (React hook) | — | Repaint-only `setInterval`; elapsed derived from persisted timestamp. |
| Pause/resume control (D-03) | `actions/cases` → `modules/cases` (write) | client (optimistic) | Mutates durable case state; must scope by ownership + paid gate. |
| Draggable widget position (D-04) | Browser/client (`@dnd-kit` + localStorage) | — | Pure UI affordance; position persistence optional (Claude's discretion). |
| PDF generation (CONS-04) | `@falaped/falaped-kit/pdf` (external, server) | `actions/cases` (input mapping/sanitization) | Kit owns rendering; app owns the payload it sends. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `date-fns` | 4.4.0 `[VERIFIED: node_modules]` | Pediatric age calendar math (`intervalToDuration`, `differenceInDays`, `differenceInWeeks`, `differenceInMonths`, `add`, `isValid`, `isAfter`) | Already the project's date lib; calendar-correct decomposition; tree-shakes. Adding dayjs/luxon would duplicate. |
| `@dnd-kit/core` | 6.3.1 `[VERIFIED: node_modules]` | Draggable floating timer widget (D-04) | Already installed (`@dnd-kit/core`, `/sortable`, `/utilities`); `useDraggable` + `DndContext` is the minimal free-drag pattern. |
| React | 19.0.0 `[VERIFIED: package.json]` | `useConsultationTimer` hook (`useState`/`useRef`/`useEffect`) | Timer is ~30 lines; no library needed. |
| `@falaped/falaped-kit/pdf` | 0.2.7 `[VERIFIED: node_modules]` | Report PDF rendering (`buildReportPdf`) — CONS-04 target | System of record for all PDF rendering. **Published package, dist-only — see CONS-04 for editability constraint.** |
| `zod` | 4.x `[CITED: CLAUDE.md]` | Validate gestational-age input + pause/resume action payloads | Project-mandated boundary validation. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns/locale/pt-BR` | 4.4.0 | PT-BR formatting consistency | Already used in `lib/brazilian-date-form.ts`, `lib/formatters.ts`. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom timer hook | `react-timer-hook`, `react-use-precision-timer` | Never for this scope — adds bundle + maintenance for trivial timestamp-diff logic. |
| date-fns `intervalToDuration` | `dayjs`+duration, `luxon`, Temporal | Never — duplicates the existing date-fns 4 dependency. |
| Kit PDF layout fix | Puppeteer / `@react-pdf/renderer` | Never for a spacing bug — bundles Chromium on Vercel, rewrites working ABNT templates. |

**Installation:**
```bash
# NOTHING new required for this phase. All libs verified present in node_modules.
```

**Version verification (done this session):**
- `date-fns@4.4.0` — confirmed in `node_modules/date-fns/package.json`. `intervalToDuration`, `differenceInDays`, `differenceInWeeks` present in date-fns 4.
- `@dnd-kit/core@6.3.1` — confirmed in `node_modules/@dnd-kit/core/package.json`.
- `@falaped/falaped-kit@0.2.7` — confirmed in `node_modules/@falaped/falaped-kit/package.json`; pinned exactly (`"@falaped/falaped-kit": "0.2.7"`) in root `package.json`.

## Package Legitimacy Audit

> No new external packages are installed in this phase. All libraries are already in the lockfile and verified present in `node_modules` this session. slopcheck not required (no new install surface).

| Package | Registry | Disposition |
|---------|----------|-------------|
| `date-fns@4.4.0` | npm (already installed) | No-op — existing dependency, verified in node_modules |
| `@dnd-kit/core@6.3.1` | npm (already installed) | No-op — existing dependency, verified in node_modules |
| `@falaped/falaped-kit@0.2.7` | private/internal (already installed, dist-only) | No-op — existing pinned dependency; CONS-04 may require a version BUMP (not a new package) |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                        ┌───────────────────────── CONS-01 (Age) ──────────────────────────┐
  Patient.birth_date ──>│ lib/compute-pediatric-age.ts (PURE, TESTED, local-midnight)        │
  patients.gestational_ │   • parse YYYY-MM-DD → new Date(y, m-1, d) (local midnight)         │
   age_weeks (NEW, D-10)│   • band by age (D-07/D-11): days | weeks | months+days | years    │
                        │   • corrected age if gestational < 37w, up to ~24mo corrected      │
                        │   • returns {chronological, corrected?, band, parts, warning}      │
                        └───────────┬───────────────────────────────┬───────────────────────┘
                                    │ consumed by                    │ consumed by (Fase 5)
                       ┌────────────▼─────────────┐     ┌────────────▼─────────────┐
                       │ PatientDetailHero (perfil)│     │ vaccine due/overdue logic │
                       │ CaseDetailHeader (caso)   │     │ (out of this phase)       │
                       │ assistant context lines   │     └───────────────────────────┘
                       └───────────────────────────┘

                        ┌──────────────────── CONS-02 / CONS-03 (Timer) ───────────────────┐
  open/create case ────>│ cases.started_at (DB default, PERSISTED) = anchor                  │
  pause click ─────────>│ action → modules/cases: write consultation_paused_at (NEW)         │
  resume click ────────>│ action → modules/cases: accumulate into consultation_paused_ms(NEW)│
  close case ──────────>│ cases.ended_at (existing)                                          │
                        └───────────┬───────────────────────────────────────────────────────┘
                                    │ client reads started_at + paused fields
                       ┌────────────▼──────────────────────────────────────┐
                       │ useConsultationTimer (React)                        │
                       │   elapsed = (ended_at?? now) - started_at - pausedMs│
                       │   setInterval(1s) → repaint ONLY (no counter)       │
                       └────────────┬───────────────────────────────────────┘
                       ┌────────────▼──────────────┐
                       │ Floating widget (@dnd-kit) │  position → localStorage (optional)
                       └────────────────────────────┘

                        ┌──────────────────────── CONS-04 (PDF) ───────────────────────────┐
  report.sections ─────>│ actions/cases/download-case-report-pdf.ts                          │
   [{name,content}]     │   PATH B (app, feasible now): sanitize sections                    │
                        │     • drop sections with empty content                             │
                        │     • collapse \n{3,} → \n\n before sending                         │
                        │     • remove console.log("datapdf") (cleanup)                       │
                        │   ───────────────────────────────────────────────────────────────│
                        │   buildReportPdf(datapdf)  ── @falaped/falaped-kit/pdf (0.2.7)     │
                        │     PATH A (kit, complete fix): refactor builder → one layout model │
                        │     + release new kit version + bump pin in package.json           │
                        └───────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities
| File | Responsibility | New / Edit |
|------|----------------|------------|
| `lib/compute-pediatric-age.ts` | Pure age engine (chronological + corrected, banded) | NEW |
| `lib/compute-pediatric-age.spec.ts` | Edge-case unit tests (tsx --test) | NEW |
| `lib/format-pediatric-age.ts` (or in same file) | PT-BR extenso + abbreviated rendering (D-08) | NEW |
| `modules/patients/types.ts` | Add `gestational_age_weeks: number \| null` (+ optional `_days`) | EDIT |
| `modules/patients/create-patient.ts` / `update-patient.ts` | Persist gestational age; extend `PATIENT_SELECT` | EDIT |
| `components/dashboard/patients/patient-form/patient-form-personal-section.tsx` | Gestational-age input field | EDIT |
| `components/dashboard/patients/patient-detail-hero.tsx` | Replace `formatAgeFromBirthDate` with new engine; show DOB · age (D-06) | EDIT |
| `components/dashboard/cases/case-detail-header.tsx` | Show patient age next to timer (D-05) | EDIT |
| `modules/falaped-assistant/lib/formatters.ts` | Route `formatAgeFromBirthDate` callers through new engine (or deprecate) | EDIT |
| `hooks/use-consultation-timer.ts` | Client elapsed-from-timestamp hook | NEW |
| `components/dashboard/cases/consultation-timer-widget.tsx` | Draggable floating widget (`@dnd-kit`) | NEW |
| `actions/cases/pause-consultation.ts` / `resume-consultation.ts` | Pause/resume mutations (auth + paid + scope) | NEW |
| `modules/cases/pause-consultation.ts` / `resume-consultation.ts` | Write pause fields scoped by ownership | NEW |
| `actions/cases/download-case-report-pdf.ts` | Sanitize sections (Path B) + remove `console.log` | EDIT |
| `supabase/migrations/<ts>_patients_add_gestational_age.sql` | `ADD COLUMN gestational_age_weeks` | NEW |
| `supabase/migrations/<ts>_cases_add_consultation_pause.sql` | `ADD COLUMN consultation_paused_ms`, `consultation_paused_at` | NEW |

### Pattern 1: Single tested age engine (keystone)
**What:** One pure function in `lib/`, no I/O, returns a structured result the UI formats.
**When to use:** Every age display and (Fase 5) every vaccine eligibility check.
**Example (recommended shape):**
```typescript
// lib/compute-pediatric-age.ts — local-midnight calendar math, no ms division
import { differenceInDays, differenceInWeeks, intervalToDuration, isAfter, isValid } from "date-fns"

export type AgeBand = "days" | "weeks" | "months_days" | "years_months"
export type PediatricAgeStatus = "ok" | "missing_birth_date" | "invalid" | "future"

export type PediatricAge = {
  status: PediatricAgeStatus
  band?: AgeBand
  totalDays?: number
  parts?: { years?: number; months?: number; weeks?: number; days?: number }
  corrected?: { band: AgeBand; parts: PediatricAge["parts"]; appliesUntilMonths: number }
}

/** Build a LOCAL-midnight Date from a YYYY-MM-DD string (never new Date("YYYY-MM-DD") → UTC). */
function localMidnightFromIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return isValid(d) ? d : null
}

export function computePediatricAge(
  birthDateIso: string | null | undefined,
  now: Date = new Date(),
  gestationalAgeWeeks?: number | null,
): PediatricAge {
  if (!birthDateIso) return { status: "missing_birth_date" }      // D-09
  const birth = localMidnightFromIso(birthDateIso)
  if (!birth) return { status: "invalid" }                         // D-12
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (isAfter(birth, today)) return { status: "future" }           // D-12

  const totalDays = differenceInDays(today, birth)
  // Banding per D-07 / D-11:
  //   0–28 days → days; <~12 weeks → weeks; <24 months → months+days; else years+months.
  // months+days uses intervalToDuration (calendar-correct; respects month lengths) — the
  // months-then-remainder rule. Never subtract month numbers manually.
  // ... (full banding + corrected-age branch in implementation)
  return { status: "ok", totalDays /* + band/parts */ }
}
```
> Corrected age (D-10): when `gestationalAgeWeeks` is present and `< 37`, subtract `(40 - gestationalAgeWeeks)` weeks of prematurity from chronological age; apply only until ~24 months *corrected*. Label distinctly ("idade corrigida"). Decide and unit-test the Feb-29 policy.

### Pattern 2: Elapsed-from-timestamp timer
**What:** Persist the start instant; compute elapsed on every tick; `setInterval` only triggers re-render.
**Example:**
```typescript
// hooks/use-consultation-timer.ts
import { useEffect, useState } from "react"

export function useConsultationTimer(opts: {
  startedAt: string            // cases.started_at (ISO, persisted)
  endedAt: string | null       // cases.ended_at
  pausedMs: number             // consultation_paused_ms accumulator (NEW column)
  pausedAt: string | null      // consultation_paused_at (NEW column) — set ⇒ currently paused
}): number {
  const [, force] = useState(0)
  const running = !opts.endedAt && !opts.pausedAt
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => force((n) => n + 1), 1000) // repaint ONLY
    return () => clearInterval(id)
  }, [running])
  const anchor = new Date(opts.startedAt).getTime()
  const end = opts.endedAt ? new Date(opts.endedAt).getTime()
    : opts.pausedAt ? new Date(opts.pausedAt).getTime()
    : Date.now()
  return Math.max(0, end - anchor - opts.pausedMs)  // ms elapsed, drift-free
}
```

### Anti-Patterns to Avoid
- **Inline age math in components** (the current `formatAgeFromBirthDate` is this). One tested `lib/` helper only.
- **`new Date("YYYY-MM-DD")`** — parses as UTC midnight → off-by-one in America/Sao_Paulo. Use `new Date(y, m-1, d)`.
- **Millisecond division for age** — ignores calendar/month-length. Use date-fns calendar functions.
- **`setInterval` counter that increments** — drifts and freezes when tab is backgrounded; resets on reload. Compute from the stored timestamp.
- **Nudging kit gap constants to "fix" CONS-04** — masks the estimate/render drift; breaks at other content lengths (PITFALLS.md). Fix the model (Path A) or sanitize input (Path B), not the constants.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Months+days decomposition | Manual month-number subtraction | `intervalToDuration` (date-fns) | Respects variable month lengths; the Jan-31 / leap trap is handled. |
| Whole-day / week counts | `(now-birth)/86400000` | `differenceInDays` / `differenceInWeeks` | Calendar-correct, no DST/UTC drift. |
| Live timer | A counter incremented in `setInterval` | Timestamp-diff hook | Drift-free, survives reload/background. |
| Draggable widget | Custom mouse/touch drag handlers | `@dnd-kit` `useDraggable` | Already a dependency; handles pointer/touch/keyboard a11y. |
| PDF layout | Hand-tracked `y` + separate `heightOfString` estimate | One layout model in the kit (Path A) | Mixing flow+absolute is the exact CONS-04 root cause. |

**Key insight:** Every CONS-01 edge case (month-end, leap, year rollover, newborn, near-midnight) is a known date trap that date-fns + local-midnight construction solves; the danger is re-deriving the math inline (as the current assistant formatter does).

## CONS-04 — PDF Print Fix (delegated open area, resolved)

### Bug surface — CONFIRMED
The defect is in the **kit-generated downloaded PDF** (`buildReportPdf` from `@falaped/falaped-kit/pdf`), not browser print. Confirmed by reading `actions/cases/download-case-report-pdf.ts`: it maps `report.sections` → `{ title: s.name, content: s.content ?? "—" }`, builds `datapdf`, and calls `await buildReportPdf(datapdf)`, returning base64. CONTEXT's assumption holds.

### Root cause — CONFIRMED from compiled source (`node_modules/@falaped/falaped-kit/dist/pdf/index.js`)
The report builder mixes pdfkit's **flow model** (`doc.text` advancing `doc.y`, auto page-break) with an **absolute model** (hand-tracked `let y`, explicit `x,y`), and estimates height with `heightOfString` on a path that does NOT match the render path. Three stacked causes (all present in `buildReportPdf` / `mountSectionsHead` / `mountLastSection` / `preparePageForLastSection` / `footerGeometry`):

1. **Empty-paragraph inflation.** `htmlToPlainTextForPdf` (lines 80–114) turns `</p><p>` and `<br>` into `\n\n`/`\n`. `drawReportBodyParagraphs` (122–146) splits on `\n\n+`, filters empties, then adds `reportBodyParagraphGapPt` (6pt) *between* every paragraph. Trailing/empty TipTap paragraphs inflate paragraph count and vertical space. **(Sanitizable from the app — Path B.)**
2. **Forced footer reserve triggers early `addPage()`.** `footerGeometry` (253–267) computes `contentLimit = footerTop - REPORT_MIN_GAP_SECTION_TO_FOOTER(200pt)`. `preparePageForLastSection` (343–356) calls `doc.addPage()` when the *estimated* last-section height crosses `contentLimit`. A 200pt forced reserve at the ~1.05-page boundary is the phantom-page source. **(Kit-only — Path A.)**
3. **Estimate ≠ render drift.** `estimateSectionBlockHeight`/`estimateReportBodyHeight` (147–164, 330–342) use `heightOfString` with `{width, lineGap}` but the render adds manual `paragraphSpacing`/`sectionSpacing` and re-reads `doc.y` after auto-breaking calls — the two diverge per paragraph, accumulating reserved-but-unused space (trailing band) or under-reserving (overflow). **(Kit-only — Path A.)**

### Kit editability — DECISION REQUIRED
`@falaped/falaped-kit` is a **published package pinned to `0.2.7`** in root `package.json` (`"@falaped/falaped-kit": "0.2.7"`). In `node_modules` it is **dist-only** (`dist/` compiled JS + `.d.ts`, `README.md`, `package.json` — no `src/`), and **not** a workspace member, symlink, or `file:`/`workspace:` path. **The kit source is NOT in this repo.** Therefore:

- **Path A (complete fix, kit repo):** Refactor `buildReportPdf` to a single layout model (flow-only: let pdfkit own `doc.y`, use one shared `opts` for measure+render, reserve the footer via `setFutureMargins`/bottom margin once instead of the `REPORT_MIN_GAP_SECTION_TO_FOOTER` race). Then **release a new kit version and bump the pin** in `package.json`. This is the ONLY path that eliminates causes #2 and #3 (the phantom page at ~1.05 pages and the trailing band). **Requires access to the separate kit repo + a release.** `[ASSUMED: kit repo is editable by the team — NOT verifiable from this repo; planner must confirm with the kit owner.]`
- **Path B (partial mitigation, this repo, feasible today):** In `download-case-report-pdf.ts`, before building `datapdf`, sanitize each section's `content`: drop sections whose content is empty/whitespace, and collapse runs (`\n{3,}` → `\n\n`, strip leading/trailing blank lines). This attacks cause #1 (empty-paragraph inflation), reducing excess trailing space and many spurious breaks. It does **not** remove the 200pt forced reserve, so the boundary-case phantom page can persist. Also remove the forgotten `console.log("datapdf", datapdf)` (line 65) as cleanup.

**Recommendation for the planner:** Ship Path B now (in-repo, low-risk, removes the console.log and most whitespace), AND schedule Path A with the kit owner — Path A is required for full success-criteria #4 (no phantom page at ~1.05 pages). The roadmap already notes Phase 3's new documents reuse this builder, so the kit fix benefits all of them. **Do not** claim CONS-04 fully done on Path B alone.

### Repro sample — how to verify
The report's `sections` come from `case_reports` for a real case (`getCaseReportById`). To exercise the three success-criteria cases (1 page / ~1.05 page boundary / multiple pages) without manual data entry, the cheapest path is a **dev script that calls `buildReportPdf` directly** with synthetic `sections` of controlled length (e.g. lorem text sized to fill 0.9, 1.05, and 2.3 pages of body), writing the buffer to disk for visual inspection. This isolates the kit behavior from the DB and is reusable as a regression check after Path A. Alternatively, generate a real `case_report` with section content padded to each length and download via the action. The boundary case (~1.05 pages) is the critical one — it triggers `preparePageForLastSection`'s early `addPage`.

### Cleanup
Remove `console.log("datapdf", datapdf)` at line 65 of `actions/cases/download-case-report-pdf.ts` (leaks full report payload — including patient name and clinical sections — to server logs; an LGPD-adjacent concern for minors' data).

## Runtime State Inventory

> Phase 1 is mostly code + two small additive migrations. It is not a rename/migration of existing data, but it does touch persisted state, so each category is answered explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `patients.birth_date` (existing, ISO `yyyy-mm-dd`) feeds the age engine — no migration of values, only consumption. NEW `patients.gestational_age_weeks` column (D-10) starts NULL for all existing rows → corrected age simply unavailable until filled (graceful). | Migration adds nullable column; no backfill. |
| Live service config | None. No external service holds Phase-1 state. | None — verified: feature is in-app + Supabase only. |
| OS-registered state | None. | None — verified: no OS-level registrations involved. |
| Secrets/env vars | None new. CONS-04 Path A may require a registry/auth to publish the kit, but that is in the kit repo, not this app's env. | None in this repo. |
| Build artifacts | `node_modules/@falaped/falaped-kit@0.2.7` is the consumed artifact. If Path A is taken, bumping the pin requires `yarn install` to fetch the new version. | After kit release: bump pin + `yarn install`. |

## Common Pitfalls

### Pitfall 1: Off-by-one / timezone-naive pediatric age
**What goes wrong:** `new Date("2025-03-12")` parses as UTC → 21:00 Mar 11 in BRT; age in days flips by the time of day. The existing `formatAgeFromBirthDate` uses `new Date(\`${birthDate}T12:00:00\`)` (noon hack) which dodges the worst case but is still inline and coarse.
**How to avoid:** Build local-midnight dates with `new Date(y, m-1, d)`; compute days via `differenceInDays` of two local-midnight dates; months+days via `intervalToDuration`. One tested helper.
**Warning signs:** Age in days changes depending on what time the doctor opens the patient; "0 meses" for a 10-day-old (current formatter does this — it never shows days/weeks).

### Pitfall 2: Timer that resets or drifts on reload
**What goes wrong:** A `setInterval` counter resets to 0 on navigation/refresh (violates CONS-03) and drifts when the tab is throttled.
**How to avoid:** Anchor on persisted `cases.started_at`; compute `Date.now() - anchor - pausedMs`; `setInterval` only repaints.
**Warning signs:** Elapsed jumps to 0 after F5; clock lags after the tab was backgrounded.

### Pitfall 3: Pause/resume with no persistence (D-03 tension)
**What goes wrong:** `started_at`/`ended_at` alone cannot represent "paused 4 min then resumed" — elapsed would over-count the paused interval after reload.
**How to avoid:** Add `consultation_paused_ms` (bigint/int, accumulated paused milliseconds) and `consultation_paused_at` (timestamptz, non-null ⇒ currently paused). On resume: `paused_ms += now - paused_at; paused_at = null`. Elapsed subtracts `paused_ms` and, while paused, freezes at `paused_at - started_at - paused_ms`. This is the "accumulated" model (simpler than segments; satisfies the discretion clause). Scope writes by ownership; gate `paid`.
**Warning signs:** Elapsed grows while the UI shows "pausado"; reload during pause loses the paused state.

### Pitfall 4: CONS-04 "looks fixed" on one sample
**What goes wrong:** Verifying only a short report hides the boundary-case phantom page.
**How to avoid:** Test at 1 page, ~1.05 pages, and multi-page (success criterion #4). The ~1.05 case is the one that triggers the early `addPage`.

### Pitfall 5: Replacing the age formatter but leaving callers behind
**What goes wrong:** `formatAgeFromBirthDate` is consumed by `patient-detail-hero.tsx` AND the assistant context builder (`modules/falaped-assistant/lib/formatters.ts`). Replacing it in one place leaves inconsistent ages.
**How to avoid:** Route all callers through the new engine (the assistant can keep a thin adapter that formats the engine's result for its `- Idade:` line).

### Pitfall 6: Forgotten payload logging (active)
**What goes wrong:** `console.log("datapdf", datapdf)` ships full clinical report content to logs.
**How to avoid:** Remove it as part of CONS-04 (also covered in Cleanup above).

## Code Examples

### Drop empty / collapse whitespace in sections before PDF (Path B)
```typescript
// actions/cases/download-case-report-pdf.ts — Path B sanitization
const sections = (report.sections ?? [])
  .sort((a, b) => a.order - b.order)
  .map((s) => ({ title: s.name, content: (s.content ?? "").replace(/\n{3,}/g, "\n\n").trim() }))
  .filter((s) => s.content.length > 0) // drop empty sections (cause #1)
// ...build datapdf WITHOUT console.log...
const buffer = await buildReportPdf(datapdf)
```

### Draggable timer widget (free drag, @dnd-kit)
```typescript
// Source: @dnd-kit useDraggable pattern (v6 installed)
import { DndContext, useDraggable } from "@dnd-kit/core"
// DndContext at the case-detail level; widget uses useDraggable; persist {x,y}
// in localStorage on drag end (D-04 position persistence = Claude's discretion).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `formatAgeFromBirthDate` (years/months only) | Tested `lib/compute-pediatric-age.ts` (days/weeks/months+days/years + corrected) | This phase | CONS-01 + reuse by vaccines (Fase 5). |
| Kit `buildReportPdf` mixed flow/absolute layout | Single flow-model layout (Path A) | Pending kit release | Removes phantom page / trailing band. |

**Deprecated/outdated:**
- `formatAgeFromBirthDate` (`modules/falaped-assistant/lib/formatters.ts`): keep as a thin adapter over the new engine or deprecate; do not extend it.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The kit repo is editable by the team and a new version can be released (Path A) | CONS-04 | If the kit is frozen/unowned, only Path B (partial) is available and success criterion #4 cannot be fully met this phase — planner must descope or escalate. |
| A2 | `cases.started_at` is set automatically (DB default) on case insert and reliably reflects consultation start | Timer Data Model | If it is NULL or set elsewhere, the timer anchor needs an explicit write on case open (still satisfiable via the create action). Verify column default in the live `cases` table. |
| A3 | Corrected-age convention: subtract `(40 - gestational_weeks)` weeks, apply until ~24 months corrected | Age Engine (D-10) | Clinical convention; confirm threshold (some use 24mo, some 36mo for very preterm) and the exact "full-term" baseline (40 vs 37 weeks) with the physician before locking. |
| A4 | Accumulated `paused_ms` model (vs time segments) is acceptable per discretion clause | Pitfall 3 | If per-segment audit/analytics is later wanted (AI-02), segments would be richer — but AI-02 is explicitly deferred, so accumulator is fine for v1. |
| A5 | Storing draggable widget position in localStorage is acceptable for D-04 persistence | Architecture | Per-device only; acceptable since position persistence is explicitly Claude's discretion. |

## Open Questions

1. **Kit editability (A1) — blocking for full CONS-04.**
   - What we know: root cause is in the kit; the kit is a published, pinned, dist-only package not present as source in this repo.
   - What's unclear: whether the team can edit + release `@falaped/falaped-kit` this phase.
   - Recommendation: Planner confirms with the kit owner. If yes → Path A + Path B. If no → Path B only, and flag success criterion #4 as partially met (no phantom-page guarantee at the boundary).

2. **Corrected-age threshold + full-term baseline (A3).**
   - What we know: corrected age applies to preterm up to ~24 months corrected.
   - What's unclear: exact cutoff month and the gestational baseline (37 vs 40 weeks) the physician wants.
   - Recommendation: Default to 40-week baseline, 24-month corrected cutoff, label "idade corrigida"; confirm with the doctor in planning/UAT.

3. **`cases.started_at` default (A2).**
   - Recommendation: Verify the column has a DB default / is set on insert; if not, set it explicitly in `createDashboardCaseWithPatient` (auto-start, D-02).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `date-fns` | Age engine (CONS-01) | ✓ | 4.4.0 | — |
| `@dnd-kit/core` | Timer widget (D-04) | ✓ | 6.3.1 | — |
| `@falaped/falaped-kit` | PDF (CONS-04) | ✓ (dist-only) | 0.2.7 | Path B mitigation if kit not editable |
| `tsx` test runner | Age engine spec | ✓ | 4.21.0 | — |
| Supabase (migrations) | gestational-age + pause columns | ✓ (project configured) | — | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Kit source editability for CONS-04 Path A — fallback is Path B (app-side, partial).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in test runner via `tsx --test` |
| Config file | none — `package.json` scripts: `find modules lib -name '*.spec.ts' \| xargs tsx --test` |
| Quick run command | `yarn test` |
| Full suite command | `yarn test` (+ `yarn typecheck`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONS-01 | Age bands (days/weeks/months+days/years) correct, incl. Jan-31, Feb-29 non-leap, newborn 0/1 day, year boundary, near-midnight | unit | `yarn test` (runs `lib/compute-pediatric-age.spec.ts`) | ❌ Wave 0 |
| CONS-01 | Corrected age for preterm; chronological when full-term/absent (D-10) | unit | `yarn test` | ❌ Wave 0 |
| CONS-01 | Missing/invalid/future DOB → status flags (D-09/D-12) | unit | `yarn test` | ❌ Wave 0 |
| CONS-02/03 | Elapsed = now − started_at − pausedMs; frozen while paused; survives reload | unit (pure elapsed fn) | `yarn test` (extract pure `computeElapsedMs` for testability) | ❌ Wave 0 |
| CONS-04 | No phantom page / trailing band at 1 / ~1.05 / multi-page | manual + dev script | dev script renders buffers to disk for visual check | ❌ Wave 0 (manual gate) |

### Sampling Rate
- **Per task commit:** `yarn test` (fast; pure helpers only)
- **Per wave merge:** `yarn test` + `yarn typecheck`
- **Phase gate:** Full suite green + manual CONS-04 visual check at the 3 content sizes before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `lib/compute-pediatric-age.spec.ts` — covers CONS-01 (bands + corrected + edge cases). Reference existing `lib/brazilian-date-form.spec.ts` for the tsx --test style.
- [ ] Extract a pure `computeElapsedMs({startedAt, endedAt, pausedMs, pausedAt}, now)` with its own spec (the React hook wraps it) — covers CONS-02/03 deterministically.
- [ ] CONS-04 dev repro script (synthetic sections at 0.9 / 1.05 / 2.3 pages) — manual visual gate; no auto-assert.

## Project Constraints (from CLAUDE.md)

- **Three tiers:** `app/ → actions/ ("use server" + auth + Zod) → modules/ (one fn per file, SupabaseClient injected)`. New pause/resume must follow this.
- **Auth + paid gate:** every new action calls `getAuthenticatedUser(supabase)` and gates `profile.status === "paid"`. Applies to pause/resume actions.
- **Ownership scoping:** every read/write/**delete** filters by `profile_id` (or `user_phone` dual anchor, per RLS migrations). Pause/resume writes must scope by ownership (follow `updateCaseStatus`'s `user_phone` resolution pattern, which already scopes; do not write `cases` by `id` alone).
- **Modules:** never construct Supabase clients (inject); never import `next/cache`/`next/headers`. Age engine is pure `lib/` (no Supabase at all).
- **Naming:** kebab-case files; one exported fn per `modules/` file; actions suffixed `Action`; JSDoc on exports.
- **Strings:** user-facing PT-BR ("3 meses e 12 dias", "idade corrigida", "pausado").
- **Validation:** Zod `safeParse` at action boundary for gestational age (integer weeks, plausible range e.g. 20–42) and pause/resume payloads; map errors via `lib/zod-error-message.ts`.
- **Tests:** pure logic gets co-located `*.spec.ts` (age engine + elapsed fn).
- **RLS exists** on `patients` and `cases` (migrations `20260604000002/3`) with dual `profile_id`/`user_phone` anchor — new columns inherit table RLS; no new policy needed for added columns.
- **Project skills to honor:** `supabase-falaped` (one query per `modules/{domain}` file, client as first arg), `dashboard-falaped`/`pediatric-dashboard-design` (UI tokens for the age badge + timer widget), `creative-director-falaped` (the floating widget + age badge are UI-bearing — run UI/UX questions if ambiguous).

## Sources

### Primary (HIGH confidence)
- `node_modules/@falaped/falaped-kit/dist/pdf/index.js` (read in full) — confirmed CONS-04 root cause (mixed layout model, `footerGeometry` 200pt reserve, estimate/render drift, `htmlToPlainTextForPdf` `\n\n` inflation).
- `node_modules/@falaped/falaped-kit/package.json` — confirmed `0.2.7`, dist-only, published package, not workspace.
- `actions/cases/download-case-report-pdf.ts` — confirmed bug surface + `console.log` cleanup + sections mapping.
- `node_modules/date-fns/package.json` (4.4.0), `node_modules/@dnd-kit/core/package.json` (6.3.1) — version verification.
- `lib/brazilian-date-form.ts`, `lib/formatters.ts`, `modules/falaped-assistant/lib/formatters.ts` — existing date/age helpers and the inline `formatAgeFromBirthDate` anti-pattern.
- `modules/patients/{types,create-patient,update-patient}.ts`, `components/dashboard/patients/patient-detail-hero.tsx`, `patient-form/` — D-10 integration points.
- `modules/cases/{types,create-dashboard-case-with-patient,update-case-status}.ts`, `components/dashboard/cases/case-detail-header.tsx` — timer anchor + integration points.
- `supabase/migrations/20260604000002_rls_patients.sql`, `20260604000003_rls_cases.sql`, `20260301000000_patients_add_profile_id.sql` — RLS + migration patterns.
- Project research: `.planning/research/{SUMMARY,STACK,PITFALLS,FEATURES}.md` (HIGH confidence, built on directly).

### Secondary (MEDIUM confidence)
- Brazilian pediatric age-display convention and corrected-age practice (FEATURES.md, training knowledge) — confirm thresholds with physician.

### Tertiary (LOW confidence)
- None load-bearing.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified in node_modules.
- Architecture / age engine: HIGH — grounded in existing slices + verified date-fns functions.
- CONS-04 root cause: HIGH — read from compiled kit source.
- CONS-04 fix path: MEDIUM — Path A feasibility depends on kit-repo access (A1, unverifiable here).
- Corrected-age convention: MEDIUM — clinical thresholds need physician confirmation.

**Research date:** 2026-06-28
**Valid until:** ~2026-07-28 (stable; revisit if kit version or date-fns major changes)

## RESEARCH COMPLETE

**Phase:** 1 - Experiência da Consulta
**Confidence:** HIGH (MEDIUM on CONS-04 fix-path feasibility, pending kit-repo access)

### Key Findings
- **Zero new runtime deps** — `date-fns@4.4.0`, `@dnd-kit/core@6.3.1`, React 19, and the kit are all verified present.
- **Age engine (CONS-01):** replace the existing inline, untested, coarse `formatAgeFromBirthDate` with one tested `lib/compute-pediatric-age.ts` (local-midnight, banded per D-07/D-11, corrected-age per D-10). Add nullable `patients.gestational_age_weeks`.
- **Timer (CONS-02/03):** anchor on persisted `cases.started_at`; pause/resume needs a NEW accumulator column pair (`consultation_paused_ms` + `consultation_paused_at`); client hook computes elapsed from the timestamp, `setInterval` repaints only.
- **CONS-04:** root cause confirmed in kit dist source. The kit is a PUBLISHED package (dist-only, pinned 0.2.7, not in this repo) — the complete fix (Path A) requires a kit release + bump; an app-side sanitization (Path B: drop empty sections, collapse `\n\n`, remove the `console.log`) is feasible now but only partial. Boundary-case phantom page needs Path A.

### File Created
`.planning/phases/01-experi-ncia-da-consulta/01-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Versions verified in node_modules |
| Architecture | HIGH | Mirrors existing slices + verified APIs |
| Pitfalls | HIGH | CONS-04 root cause read from source; age traps verified |

### Open Questions
- Is `@falaped/falaped-kit` editable/releasable this phase? (Blocks full CONS-04 — Path A.)
- Corrected-age threshold (24 vs 36 mo) and baseline (40 vs 37 weeks) — confirm with physician.
- Verify `cases.started_at` has a DB default / is set on case open.

### Ready for Planning
Research complete. Planner can create PLAN.md files; must resolve the kit-editability question (A1) before committing CONS-04 scope.
