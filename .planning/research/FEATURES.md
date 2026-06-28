# Feature Research

**Domain:** Pediatric practice web app (Brazil) — age display, vaccination scheduling/tracking, clinical documents (referral, exam request, medical report), prescription/orientation templates, consultation timer
**Researched:** 2026-06-28
**Confidence:** HIGH for vaccine calendars (official PNI/MS + SBIm 2025/2026 PDFs); HIGH for age-display and document conventions; MEDIUM for "what competing BR EMRs do" (no direct product teardown — based on domain norms)

---

## Scope note

This is a **subsequent (brownfield) milestone**. The app already ships patient management, prescriptions+templates, medical certificates (atestados), case reports/laudos, AI assistant + audio transcription, and PDF generation following the `app/ → actions/ → modules/` three-layer pattern with `@falaped/falaped-kit/pdf`. The table-stakes/differentiator analysis below is scoped to the **NEW features in this cycle**, not the whole product.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Missing these makes the new features feel half-built to a Brazilian pediatrician.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Age in months + days (and days-only for newborns)** | Pediatricians dose drugs and schedule vaccines by precise age; "2 anos" is too coarse for a lactente | LOW | Pure derived display from DOB. Convention below. No storage needed. |
| **Vaccine reference table by age (SUS/PNI + private/SBIm)** | Doctor must answer "what's due at this age?" during the consult | LOW–MEDIUM | Static reference data (seeded). Data accuracy is the work, not the code. |
| **Pregnant-woman vaccine reference (gestante)** | Pediatrician/family-med counsels mothers; small fixed list | LOW | 5 vaccines, fixed timing rules (below). |
| **Per-patient carteira de vacinação: record applied doses** | A vaccination card that can't record what was given is not a card | MEDIUM | New table scoped by `profile_id` + `patient_id`; dose = vaccine + dose number + date + (lot/site optional). |
| **Pending / overdue computation by age** | The whole point of a digital carteira vs paper is "what's late?" | MEDIUM–HIGH | Requires age engine + calendar-as-data + diff against applied doses. The real logic. |
| **Encaminhamento (referral) document** | Standard daily document; referring to specialist is routine in peds | LOW–MEDIUM | Reuses receita pattern: form + savable template + PDF. Fields below. |
| **Pedido / solicitação de exames (exam request)** | Routine; ordering labs/imaging is constant | LOW–MEDIUM | Same pattern. Often a multi-item list (CBC, urine, etc.). |
| **Relatório médico (medical report)** | Confirmed by doctor as a distinct doc type from the existing laudo/case report | LOW–MEDIUM | Free-body rich-text doc (TipTap) + header/footer + PDF. |
| **Receituário em branco (blank prescription body)** | Doctor keeps ready-made prescriptions and wants to paste them | LOW | Empty TipTap body on the existing prescription PDF chrome. Cheapest feature in the cycle. |
| **Orientações template library** | "Orientação 1ª consulta / 1 mês / 2 meses" are reused verbatim every day | LOW | A second template category alongside prescription-templates. Mostly data + a picker. |
| **Correct print spacing for reports** | Existing real pain — extra blank page wastes paper/time mid-consult | MEDIUM | Lives in `@falaped/falaped-kit/pdf` (pdfkit). Measure-then-flow, avoid fixed line heights causing overflow. |
| **Consultation timer (start/elapsed)** | Doctors track consult duration; expected to start at attendance begin | LOW | Start timestamp + live elapsed; persist start/end on the consultation record. |

### Differentiators (Competitive Advantage)

