# Falaped

## What This Is

Plataforma web para médicos brasileiros gerenciarem o ciclo clínico do consultório: pacientes, casos de consulta (com gravação e transcrição de áudio), receitas, atestados e relatórios — com um assistente de IA que conduz o fluxo clínico e gera documentos. Construída em Next.js 16 + Supabase + Groq, com vínculo de telefone via WhatsApp (bot externo) e acesso gated por assinatura paga.

## Core Value

O médico documenta a consulta falando — e sai com ficha, relatório, receita e atestado prontos, sem digitação manual.

## Current Milestone: v1.1 Hardening & Experiência do Paciente

**Goal:** Blindar o isolamento multi-tenant e a qualidade da base existente, e entregar as duas primeiras features voltadas ao paciente.

**Target features:**
- Segurança multi-tenant — corrigir IDOR nos deletes, habilitar RLS em todas as tabelas de dados, restringir o admin client, bulk delete em lote
- Higiene de código — rotas `new`/`novo` unificadas, env centralizado em `lib/env.ts`, catches silenciosos com log, deps Supabase pinadas, limpeza de scaffolds mortos
- Componentes gigantes refatorados — extrair hooks/subcomponentes dos arquivos >800 linhas
- Testes & CI — testes de ownership nas actions de delete/generate + pipeline CI (typecheck/lint/test)
- Compartilhamento com paciente — link seguro para baixar receita/atestado
- Timeline do paciente — histórico consolidado (casos, receitas, atestados)

## Requirements

### Validated

<!-- Inferred from existing codebase (v1.0 implícito) — see .planning/codebase/ -->

- ✓ Auth por email/senha com confirmação OTP e gate de assinatura paga (`profile.status === "paid"`) — pré-GSD
- ✓ CRUD de pacientes com ficha clínica — pré-GSD
- ✓ Casos de consulta com gravação de áudio, transcrição (Groq Whisper) e assistente de IA — pré-GSD
- ✓ Geração de receitas e atestados em PDF com templates — pré-GSD
- ✓ Relatórios de caso gerados por LLM com templates editáveis — pré-GSD
- ✓ Vínculo de telefone via código de 6 dígitos (bot WhatsApp externo) — pré-GSD
- ✓ Discussões clínicas — pré-GSD

### Active

<!-- Current scope (milestone v1.1). Building toward these. -->

- [ ] Isolamento multi-tenant garantido no banco (RLS) e na aplicação (ownership em todos os deletes)
- [ ] Higiene de código: rota única por recurso, env validado centralizado, erros logados, deps pinadas
- [ ] Componentes >800 linhas decompostos em hooks/subcomponentes testáveis
- [ ] Testes de ownership/erro nas server actions críticas + CI rodando typecheck/lint/test
- [ ] Paciente pode receber link seguro para baixar receita/atestado
- [ ] Médico vê timeline consolidada do paciente (casos, receitas, atestados)

### Out of Scope

- Assinatura digital ICP-Brasil nos PDFs — relevante, mas requer integração certificadora; avaliar em milestone futuro
- Agenda de consultas com lembretes — feature grande; depois do hardening
- Busca global no dashboard — adiada; menor prioridade que segurança
- Upload direto de áudio (presigned) — adiada nesta rodada; limite de 25mb ainda aceitável
- Bot WhatsApp (repo externo) — fora deste repositório

## Context

- Codebase brownfield mapeado em `.planning/codebase/` (2026-06-04): STACK, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, INTEGRATIONS, CONCERNS
- **Achado crítico do mapeamento:** IDOR confirmado em `modules/prescriptions/delete-prescription.ts:33` e `modules/medical-certificates/delete-medical-certificate.ts:33` (delete por `id` sem filtro de dono) + ausência total de RLS nas tabelas de dados. Segurança vem antes de qualquer link externo para pacientes.
- Arquitetura em camadas: `app/` → `actions/` (auth gate + Zod) → `modules/` (uma função por arquivo, client injetado) → Supabase/Groq
- Testes só em funções puras (`modules/`, `lib/`, 31 specs, `node:test` via tsx); zero testes em actions/components; sem CI
- Strings de usuário em PT-BR

## Constraints

- **Tech stack**: Next.js 16 / React 19 / Supabase / Groq / Tailwind 4 — manter; sem novas dependências de dados (ex.: react-query) sem decisão explícita
- **Segurança**: Nenhum link externo para paciente pode ir ao ar antes do RLS + fix do IDOR — superfície de ataque atual é exploitable
- **Compatibilidade**: Migrações Supabase aditivas; RLS não pode quebrar os fluxos existentes do app (clients SSR/browser/proxy)
- **Idioma**: UI e mensagens em PT-BR

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tratar código existente como v1.0 implícito; GSD começa em v1.1 | App já funcional em produção-alvo; histórico pré-GSD inferido do mapa | — Pending |
| Hardening de segurança antes das features de paciente | Links externos ampliam a superfície do IDOR atual | — Pending |
| Padronizar rotas em um idioma único por recurso | Duplicação `new`/`novo` dobra manutenção | — Pending |

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
*Last updated: 2026-06-04 after milestone v1.1 initialization*
