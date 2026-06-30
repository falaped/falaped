# Falaped

## What This Is

Falaped é um app web para o dia a dia do pediatra: cadastro de pacientes (crianças), geração de documentos clínicos (receitas, atestados, laudos/relatórios de caso), templates reutilizáveis, condução de consultas e um assistente de IA (Groq) para apoio clínico e transcrição. Este ciclo foca em melhorar a experiência da consulta pediátrica, ampliar os tipos de documento e adicionar suporte a vacinação.

## Core Value

A consulta pediátrica precisa fluir sem fricção — o médico abre o paciente, conduz a consulta e gera os documentos certos (impressos corretamente) em poucos cliques.

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

### Active

<!-- Escopo deste ciclo. Hipóteses até serem entregues e validadas. -->

**Bloco 1 — Experiência da consulta (prioridade #1)**
- [ ] Exibir idade da criança em dias e em meses + dias (precisão pediátrica)
- [ ] Foto na identificação de cada criança (foto do médico com a criança), com upload e exibição no perfil
- [ ] Cronômetro de consulta (iniciar/contar tempo a partir do começo do atendimento)
- [ ] Corrigir espaçamento/quebras de linha na impressão de relatórios (hoje sobra espaço e às vezes gera página extra)

**Bloco 2 — Vacinas**
- [ ] Tabela de referência de vacinas por idade (calendário SUS e particular) para consulta
- [ ] Referência de vacinação da gestante (Hepatite B, dTpa, VSR, Influenza, COVID)
- [ ] Carteira de vacinação por paciente: registrar aplicadas, ver pendentes/atrasadas por idade

**Bloco 3 — Novos documentos clínicos (mesmo padrão das receitas: wizard/formulário + templates salváveis + PDF)**
- [ ] Encaminhamento médico
- [ ] Pedido de exames
- [ ] Relatório médico (tipo de documento novo, separado do laudo/relatório de caso existente)

**Bloco 4 — Receitas e orientações**
- [ ] Receituário em branco (corpo vazio para colar receitas prontas que o médico já mantém)
- [ ] Biblioteca de templates só de orientações (ex: orientação 1ª consulta, 1 mês, 2 meses...)

### Out of Scope

<!-- Limites explícitos com justificativa. -->

- Extração/transcrição de exames a partir de foto via IA — adiado para v2; é o item mais complexo e o médico sinalizou como "se não for querer muito". Anexar foto de exame ao paciente pode entrar antes, mas a extração automática fica fora deste ciclo.
- Reescrever os documentos já existentes (receitas, atestados, laudos) — só estender, não refazer.

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
*Last updated: 2026-06-27 after initialization*
