---
phase: 01-experi-ncia-da-consulta
verified: 2026-06-28T22:00:00Z
status: passed
score: 4/4 success criteria met (CONS-04 in-scope Path B; ~1.05 boundary deferred-by-decision to Phase 5)
overrides_applied: 0
human_verification_resolved: "Confirmado em sessão 2026-06-28: (1) colunas ao vivo verificadas via Supabase MCP list_tables (gestational_age_weeks, consultation_paused_ms/at, started_at default presentes); (3) UX do cronômetro testada no yarn dev e aprovada pelo usuário em múltiplos checkpoints (redesign, reset, reset-ao-reabrir, duas telas, sair do workspace); (4) exibição de idade por faixa aprovada pelo usuário (correção de dias na faixa de anos reportada e aprovada); (2) contagem de páginas do PDF confirmada (1/3/2), faixa-limite ~1,05 diferida para a Phase 5."
human_verification:
  - test: "Confirmar que as colunas aplicadas via Supabase MCP existem no banco ao vivo"
    expected: "patients.gestational_age_weeks (integer, nullable), cases.consultation_paused_ms (bigint default 0), cases.consultation_paused_at (timestamptz, nullable), cases.started_at default now()"
    why_human: "As migrações foram aplicadas via Supabase MCP apply_migration (não via supabase db push commitado); o MCP do Supabase não está disponível neste ambiente de verificação para consultar o schema ao vivo. typecheck verde + 395 testes verdes dão evidência indireta forte, mas a presença ao vivo precisa de confirmação."
  - test: "Abrir os 3 PDFs gerados (tmp/repro-0.9.pdf, tmp/repro-2.3.pdf) e inspecionar visualmente"
    expected: "repro-0.9 = 1 página sem faixa de espaço sobrando no rodapé nem página em branco extra; repro-2.3 = 3 páginas com fluxo limpo. (repro-1.05 = 2 páginas é o limite phantom, esperado — Path A diferido para Phase 5.)"
    why_human: "Contagem de páginas confirmada programaticamente (1 / 3 / 2), mas 'sem espaçamento excessivo nem faixa sobrando no rodapé' é um julgamento visual que grep não verifica."
  - test: "Abrir um atendimento (/dashboard/cases/:id e /dashboard/cases/new/:id) e observar o cronômetro flutuante"
    expected: "Widget aparece, conta ao vivo (1s), arrasta/solta e persiste posição, pausa/retoma/reseta, e some quando o caso é encerrado. Após recarregar a página, o tempo continua correto (não zera)."
    why_human: "Comportamento em tempo real, drag-and-drop e sobrevivência a reload são UX/runtime que só se verificam interagindo com o app."
  - test: "Abrir o perfil de uma criança recém-nascida, lactente, ≥24m e um prematuro com idade gestacional preenchida"
    expected: "Idade exibida pela faixa correta (dias / semanas / meses+dias / anos+meses+dias), ao lado da DOB, por extenso; badge de idade corrigida distinto para o prematuro; CTA 'Completar cadastro' quando falta DOB."
    why_human: "Renderização visual por faixa etária e estado vazio são aparência/UX; a lógica subjacente está coberta por testes, mas a apresentação na tela precisa de olho humano."
gaps: []
deferred:
  - truth: "PDF colapsa para 1 página no limite ~1,05 página (CONS-04 boundary / Path A)"
    addressed_in: "Phase 5"
    evidence: "ROADMAP 'Carried over from Phase 1 — CONS-04 Path A (kit release)': publicar nova versão de @falaped/falaped-kit removendo a reserva forçada de 200pt no rodapé e corrigindo o drift heightOfString estimate≠render, bumpar o pin e re-verificar repro-1.05.pdf colapsar para 1 página. Decisão de usuário documentada; tracked."
---

# Phase 1: Experiência da Consulta Verification Report