Where Falaped can beat paper and generic EMRs.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Next-due vaccine logic surfaced in-consult** | "Próxima: VIP reforço aos 15 meses (em 12 dias)" turns the card into a decision aid, not an archive | MEDIUM–HIGH | Builds on overdue engine; show next 1–2 due items by current age. |
| **SUS vs particular side-by-side per age** | Pediatrician advises families on what's free at UBS vs paid privately — a real counseling moment | MEDIUM | Both calendars modeled; UI toggles or shows both columns (SBIm PDF itself does this). |
| **Auto-fill documents from patient context** | Encaminhamento/exam request/report pre-filled with name, DOB, age-in-months, weight/IMC | MEDIUM | Reuses existing patient data; reduces typing during consult — aligns with Core Value ("sem fricção"). |
| **Print-perfect, single-page documents** | Reliable, tight PDFs are a genuine differentiator vs the current pain and vs sloppy competitors | MEDIUM | The print-spacing fix, generalized to all new doc types. |
| **Consultation-time analytics (later)** | Aggregate average consult time, per-patient history | LOW–MEDIUM | Only valuable once timer data accumulates; defer. |
| **AI-assisted document drafting** | Groq already integrated; could draft relatório/encaminhamento from transcription | MEDIUM–HIGH | Out of cycle per PROJECT.md intent (extraction deferred to v2); flag, don't build now. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Exam extraction from photo via AI** | "Just scan the lab result" | Highest-complexity item; explicitly deferred to v2 in PROJECT.md ("se não for querer muito") | Allow attaching exam photo to patient now (no extraction); revisit OCR/AI later. |
| **Editable/forkable vaccine calendar per doctor** | "Let me tweak the schedule" | PNI/SBIm change ~yearly; per-user edits drift from official guidance and create liability | Keep calendar centrally maintained as seeded reference data; version it; let doctor override only at the *applied-dose* level, not the calendar. |
| **Auto-marking vaccines as "applied" by age** | "It's probably done by now" | Inferring administration is dangerous medically — a missed dose hidden as "done" | Only mark applied on explicit user entry; everything else is "pending/overdue" until recorded. |
| **Full immunization registry integration (RNDS/ConecteSUS sync)** | "Pull the official card automatically" | Heavy integration, auth, gov API instability; out of proportion for this cycle | Manual entry now; treat external sync as a separate future milestone. |
| **Rewriting existing docs (receita/atestado/laudo)** | "While we're here, redo them" | Explicitly out of scope — only extend, not refactor | Reuse their pattern for new docs; leave existing flows untouched. |
| **Rich vaccine inventory/lot management** | "Track stock and lots" | This is a clinic-management concern, not a pediatric-consult concern; scope creep | Optional free-text lot field on a dose; no inventory module. |
| **Reminders/notifications for overdue vaccines (SMS/WhatsApp push)** | "Nudge the parents" | Messaging infra, consent, LGPD on minors' data — large surface | Show overdue in-app during consult; defer outbound messaging. |

---

## Pediatric Age Display — Convention (table-stakes detail)

Brazilian pediatric convention for showing a child's age (verify against doctor preference, but this is the standard):

| Child age range | Display unit | Example |
|-----------------|--------------|---------|
| 0–28 days (recém-nascido / neonato) | **days** | "12 dias de vida" |
| ~1–24 months (lactente) | **months + days** (and weeks early on) | "3 meses e 12 dias" |
| ≥ 24 months | **years (+ months)** | "2 anos e 4 meses" → later "5 anos" |

Implementation notes:
- Derive everything from DOB; no stored age. Recompute on render.
- Show **days** prominently for newborns (dosing/jaundice/weight checks are day-sensitive).
- Show **months + days** through ~2 years (vaccine scheduling and growth are month-sensitive).
- Above 2 years, **years (+ months)** is enough.
- For **prematuros**, idade corrigida is used until ~24 months corrected age — out of this cycle's stated scope, but note the field if DOB+gestational age is ever stored.
- Complexity: LOW. The only subtlety is consistent month/day math (use a date lib; beware month-length edge cases).

---

## Vaccine Calendars (concrete data — for direct use)

> Sources: **PNI / Ministério da Saúde, Calendário Nacional de Vacinação 2025** (gov.br/saude) and **SBIm Calendário de Vacinação Criança 2025/2026** and **SBIm Gestante**. Confidence HIGH. Calendars are revised roughly yearly — store with a version/year so they can be updated.

### A. SUS / PNI — Childhood Calendar (free at UBS, 2025)

| Age | Vaccine(s) and dose |
|-----|---------------------|
| **Ao nascer** | BCG (dose única); Hepatite B (1ª dose, primeiras 12–24 h) |
| **2 meses** | Penta (DTP+Hib+HepB) 1ª; VIP (poliomielite inativada) 1ª; Pneumocócica 10-valente 1ª; Rotavírus 1ª |
| **3 meses** | Meningocócica C 1ª |
| **4 meses** | Penta 2ª; VIP 2ª; Pneumocócica 10 2ª; Rotavírus 2ª |
| **5 meses** | Meningocócica C 2ª |
| **6 meses** | Penta 3ª; VIP 3ª; Influenza (anual, 6m–5a) 1ª; COVID-19 1ª |
| **7 meses** | COVID-19 2ª |
| **9 meses** | Febre amarela 1ª; (COVID-19 3ª conforme esquema) |
| **12 meses** | Pneumocócica 10 (reforço); Meningocócica C (reforço); Tríplice viral / SCR (sarampo, caxumba, rubéola) 1ª |
| **15 meses** | DTP (1º reforço); VIP (1º reforço — substituiu a VOP em 2025); Tetra/SCRV — varicela 1ª + 2ª dose tríplice viral; Hepatite A (dose única) |
| **4 anos** | DTP (2º reforço); Febre amarela (reforço/2ª dose); Varicela 2ª |
| **9–14 anos** | HPV4 (dose única, meninas e meninos) |
| **Gripe** | Influenza anual para 6 meses–5 anos (incorporada de forma definitiva em 2025) |

