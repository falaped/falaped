# Feature Research

**Domain:** Appointment scheduling + lightweight consultation-earnings tracking for a solo pediatric practice (Brazil)
**Researched:** 2026-07-20
**Confidence:** MEDIUM

> Milestone note: this file was regenerated for milestone **v1.1 "Agenda & Ganhos"**. The prior v1.0 features research (age display, vaccines, clinical documents; dated 2026-06-28) is superseded here; recover it from git history if needed.
>
> Scope note: this is the NEW feature area for v1.1 on top of the existing Falaped clinical app. Existing capabilities (patient records, clinical documents, vaccine calendars, growth curves, AI assistant, PDF, auth + paid gate) are treated as dependencies, not re-researched. Explicit out-of-scope decisions from PROJECT.md are respected: no notifications (WhatsApp/e-mail) this cycle, no online payment/billing, no fully public patient self-service link.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Recurring weekly availability grid (e.g. seg/qua 14h–18h) | Every scheduling tool (Setmore, TIMIFY, SuperSaaS) models a repeating weekly template as the base of the agenda; a doctor sets "when I see patients" once | MEDIUM | Store as recurring rule per weekday + time range; slots derived from rule × slot duration. Store TZ-aware (America/Sao_Paulo). Dep: none |
| Configurable slot/consultation duration | Pediatric consults vary; tools universally let you set slot length and derive the grid from it | LOW | Single per-doctor default (e.g. 20/30/40 min) is enough for v1; per-slot override is a differentiator |
| Day / week / month calendar views | The prompt and every reviewed tool treat these three views as the standard way a doctor reads their agenda | MEDIUM | Week view is the primary work surface; day = today's flow; month = load overview. Reuse a headless calendar rather than hand-rolling. Dep: availability + appointments |
| Book an appointment into a slot (pick patient + slot) | Core action of any agenda; secretary/doctor must attach a patient to a time | MEDIUM | Must reuse existing patient records (search) or create a new child patient inline. Dep: patient records (existing) |
| Appointment status lifecycle | CHR/TELUS, SimplePractice, Healthie all model status transitions; status is how the doctor reads "what happened" | MEDIUM | See lifecycle section. v1.1 explicitly starts every booking as "pedido a confirmar" then confirm |
| Cancel / reschedule an appointment | No-shows, remarcações and cancellations are the daily reality of a consultório; tools treat these as first-class | MEDIUM | Reschedule = move to new slot (keep history); cancel = terminal state that frees the slot |
| Log amount received per consultation | The v1.1 earnings goal; iClinic centers on "registrar recebimentos" via the agenda | LOW | One numeric value (BRL) + optional link to an appointment. Store integer cents to avoid float errors |
| Standalone (avulso) earnings entry | PROJECT.md requires entries not tied to a consultation (e.g. a procedure, a late-paid consult) | LOW | Same ledger table; appointment link nullable |
| Earnings totals by day / week / month + average per consultation | Explicit v1.1 requirement; iClinic ships period financial summaries | MEDIUM | Aggregate over the ledger; "average per consultation" = sum(entries linked to a consult) / count(distinct consults). Decide whether avulso entries are excluded from the average denominator |
| Block exceptions (holidays / folga / time off) | Recurring grid is meaningless without a way to say "not this Wed"; every reviewed tool supports blocking | MEDIUM | Override layer on top of the recurring rule (block a date/range or a specific slot). Dep: availability grid |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable. These align with Falaped's core value ("consulta flui sem fricção") and its existing clinical depth.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Delegated secretary booking via private scoped token link | The v1.1 signature feature: secretary books on the doctor's behalf through a link that exposes ONLY agenda + patient search/create — never prontuário. Rare in solo-doctor tools, which usually give the secretary a full seat | HIGH | First external surface of the app. Needs own token auth (secret, expirable, revocable), NOT the paid session gate. Scope enforced server-side on every action. Dep: availability + appointments + patient records. Highest-risk item |
| Agenda ↔ patient record continuity | Because Falaped already owns the prontuário, an appointment can deep-link to the child's record / growth curve / documents — a booking tool bolted onto an EHR can't | MEDIUM | From the doctor's agenda (not the secretary link), open the patient from the appointment. Dep: patient records (existing) |
| "Pedido a confirmar" gate before firming a slot | Gives the doctor control over what the secretary booked before it's committed; distinguishes from tools that book directly | LOW | Already a v1.1 decision. Implemented as the initial status in the lifecycle |
| Earnings linked directly from a completed consultation | When the doctor marks a consult "realizada," offer to log the value in the same flow — turns two tasks into one; matches iClinic's agenda-driven recebimento | LOW | The completed-appointment action offers an inline "lançar valor recebido" step. Dep: earnings ledger + lifecycle |
| Particular vs convênio tag on earnings entries | Brazilian reality: particular = higher margin, convênio = higher volume/lower repasse. A simple source tag makes the earnings panel far more useful than a single number | LOW | Enum/label on the entry; panel can group totals by source. Low cost, high local relevance |
| No-show visibility in the earnings/agenda panel | No-shows are lost revenue; surfacing count/rate helps the solo doctor see the cost of faltas without any notification infra | LOW | Derived from status data already captured; a read-only stat. Dep: lifecycle |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems — several are explicit PROJECT.md out-of-scope decisions and should stay out.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Fully public self-service booking link (family books itself) | Standard in tools like 4Medic; "let parents book directly" sounds efficient | Exposing/searching the child-patient base on an open link violates LGPD; families creating patient records pollutes clinical data. Explicitly out of scope | Private scoped token for a trusted secretary only; secretary is the human gate |
| WhatsApp / SMS / e-mail confirmation & reminders | The #1 Brazilian agenda feature (cuts no-shows up to 30%); families and doctors expect it | Needs messaging infra, provider integration, opt-in/LGPD consent, delivery handling — large scope. Doctor decided "só vejo no painel" for v1.1 | Panel-only visibility of new/pending appointments now; revisit notifications in a later cycle |
| Online payment / billing / cobrança | "Track earnings" is one step from "collect payment"; feels natural | Payment processing brings PCI, gateway integration, reconciliation, refunds, tax — a whole product. Explicitly out of scope | Record the value received only (a ledger), never process or charge |
| Convênio claim submission / TISS / faturamento | Convênio is half of Brazilian pediatric revenue; full billing tools do TISS | TISS/faturamento is a heavy regulated integration; wildly out of proportion for a solo earnings tracker | A simple particular/convênio tag + manual value entry; leave claims to dedicated billing software |
| Multi-professional / multi-room / resource scheduling | Clinic tools advertise multi-provider grids | Falaped is a solo-doctor product; multi-provider adds calendar-merge, permissions and UI complexity with no user | Single-doctor agenda; model availability against the one owner profile |
| Auto-fill from cancellation waitlist | Advertised as a no-show mitigation | Requires notifications to offer freed slots — out of scope this cycle; adds queue logic | Cancel simply frees the slot for manual re-booking; no automation |
| Full accounting (expenses, P&L, tax reports) | "If it tracks income, track expenses too" | Turns a lightweight earnings panel into bookkeeping software; scope explosion | Keep it to income-received entries + period totals + average; nothing more |
| Rich recurring-rules engine (RRULE, biweekly, nth-weekday) | Power-scheduling tools support complex recurrence | A solo pediatrician's real need is a simple weekly grid + date blocks; RRULE-level complexity is unused and bug surface | Weekly-by-weekday recurring rule + explicit date/slot blocks |