**Phase Goal:** O médico vê a idade da criança com precisão pediátrica, cronometra o atendimento e imprime/gera PDFs sem espaçamento excessivo nem página em branco extra — resolvendo a dor de uso diária e estabelecendo o motor de idade que toda lógica de vacina vai consumir.
**Verified:** 2026-06-28T22:00:00Z
**Status:** passed (human-verification items confirmed in-session — see `human_verification_resolved`)
**Re-verification:** No — initial verification

## Goal Achievement

### Success Criteria (Observable Truths)

| # | Criterion (CONS) | Status | Evidence |
| --- | --- | --- | --- |
| 1 | **CONS-01** — Idade por faixa etária correta (dias / meses+dias / anos+meses), derivada da DOB, correta nos casos de borda | ✓ MET | `lib/compute-pediatric-age.ts` (substantive, 180 lines): bands days(0–28d) / weeks(<84d) / months_days(<24m) / years_months(≥24m, inclui dias). Local-midnight via `new Date(y, m-1, d)` (sem UTC parse, sem noon-hack, sem divisão de ms). Guard de rollover rejeita `2025-02-30`. `intervalToDuration` + `differenceInMonths` para decomposição calendar-correct (fim de mês, ano bissexto). Status flags missing/invalid/future. Corrected age para preterm (`<37` sem) até 24m. `yarn test` 395/395 verde (32 engine + 26 formatter cases incl. edge). Renderizado em hero, case-header, dashboard-home, assistant (todos via `computePediatricAge`/`formatPediatricAge`). |
| 2 | **CONS-02** — Cronômetro de consulta com tempo decorrido ao vivo | ✓ MET | `consultation-timer-widget.tsx` (290 lines): widget flutuante `fixed z-50`, arrastável via `@dnd-kit` (`useDraggable`, posição em localStorage + clamp viewport). Auto-start ancorado em `cases.started_at` (gravado em `create-dashboard-case-with-patient.ts:76` + DB default `now()`), sem botão "Iniciar". Tick ao vivo via `useConsultationTimer` (repaint 1s). Pausa/retoma/reset com confirm dialog. Montado em **ambas** `/dashboard/cases/:id` (`case-detail-content.tsx:125`) e `/dashboard/cases/new/:id` (`new-case-workspace.tsx:840`). Auto-hide quando `endedAt != null`. |
| 3 | **CONS-03** — Tempo decorrido correto após reload / navegação (timestamp persistido, não contador) | ✓ MET | `lib/compute-elapsed-ms.ts`: elapsed = `(endedAt ?? pausedAt ?? now) − startedAt − pausedMs`, clamp ≥0, puro. `hooks/use-consultation-timer.ts`: recomputa de timestamps todo render; `setInterval` só faz `forceRepaint()` (NUNCA incrementa). Colunas `started_at` / `consultation_paused_ms` / `consultation_paused_at` selecionadas em `get-case-by-id.ts` (linhas 75–78). Modelo acumulador de pausa em `pause/resume/reset-consultation`. `compute-elapsed-ms.spec.ts` verde. |
| 4 | **CONS-04** — PDF sem página em branco extra nem faixa de espaço no rodapé (1 pág / ~1,05 / múltiplas) | ◑ MET (Path B in-scope) · boundary deferred | `download-case-report-pdf.ts:51–57`: sanitiza `sections` — `.replace(/\n{3,}/g, "\n\n").trim()` + `.filter(s => s.content.length > 0)` (remove parágrafos vazios do TipTap / faixa de espaço morta). PII `console.log("datapdf")` REMOVIDO (count = 0; só `console.error` resta). Repro executado: **repro-0.9.pdf = 1 página**, **repro-2.3.pdf = 3 páginas** (limpo, in-scope ✓). **repro-1.05.pdf = 2 páginas** = o phantom page do limite ~1,05 → Path A (kit release) **diferido para Phase 5 por decisão de usuário documentada no ROADMAP** — descope rastreado, NÃO é gap. |

**Score:** 4/4 success criteria met (CONS-04 = Path B in-scope entregue; o limite ~1,05 página é descope diferido/rastreado para Phase 5).