**2025 changes to flag in data:** (1) VOP (oral pólio) replaced by VIP injetável reforço at 15 months — schedule is now fully inactivated; (2) Rotavirus age window widened (1ª até 11m29d, 2ª até 23m29d); (3) Influenza now routine 6m–5a; (4) COVID-19 routine 6m–<5a.

### B. Private / SBIm — Childhood Calendar (2025/2026), where it differs from SUS

SBIm recommends everything in the PNI calendar **plus/upgraded** the following (these are the selling points of a private clinic):

| Vaccine | SBIm private recommendation | vs SUS |
|---------|----------------------------|--------|
| **Tríplice bacteriana** | DTPa (acelular) — less reactogenic | SUS uses DTPw (whole-cell) in Penta |
| **Poliomielite** | DTPa-VIP / hexa acelular combos | SUS: VIP standalone |
| **Pneumocócica conjugada** | **VPC15 or VPC20** (broader coverage); VPC13 fallback; intercambiáveis | SUS: VPC10 at UBS (VPC13 only at CRIE for specific indications) |
| **Meningocócica ACWY** | Preferred over MenC for broader serogroup coverage; doses ~3m, 5m, reforço 12m, reforço adolescent | SUS: MenC for <5y; MenACWY only 11–14y |
| **Meningocócica B** | Recommended (1ª, 2ª, reforço in infancy) | **Not in SUS** |
| **Rotavírus** | Pentavalente (3 doses: 2/4/6m) available privately | SUS: monovalente (2 doses) |
| **Hepatite A** | 2 doses (1ª ~12m, 2ª ~18m), isolated or combined | SUS: single dose at 15 months |
| **Influenza** | 3V and 4V (quadrivalent) available privately; <9y primovaccination = 2 doses 1 month apart, then annual single | SUS: 3V, 6m–5a + risk groups |
| **Dengue** | Qdenga (2 doses, regardless of prior infection) / Dengvaxia (seropositive only) | **Not routine in SUS** for this age |
| **VSR — Nirsevimabe (anticorpo monoclonal)** | Recommended for <8 months single dose anytime from birth; 8–23 months for higher-risk | SUS rollout limited; primarily via maternal vaccination |
| **HPV** | HPV9 (nonavalent) | SUS: HPV4, single dose 9–14y |
| **Varicela** | 2 doses (15m and 4–6y) | SUS: included via tetra/SCRV + 2ª at 4y |

> Note on SBIm child schedule shape: SBIm columns run "do nascimento aos 2 anos" then "2 a <10 anos", with marks at: ao nascer, 1, 2, 3, 4, 5, 6, 7, 9, 12, 15, 18, 24 meses, and 4/5/6/9 anos. Model the calendar as `{vaccine, doseLabel, recommendedAgeMonths, source: SUS|SBIm, availability}` so both columns derive from one dataset.

### C. Pregnant Women (Gestante) — combined PNI + SBIm

| Vaccine | Timing | Doses | Availability |
|---------|--------|-------|--------------|
| **Hepatite B** | Any time if unvaccinated/incomplete | 3 doses (0, 1, 6 months) | SUS + private |
| **dTpa** (tríplice bacteriana acelular adulto) | **From 20th week**, every pregnancy | 1 dose per pregnancy | SUS + private |
| **Influenza** (gripe) | Any trimester | 1 dose per season (annual) | SUS + private |
| **COVID-19** | Any gestational age | 1 dose per pregnancy (mRNA preferred) | SUS + private |
| **VSR / RSV — Abrysvo** | **From 28th week** (licensed from 24w) | 1 dose | SUS (from 28w) + private — protects newborn via maternal antibody |

> dT (dupla adulto) may substitute where dTpa unavailable, but dTpa from 20w is the recommendation. Febre amarela only in exceptional risk situations.

---

## Clinical Documents — Field Differences (table-stakes detail)