## Feature Dependencies

```
Patient records (EXISTING)
    └──required by──> Book appointment (search/create child patient)
                          └──required by──> Appointment status lifecycle
                                                └──required by──> Earnings linked to consultation

Recurring weekly availability grid
    ├──required by──> Day/Week/Month calendar views
    ├──required by──> Book appointment (valid slots)
    └──required by──> Block exceptions (override layer)

Book appointment + Availability + Patient records
    └──required by──> Delegated secretary token link (scoped subset of all three)

Earnings ledger (per-consultation + avulso entries)
    └──required by──> Period totals + average per consultation
                          └──enhanced by──> particular/convênio tag (group totals)

Appointment status lifecycle ──enhances──> No-show visibility in panel
Public self-service link ──conflicts──> LGPD / scoped-token model (do not build)
Notifications ──conflicts──> panel-only decision (out of scope this cycle)
```

### Dependency Notes

- **Book appointment requires Patient records:** the secretary/doctor attaches an existing child patient or creates one — reuses the existing patients domain; do not fork a parallel patient model.
- **Calendar views + booking + blocks require the availability grid:** the recurring rule is the source of truth for which slots exist; build it first.
- **Delegated token link requires availability + booking + patient search:** it is a *scoped, externally-authenticated view* over already-built capabilities, so it must come after them. Its own token auth is independent of the paid session gate (per Key Decisions) — this is the highest-risk, build-last item.
- **Earnings-linked-to-consultation requires the lifecycle:** you can only offer "log value" when a consult reaches a completed state; the ledger itself can exist independently (avulso entries) and can ship earlier.
- **particular/convênio tag enhances the earnings panel:** cheap add that makes totals meaningful in the Brazilian context; not a hard dependency.
- **Notifications and public self-service conflict with explicit decisions:** they must NOT enter this milestone.