### Deferred Items

| # | Item | Addressed In | Evidence |
| --- | --- | --- | --- |
| 1 | PDF colapsa para 1 página no limite ~1,05 (CONS-04 Path A / kit release) | Phase 5 | ROADMAP "Carried over from Phase 1 — CONS-04 Path A": remover reserva forçada de 200pt no rodapé + corrigir drift heightOfString, bumpar pin, re-verificar repro-1.05. Decisão de usuário; Phase 3 herda Path B até lá. |

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `lib/compute-pediatric-age.ts` (+spec) | Motor de idade puro testado, banded, corrected | ✓ VERIFIED | 180 linhas substantivas; 395 testes verdes; sem ms-division; constantes nomeadas |
| `lib/format-pediatric-age.ts` (+spec) | Formatter PT-BR por extenso + abreviado | ✓ VERIFIED | Render-only, sem date math; singular/plural; non-ok → "" |
| `lib/compute-elapsed-ms.ts` (+spec) | Elapsed derivado de timestamps | ✓ VERIFIED | Puro, clamp ≥0, prioridade ended/paused/now |
| `hooks/use-consultation-timer.ts` | Tick repaint-only | ✓ VERIFIED | `setInterval` só `forceRepaint`, nunca incrementa |
| `components/dashboard/cases/consultation-timer-widget.tsx` | Widget flutuante arrastável | ✓ VERIFIED | dnd-kit, pausa/retoma/reset, auto-hide, montado em 2 rotas |
| `modules/cases/{pause,resume,reset}-consultation.ts` + actions | Slices escopados + gated | ✓ VERIFIED | `getAuthenticatedUser` + `profile.status === "paid"` + `user_phone`/`profile_id` scope |
| `actions/cases/download-case-report-pdf.ts` | Sanitização + PII removal | ✓ VERIFIED | filter + collapse `\n{3,}`; console.log("datapdf") = 0 |
| `scripts/repro-report-pdf.ts` | Repro 3 page sizes | ✓ VERIFIED | Executou; gerou 1/2/3 páginas conforme esperado |
| Migrations (gestational_age, cases pause) | Substrato DB | ✓ FILE / ? LIVE | Arquivos presentes e corretos; presença ao vivo precisa de confirmação humana (aplicada via MCP) |
| `patient-form-gestational-age-field.tsx` | Campo idade gestacional | ✓ VERIFIED | Wired em personal-section + defaults; persiste schema→module→action |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| patient-detail-hero / case-header / dashboard-home / assistant | compute/format-pediatric-age | import + render | ✓ WIRED | 4 surfaces importam o engine; assistant é thin adapter |
| consultation-timer-widget | use-consultation-timer → compute-elapsed-ms | hook call | ✓ WIRED | elapsedMs renderizado em font-mono |
| widget pause/resume/reset buttons | pause/resume/reset actions | onClick → action → router.refresh | ✓ WIRED | actions gated/scoped, exportadas em ambos barrels |
| download-case-report-pdf | buildReportPdf (kit) | sanitized sections | ✓ WIRED | sections sanitizadas antes de chegar ao kit |
| patient form gestational field | patients.gestational_age_weeks | schema→module→action→DB | ✓ WIRED | create/update persistem; engine consome para corrected age |
| case query | timer columns | select | ✓ WIRED | get-case-by-id seleciona started_at + pause cols + gestational |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| timer widget | elapsedMs | compute-elapsed-ms ← case timestamps (DB) | Sim (props de caso real) | ✓ FLOWING |
| patient hero age | age | computePediatricAge(birth_date, now, gestational) | Sim (DOB real do paciente) | ✓ FLOWING |
| PDF sections | sections | report.sections (DB) sanitizadas | Sim (conteúdo de relatório real) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Suite de testes verde | `yarn test` | 395 pass / 0 fail | ✓ PASS |
| Typecheck verde | `yarn typecheck` | 0 errors | ✓ PASS |
| Repro PDF gera 3 tamanhos | `npx tsx scripts/repro-report-pdf.ts` | gerou 0.9/1.05/2.3 | ✓ PASS |
| repro-0.9 = 1 página (in-scope) | `/Count` no PDF | /Count 1 | ✓ PASS |
| repro-2.3 = múltiplas páginas limpas (in-scope) | `/Count` no PDF | /Count 3 | ✓ PASS |
| repro-1.05 = limite phantom (deferred) | `/Count` no PDF | /Count 2 (esperado — Path A → Phase 5) | ✓ PASS (deferred-by-decision) |
| PII log ausente | grep `console.log("datapdf"` | count = 0 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| CONS-01 | 01-02, 01-04 | Idade por faixa etária a partir da DOB | ✓ SATISFIED | Engine testado + 4 surfaces renderizando |
| CONS-02 | 01-05 | Cronômetro ao vivo durante o atendimento | ✓ SATISFIED | Widget auto-start + tick ao vivo em 2 rotas |
| CONS-03 | 01-01, 01-05 | Início persistido, sobrevive a reload | ✓ SATISFIED | Elapsed de timestamps persistidos + repaint-only |
| CONS-04 | 01-03 | PDF sem página extra / faixa no rodapé | ◑ SATISFIED (Path B) | Sanitização + repro 1/3 págs limpas; boundary Path A → Phase 5 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | Nenhum debt marker (TBD/FIXME/XXX) nos arquivos da fase | — | Nenhum |
| — | — | Nenhum stub / handler vazio / return-empty não-coberto | — | Nenhum |