All three reuse the existing receita pattern (form/wizard + savable template + PDF), and all share a common header (médico: nome, CRM, especialidade; paciente: nome, DOB, idade) and footer (data, local, assinatura). They differ in body:

| Document | Distinct body fields | Differs from prescription how |
|----------|----------------------|-------------------------------|
| **Encaminhamento (referral)** | Especialidade/serviço de destino; motivo do encaminhamento; resumo clínico / hipótese diagnóstica (CID opcional); grau de urgência; achados relevantes | Not a drug list — it's a hand-off narrative to another professional/service |
| **Pedido / solicitação de exames** | **List of requested exams** (lab/imaging items); hipótese diagnóstica / indicação clínica (often required by labs/convênios, CID); observações/preparo | A structured multi-item request, not posology; benefits from a searchable exam catalog + reusable panels (e.g. "rotina lactente") |
| **Relatório médico (medical report)** | Free narrative body (TipTap): história, evolução, conduta, conclusão; purpose/recipient | Distinct from the existing laudo/case report (confirmed new type); open prose vs structured drug instructions |
| **Receita em branco** | Empty body | Same chrome, no structured posology — paste-ready |
| **Orientações** | Reusable guidance text blocks keyed by milestone (1ª consulta, 1 mês, 2 meses…) | Not a prescription; a second template category, often printed with/after the receita |

---

## Feature Dependencies

```
[Age engine: DOB → days / months+days / years]
    └──required by──> [Age display in patient header]
    └──required by──> [Vaccine pending/overdue computation]
                            └──requires──> [Vaccine calendar-as-data (SUS + SBIm)]
                            └──requires──> [Per-patient applied-doses store]
                                  └──enables──> [Next-due logic surfaced in-consult]

[Existing prescription pattern: form + template + PDF]
    └──reused by──> [Encaminhamento]
    └──reused by──> [Pedido de exames]
    └──reused by──> [Relatório médico]
    └──reused by──> [Receita em branco]
    └──reused by──> [Orientações library]

[PDF print-spacing fix in @falaped/falaped-kit/pdf]
    └──enhances──> [all document types] (and fixes existing report pain)

[Consultation timer]  ──independent──  (standalone; only later feeds analytics)
```

### Dependency Notes
- **Age engine is the keystone:** both age display and the entire vaccine overdue/next-due logic depend on it. Build/verify it first.
- **Calendar-as-data before carteira logic:** the per-patient card's "pending/overdue" can't exist without the SUS+SBIm calendars modeled as queryable data (not just a printed table). Seed the calendar before building the diff engine.
- **Applied-doses store is independent of the calendar** but useless for overdue computation without it — they meet at the diff.
- **Document types are parallel and independent** of each other; each is a thin slice over the existing pattern. They can ship in any order / together.
- **Print-spacing fix should land early** since it both fixes existing pain and is reused by every new document.
- **Timer conflicts with nothing**; lowest-coupling item, good early win.

---

## MVP Definition

### Launch With (v1 of this cycle)

Ordered by dependency + pain:

- [ ] **PDF print-spacing fix** — existing daily pain; unblocks clean output for new docs
- [ ] **Age engine + age display (days / months+days / years)** — keystone; cheap; immediately visible value
- [ ] **Consultation timer** — low coupling, high daily-use, quick win
- [ ] **Vaccine reference tables (SUS + SBIm + gestante) as seeded data + read-only UI** — answers "what's due?" without per-patient state
- [ ] **Receita em branco + Orientações library** — cheapest features, high daily reuse
- [ ] **Encaminhamento, Pedido de exames, Relatório médico** — three thin slices over the existing pattern (auto-filled from patient)

### Add After Validation (v1.x)

- [ ] **Per-patient carteira: record applied doses** — once reference tables prove the calendar data is right
- [ ] **Pending / overdue + next-due logic** — the higher-value, higher-complexity payoff of the carteira
- [ ] **Exam panels / catalog** for pedido de exames (reusable "rotina" bundles)
- [ ] **SUS-vs-particular side-by-side** counseling view

### Future Consideration (v2+)

