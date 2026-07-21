# Falaped

## What This Is

Falaped é um app web para o dia a dia do pediatra: cadastro de pacientes (crianças), geração de documentos clínicos (receitas, atestados, laudos/relatórios de caso), templates reutilizáveis, condução de consultas e um assistente de IA (Groq) para apoio clínico e transcrição. Neste ciclo (v1.1) o foco é dar ao pediatra uma agenda de consultas própria — disponibilidade recorrente, agendamento delegado a uma assistente por convite (ela entra com login próprio, escopo restrito à agenda), e acompanhamento de quanto ele ganha por consulta.

## Core Value

A consulta pediátrica precisa fluir sem fricção — o médico abre o paciente, conduz a consulta e gera os documentos certos (impressos corretamente) em poucos cliques.

## Current Milestone: v1.1 Agenda & Ganhos

**Goal:** Dar ao pediatra uma agenda de consultas própria — com disponibilidade recorrente, agendamento delegado a uma assistente via link privado (token), e um acompanhamento de quanto ele está ganhando por consulta.

**Target features:**
- Disponibilidade recorrente (grade semanal) com visualização em dia / semana / mês.
- Assento da assistente por convite: ela cria conta e loga; o convite dá acesso só à agenda + busca/criação de paciente do médico — nunca prontuário ou resto do app; o médico revoga quando quiser.
- Agendamentos entram como "pedido a confirmar"; o médico/assistente confirma antes de firmar o horário.
- Painel de ganhos: lançamentos financeiros (ligados a uma consulta ou avulsos) com totais por dia/semana/mês + valor médio por consulta.

## Requirements

### Validated

<!-- Inferido do código existente (brownfield) — já em produção e em uso. -->

- ✓ Cadastro e gestão de pacientes (crianças), com dados clínicos (ex: IMC) — existing
- ✓ Geração de receitas com sistema de templates reutilizáveis — existing
- ✓ Geração de atestados médicos (wizard) — existing
- ✓ Laudos / relatórios de caso e report-templates — existing
- ✓ Assistente de IA (Groq) e transcrição de áudio de consulta (Whisper) — existing
- ✓ Geração de PDF dos documentos (via `@falaped/falaped-kit/pdf`) — existing
- ✓ Autenticação + gate de assinatura (`profile.status === "paid"`) — existing

<!-- Entregue no ciclo v1.0. -->

- ✓ Idade pediátrica precisa (dias/meses/anos) + cronômetro de consulta — v1.0 Phase 1
- ✓ Correção de impressão de PDF (espaçamento/página extra, Path B in-repo) — v1.0 Phase 1
- ✓ Foto privada da criança (bucket privado + URL assinada + consentimento LGPD) — v1.0 Phase 2
- ✓ Curva de crescimento (medições antropométricas + curvas de referência OMS) — v1.0 Phase 3
- ✓ Novos documentos clínicos (encaminhamento, pedido de exames, relatório médico, receituário em branco, biblioteca de orientações) — v1.0 Phase 4
- ✓ Calendário de vacinas — referência SUS/PNI + particular/SBIm + gestante (somente leitura) — v1.0 Phase 5

### Active

<!-- Escopo do ciclo v1.1 (Agenda & Ganhos). Hipóteses até serem entregues e validadas. -->

**Bloco 1 — Disponibilidade & Agenda**
- [ ] Definir disponibilidade recorrente (grade semanal, ex: seg/qua 14h–18h) que se repete
- [ ] Visualizar a agenda em dia / semana / mês

**Bloco 2 — Acesso delegado (assento da assistente)**
- [ ] O médico convida a assistente; ela cria conta e loga, com acesso escopado só à agenda + busca/criação de paciente do médico (nunca prontuário ou resto do app); o médico revoga quando quiser
- [ ] A assistente busca um paciente cadastrado ou cria um cadastro mínimo ao agendar
- [ ] Agendamentos entram como "pedido a confirmar"; o médico confirma antes de firmar o horário

**Bloco 3 — Acompanhamento de ganhos**
- [ ] Registrar lançamentos financeiros por consulta (ligados a um agendamento ou avulsos)
- [ ] Painel de ganhos com totais por dia/semana/mês + valor médio por consulta

### Deferred (carry-over do ciclo v1.0)

<!-- Reconhecidos e adiados; intocados neste milestone. -->

- [ ] Exclusão de foto + verificação de segurança (`02-03`, PHOTO-03)
- [ ] Curva de crescimento do prematuro Intergrowth-21st (`03-04`)
- [ ] Carteira de vacinação por paciente (registrar aplicadas, ver pendentes/atrasadas por idade)

### Out of Scope

<!-- Limites explícitos com justificativa. -->