Scan limpo: nenhum `TBD`/`FIXME`/`XXX` nos arquivos modificados pela fase; nenhum handler vazio, console.log-only ou prop hardcoded vazio que flua para render.

### Human Verification Required

1. **Colunas ao vivo no Supabase** — confirmar que `patients.gestational_age_weeks`, `cases.consultation_paused_ms`, `cases.consultation_paused_at` e o default `now()` em `cases.started_at` existem no banco. As migrações foram aplicadas via Supabase MCP (não `db push` commitado) e o MCP não está disponível neste ambiente de verificação. typecheck + 395 testes verdes são evidência indireta forte.
2. **Inspeção visual dos PDFs** — abrir `tmp/repro-0.9.pdf` (deve ser 1 pág sem faixa sobrando) e `tmp/repro-2.3.pdf` (3 págs limpas). Contagem confirmada; "sem espaçamento excessivo" é julgamento visual.
3. **UX do cronômetro em runtime** — abrir um atendimento, verificar tick ao vivo, drag-and-drop/persistência de posição, pausa/retoma/reset, auto-hide ao encerrar, e tempo correto após reload.
4. **Apresentação da idade por faixa** — verificar exibição correta para recém-nascido / lactente / ≥24m / prematuro (badge corrigido) e o CTA "Completar cadastro" sem DOB.

### Gaps Summary

Nenhum gap bloqueador. Os três critérios de runtime (CONS-01, CONS-02, CONS-03) estão totalmente implementados, testados (395/395 verde, typecheck 0 erros) e ligados de ponta a ponta no código. CONS-04 está atendido na porção in-scope (Path B): sanitização de seções + remoção do log de PII, com 1-página e múltiplas-páginas verificadas limpas pelo repro. O limite ~1,05 página (Path A — release do `@falaped/falaped-kit`) foi **deliberadamente diferido para a Phase 5 por decisão de usuário**, documentado no ROADMAP como "Carried over from Phase 1" — é um descope aceito e rastreado, não uma lacuna.

O status é `human_needed` (não `passed`) porque há itens que só se verificam fora do código estático: a aplicação ao vivo das migrações (MCP, indisponível aqui), a inspeção visual do PDF e a UX em tempo real do cronômetro e da exibição de idade. O motor de idade — a keystone que a lógica de vacina (Phase 5) vai consumir — está estabelecido, puro e testado conforme exigido.

---

_Verified: 2026-06-28T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