## Appointment Status Lifecycle (reference)

Synthesized from CHR/TELUS, SimplePractice and Healthie + the v1.1 decisions. Terminal/branch states shown; billing/superbill semantics from the reviewed tools are NOT adopted (no billing this cycle).

```
pedido a confirmar ──confirm──> confirmado ──> realizada (completa)
        │                           │      └──> falta (no-show)   [distinct from cancelada]
        │                           └────────> cancelada          [frees slot]
        └──(reject)──> cancelada
   confirmado / realizada ──remarcar──> new slot as confirmado (keep history)
```

- **pedido a confirmar** — every booking starts here (v1.1 decision); the doctor/secretary must confirm before the slot is firm.
- **confirmado** — slot committed.
- **realizada** — consult happened; the point at which "log value received" is offered (differentiator).
- **falta (no-show)** — kept as a state distinct from cancelada so no-show count/rate is derivable for the panel.
- **cancelada** — terminal; frees the slot for manual re-booking (no auto-waitlist).
- **remarcar** — moves to a new slot, preserving the prior appointment's history rather than deleting.

## MVP Definition

### Launch With (v1.1)

Minimum viable product — validates "the doctor has his own agenda + sees what he earns."

- [ ] Recurring weekly availability grid + slot duration — the skeleton everything hangs on
- [ ] Block exceptions (holiday/folga) — grid is unusable without it
- [ ] Day / week / month calendar views — how the doctor reads the agenda
- [ ] Book appointment: search existing / create new child patient into a slot — core action; reuses patient records
- [ ] Status lifecycle: "pedido a confirmar" → confirmar, plus realizada / falta / cancelar / remarcar
- [ ] Delegated secretary scoped token link (agenda + patient search/create + book only) — the v1.1 signature capability; own token auth, revocable
- [ ] Earnings ledger: log value per consultation + avulso entries
- [ ] Earnings panel: totals by day/week/month + average per consultation

### Add After Validation (v1.x)

Features to add once the core agenda + earnings loop is working and used.

- [ ] particular/convênio tag on earnings + grouped totals — trigger: doctor asks to separate particular from convênio
- [ ] Inline "log value" step on marking a consult realizada — trigger: friction observed in the two-step flow
- [ ] No-show rate/count stat in the panel — trigger: doctor wants to see cost of faltas
- [ ] Deep-link from an appointment to the child's prontuário/growth curve — trigger: doctor wants continuity into the record

### Future Consideration (v2+)

Features to defer.

- [ ] Notifications / WhatsApp confirmation & reminders — deferred by explicit decision; revisit as its own cycle (LGPD consent + messaging infra)
- [ ] Attach exam photo / AI exam extraction — already deferred to v2 in PROJECT.md
- [ ] Per-slot duration overrides / richer recurrence rules — only if real demand appears
- [ ] Expense tracking / fuller financial reports — only if the earnings panel proves valuable and doctors ask for the other side of the ledger

### Explicitly NOT Building (per PROJECT.md)

- Public self-service booking (LGPD) · Online payment/billing · TISS/convênio claim submission · Multi-provider scheduling · Notifications this cycle.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Recurring weekly availability grid + slot duration | HIGH | MEDIUM | P1 |
| Block exceptions (holiday/folga) | HIGH | MEDIUM | P1 |
| Day/Week/Month calendar views | HIGH | MEDIUM | P1 |
| Book appointment (search/create patient into slot) | HIGH | MEDIUM | P1 |
| Status lifecycle (pedido→confirmar→realizada/falta/cancelar/remarcar) | HIGH | MEDIUM | P1 |
| Earnings ledger (per-consult + avulso) | HIGH | LOW | P1 |
| Earnings panel (totals + average) | HIGH | MEDIUM | P1 |
| Delegated secretary scoped token link | HIGH | HIGH | P1 (build last) |
| particular/convênio tag on earnings | MEDIUM | LOW | P2 |
| Inline "log value" on realizada | MEDIUM | LOW | P2 |
| No-show visibility stat | MEDIUM | LOW | P2 |
| Deep-link appointment → prontuário | MEDIUM | MEDIUM | P2 |
| Notifications / WhatsApp confirmation | HIGH | HIGH | P3 (out of scope this cycle) |
| Online payment / TISS | LOW (for this product) | HIGH | P3 (out of scope) |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Should have, add when possible
- P3: Nice to have / deferred / out of scope