- Extração/transcrição de exames a partir de foto via IA — adiado para v2; é o item mais complexo e o médico sinalizou como "se não for querer muito". Anexar foto de exame ao paciente pode entrar antes, mas a extração automática fica fora deste ciclo.
- Reescrever os documentos já existentes (receitas, atestados, laudos) — só estender, não refazer.
- Notificações (WhatsApp/e-mail) de novo agendamento — v1.1 fica só com o painel; o aviso ativo fica para depois (decisão do médico: "só vejo no painel").
- Pagamento/cobrança online — o app apenas registra o valor recebido, não processa nem cobra pagamentos.
- Auto-agendamento pela própria família (link 100% público, self-service) — o acesso é da assistente (pessoa confiável, com conta própria e escopo controlado); expor a base de pacientes num link aberto violaria a LGPD.
- Modelo de organização completo com papéis (refatorar `profile_id` → `org_id` em todo o app) — path C adiado; o v1.1 usa assento leve escopado à agenda, sem tocar a posse das demais tabelas. Pode virar um milestone próprio depois.

## Context

- **Brownfield maduro:** o app já está em produção e em uso clínico real. Intel do código preservada em `.planning/codebase/`.
- **Padrão de documentos já estabelecido:** receitas, atestados e laudos seguem o fluxo `app/ → actions/ → modules/` com geração de PDF via `@falaped/falaped-kit/pdf`. Os novos documentos (encaminhamento, pedido de exames, relatório médico) devem reaproveitar esse padrão.
- **Dor real de uso:** a impressão de relatórios está com espaçamento ruim (diferença de até uma página) — atrapalha a consulta hoje.
- **IA disponível:** integração Groq (LLM + Whisper) já existe e pode apoiar geração de documentos no futuro.
- **Storage:** Supabase Storage disponível para fotos de pacientes (atenção a privacidade — fotos de crianças).
- **Rich text:** editor TipTap já presente, útil para corpo de documentos/orientações.

## Constraints

- **Tech stack**: Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind 4, shadcn/ui — manter o padrão de três camadas `app/ → actions/ → modules/`.
- **Backend**: Supabase (Postgres + Auth + Storage) — toda query escopada por `profile_id`; manter gate de assinatura nos novos actions.
- **PDF**: geração via `@falaped/falaped-kit/pdf` (pdfkit como `serverExternalPackage`) — a correção de impressão atua aqui.
- **Privacidade**: fotos de crianças são dado sensível — armazenar com cuidado (acesso escopado ao médico dono).
- **Sem prazo**: melhoria contínua, sem data limite — priorizar por dor real de uso.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Priorizar "Experiência da consulta" primeiro | Resolve dor real do uso diário (impressão) e melhora o fluxo central | — Pending |
| Vacinas em versão completa (referência + carteira por paciente) | Médico quer tanto consultar o calendário quanto rastrear o que cada paciente tomou | — Pending |
| Novos documentos seguem o mesmo padrão das receitas | Reaproveita wizard + templates + geração de PDF já existentes | — Pending |
| Relatório médico é um tipo NOVO, separado do laudo/relatório de caso | O médico confirmou que é um documento diferente do que já existe | — Pending |
| Extração de exames por foto (IA) fica para v2 | Item mais complexo; manter foco e entregar o resto mais rápido | — Pending |
| Curva de crescimento inserida como Phase 3 (antes dos documentos) | Reprioriza acompanhamento de crescimento; consome o motor de idade da Phase 1 e não depende do PDF, então precede os documentos. Documentos → Phase 4, Vacinas → Phases 5–6 (renumeração inteira, 2026-07-09) | — Pending |
| [v1.1] Acesso da assistente por assento leve (login real + membership), NÃO por link/token | Identidade nominal é mais segura e auditável que um segredo compartilhável sobre base de menores (LGPD); evita criar a 1ª superfície session-less do app. Substitui a proposta anterior de link com token (superada 2026-07-20) | — Pending |
| [v1.1] Assento escopado só à agenda + busca de paciente, sem refatorar ownership do app | Dá o acesso delegado sem migrar `profile_id` → `org_id` em todas as tabelas; membership + escopo nas tabelas de agenda/paciente, prontuário/documentos permanecem só do dono (path C — org completa — descartado para este ciclo) | — Pending |
| [v1.1] Agendamentos entram como "pedido a confirmar" | Dá controle ao médico antes de firmar o horário; evita reserva indevida | — Pending |
| [v1.1] Ganhos como lançamento financeiro separado (ligado ou não à consulta) | Flexível; não força cada consulta a ter valor nem cada valor a ter consulta | — Pending |
| [v1.1] Sem notificações neste ciclo (só painel) | Reduz escopo/infra; o painel resolve o essencial de "fiquei sabendo do agendamento" | — Pending |
| [v1.1] Versão v1.1 (adição de capacidade, não reescrita) | Novo domínio (agenda + finanças) mas sem refazer o que já existe | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-20 — início do milestone v1.1 (Agenda & Ganhos); acesso da assistente definido como assento leve (login + membership escopado à agenda), substituindo a proposta de link com token; v1.0 movido para Validated, itens não entregues marcados como Deferred*