- [ ] **Exam photo attachment** (no extraction) → then **AI exam extraction** (explicitly deferred)
- [ ] **AI-assisted document drafting** from transcription (Groq already present)
- [ ] **Consultation-time analytics**
- [ ] **Outbound vaccine reminders** (LGPD/consent heavy)
- [ ] **RNDS/ConecteSUS immunization sync**

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| PDF print-spacing fix | HIGH | MEDIUM | P1 |
| Age engine + display | HIGH | LOW | P1 |
| Consultation timer | MEDIUM | LOW | P1 |
| Vaccine reference tables (SUS/SBIm/gestante) | HIGH | LOW–MEDIUM (data accuracy) | P1 |
| Receita em branco | MEDIUM | LOW | P1 |
| Orientações library | HIGH | LOW | P1 |
| Encaminhamento | HIGH | LOW–MEDIUM | P1 |
| Pedido de exames | HIGH | MEDIUM | P1 |
| Relatório médico | MEDIUM–HIGH | LOW–MEDIUM | P1 |
| Carteira: record applied doses | HIGH | MEDIUM | P2 |
| Pending/overdue + next-due logic | HIGH | MEDIUM–HIGH | P2 |
| SUS vs particular side-by-side | MEDIUM | MEDIUM | P2 |
| Exam panels/catalog | MEDIUM | MEDIUM | P2 |
| Exam photo attach (no extraction) | MEDIUM | LOW–MEDIUM | P3 |
| AI exam extraction | MEDIUM | HIGH | P3 |
| AI document drafting | MEDIUM | MEDIUM–HIGH | P3 |
| Vaccine reminders / RNDS sync | MEDIUM | HIGH | P3 |

---

## Competitor / Norm Analysis

No direct teardown of competing BR pediatric EMRs was performed; the following reflects domain norms (MEDIUM confidence) and the official references (HIGH confidence).

| Feature | Norm in BR clinical software | Our Approach |
|---------|------------------------------|--------------|
| Age display | EMRs show months+days for lactentes; many generic systems wrongly show only years | Days / months+days / years by range (peds-correct) |
| Vaccine card | Paper carteira dominant; ConecteSUS/RNDS exist but adoption uneven | In-app carteira with overdue logic; manual entry, no gov sync this cycle |
| Calendar reference | SBIm publishes the canonical private+SUS tables yearly (PDF) | Model SBIm+PNI as versioned seed data, render both |
| Referral / exam request | Standard documents in every EMR | Reuse existing receita pattern, auto-fill from patient |
| Consult timer | Less common; differentiator for flow-focused tools | Build it — aligns with Core Value (frictionless consult) |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| SUS/PNI childhood calendar | HIGH | Official MS gov.br calendar + 2025 Instrução Normativa |
| SBIm private childhood calendar | HIGH | SBIm 2025/2026 Criança PDF read directly (full text) |
| Gestante calendar | HIGH | MS gov.br + SBIm Gestante |
| Age display convention | HIGH | Standard peds practice (neonato/lactente/criança thresholds) |
| Document field differences | HIGH | Standard BR clinical document content |
| Competitor specifics | MEDIUM | Domain norms, not a product teardown |

## Gaps / To Confirm With Doctor

- Exact age-unit switch points the doctor prefers (28 days vs 1 month for neonate→lactente; 24 months vs 36 for years).
- Whether the carteira should default to SUS or SBIm schedule per patient (or show both).
- Whether `Pedido de exames` needs a curated exam catalog now or free-text first.
- Whether lot/site fields on applied doses are wanted in v1 or deferred.

## Sources

- Calendário Nacional de Vacinação — Ministério da Saúde (gov.br/saude): https://www.gov.br/saude/pt-br/vacinacao/calendario
- Instrução Normativa do Calendário Nacional de Vacinação 2025 (MS): https://www.gov.br/saude/pt-br/vacinacao/publicacoes/instrucao-normativa-que-instrui-o-calendario-nacional-de-vacinacao-2025.pdf
- SBIm — Calendário de Vacinação Criança 2025/2026 (PDF, full text read): https://sbim.org.br/images/crianca-Calend-SBIm-2025-250508a-web.pdf_2025-05-09.pdf
- SBIm — Calendários de vacinação (índice): https://sbim.org.br/calendario-de-vacinacao
- SBIm Família — Criança: https://familia.sbim.org.br/seu-calendario/crianca
- SBIm Família — Gestante: https://familia.sbim.org.br/seu-calendario/gestante
- SBP — Calendário de Vacinação Atualização 2025-2026: https://www.sbp.com.br/fileadmin/user_upload/sbp/2025/outubro/21/25063d-DC_Calendario_Vacinacao_-_Atualizacao_2025-26.pdf
- SI-PNI / DATASUS — Calendário Básico de Vacinação da Criança: http://pni.datasus.gov.br/calendario_vacina_Infantil.asp

---
*Feature research for: Brazilian pediatric practice web app — vaccination, age display, clinical documents*
*Researched: 2026-06-28*