## Competitor Feature Analysis

| Feature | Brazilian tools (iClinic, 4Medic, Conclínica, GestãoDS, Syntia) | Global tools (Setmore, TIMIFY, SimplePractice, Healthie) | Our Approach (Falaped v1.1) |
|---------|--------------------|--------------------|-------------|
| Recurring availability + slot duration | Standard weekly agenda per professional | Recurring patterns + slot length + break block-out | Simple weekly grid + slot duration + date blocks (no RRULE) |
| Calendar views | Day/week/month per professional | Day/week/month, color-coded | Day/week/month for the single doctor |
| Secretary booking | Secretary gets a full seat/login in the system | Role-based access; front desk sees schedule not clinical notes | Scoped **token link** — no seat, no prontuário; revocable, own auth |
| Public self-booking link | 4Medic/Conclínica offer public patient links | Common | Deliberately NOT — private scoped link only (LGPD) |
| Status lifecycle | Confirmação de consulta central | Scheduled/Confirmed/Completed/No-show/Cancelled/Rescheduled | Pedido a confirmar → confirmado → realizada/falta/cancelada/remarcada |
| Confirmation notifications | WhatsApp/SMS confirmation is the headline feature (cuts no-shows ~30%) | Reminders/confirmations built-in | Out of scope this cycle — panel-only visibility |
| Earnings tracking | iClinic: recebimentos via agenda, per-convênio/procedure values, financial graphs | Status-driven billing/superbills | Lightweight ledger: value per consult + avulso; totals by period + average; optional particular/convênio tag |
| Payment processing | Some integrate billing | Billing/superbills/claims | NOT built — record value only |

## Sources

- [Setmore — Medical appointment scheduling](https://www.setmore.com/industries/medical-appointment-scheduling-software) (recurring appointments, slot config) — MEDIUM
- [TIMIFY — Medical scheduling software](https://www.timify.com/en/solutions/medical-scheduling-software/) (recurring patterns, copy series) — MEDIUM
- [SuperSaaS — Medical professionals scheduling](https://www.supersaas.com/info/medical-professionals-appointment-scheduling) (solo to multi-specialty) — MEDIUM
- [TELUS CHR — Tracking appointment status](https://help.inputhealth.com/en/articles/1454589-tracking-the-status-of-an-appointment) (status lifecycle) — MEDIUM
- [SimplePractice — Managing appointment statuses and billing](https://support.simplepractice.com/hc/en-us/articles/360018410872-Managing-appointment-statuses-and-billing) (completed/no-show/cancelled) — MEDIUM
- [Healthie — Appointment statuses and automations](https://help.gethealthie.com/article/1102-appointment-statuses) (rescheduled, status automations) — MEDIUM
- [Accountable — HIPAA-compliant scheduling software](https://www.accountablehq.com/post/hipaa-compliant-scheduling-software-for-medical-practices-streamline-patient-bookings-and-protect-phi) (scoped tokens, expiring URLs, role permissions) — MEDIUM
- [iClinic — Gestão Financeira](https://iclinic.com.br/funcionalidades/gestao-financeira/) and [Controle de receitas](https://blog.iclinic.com.br/controle-de-receitas-despesas-no-iclinic/) (recebimentos via agenda, per-convênio values, financial graphs) — MEDIUM
- [Conclínica](https://conclinica.com.br/agenda-medica/), [4Medic](https://4medic.com.br/agenda-medica/), [GestãoDS](https://www.gestaods.com.br/funcionalidades/agenda-medica/), [Syntia (pediatras)](https://syntiamed.com/para-pediatras) (BR secretary agenda + WhatsApp confirmation + booking links) — MEDIUM

---
*Feature research for: appointment scheduling + earnings tracking, solo pediatric practice (Brazil)*
*Researched: 2026-07-20*
