# Phase 1: Security Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-04
**Phase:** 1-Security Foundation
**Areas discussed:** Rollout do RLS, Comportamento de delete, Formato do CI, Limpeza & pinning

---

## Rollout do RLS

| Option | Description | Selected |
|--------|-------------|----------|
| Migration única | Habilita RLS + policies em todas as tabelas de uma vez (atômico) | |
| Incremental por domínio | Uma migration por grupo de tabelas, validando fluxos entre etapas | ✓ |
| Você decide | Claude escolhe no planejamento | |

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase local (CLI) | `supabase start` + validação local | |
| Projeto staging | Segundo projeto Supabase para validação pré-prod | |
| Direto em produção | Aplicar e smoke-testar no banco vivo | |
| *Other:* Usar MCP supabase | Aplicar e validar migrations via Supabase MCP server | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Projeto único (vivo) | Só existe o projeto de produção; cada etapa reversível | ✓ |
| Branch de desenvolvimento | Supabase branching via MCP | |
| Projeto separado de teste | Segundo projeto para validação | |

| Option | Description | Selected |
|--------|-------------|----------|
| Rollback imediato | Script de reversão pronto por migration; reverte via MCP e reaplica corrigido | ✓ |
| Fix forward | Nunca desabilitar RLS; corrigir com nova migration | |
| Você decide | Claude define a postura | |

**User's choice:** Incremental por domínio, via MCP do Supabase, contra o projeto único de produção, com rollback imediato.
**Notes:** Usuário acrescentou restrição dura: "não podemos apagar os dados que já temos no banco de dados, esse projeto é o de produção atual" — todas as migrations devem ser aditivas e não-destrutivas.

---

## Comportamento de delete

| Option | Description | Selected |
|--------|-------------|----------|
| Banco primeiro | Deleta o row, depois o PDF; órfão de storage logado para limpeza | |
| Storage primeiro (atual) | Mantém comportamento atual; falha de storage aborta tudo | |
| Você decide | Claude define no planejamento | ✓ |

**User's choice:** Você decide (após esclarecimento — usuário inicialmente entendeu que a discussão era sobre apagar dados existentes do banco; esclarecido que se trata do fluxo de exclusão do próprio app, alvo do fix do IDOR).
**Notes:** Regras fixas: nunca afetar dados de outros médicos; logar toda falha. Detalhes restantes (mensagens de erro, falha parcial do bulk) delegados ao Claude dentro de SEC-01/SEC-04.

---

## Formato do CI

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, incluir build | typecheck + lint + test + `next build`; todo push deployável | ✓ |
| Não, só os três checks | CI rápido; build fica para a Vercel | |
| Você decide | Claude define | |

| Option | Description | Selected |
|--------|-------------|----------|
| Sim, bloquear | Branch protection na main; PR só entra com CI verde | ✓ |
| Só informativo | CI roda mas não impede merge | |
| Você decide | Claude define | |

**User's choice:** GitHub Actions (inferido do repo) com build incluído e branch protection bloqueante na main.
**Notes:** Versão de Node, cache de deps e env placeholder para o build em CI delegados ao Claude.

---

## Limpeza & pinning

| Option | Description | Selected |
|--------|-------------|----------|
| Mover p/ docs | Tirar run_prescriptions_manual.sql de migrations/ e guardar como histórico | ✓ |
| Deletar de vez | Apagar o arquivo (git mantém histórico) | |
| Você decide | Claude verifica contra o schema vivo e decide | |

| Option | Description | Selected |
|--------|-------------|----------|
| Range caret ^x.y.z | Aceita patches/minors; lockfile garante reprodutibilidade | |
| Pin exato x.y.z | Versão cravada; bump manual | |
| Você decide | Claude define no planejamento | ✓ |

**User's choice:** SQL manual movido para docs; estratégia de pinning a critério do Claude.
**Notes:** Remoção dos scaffolds mortos (consultation-audio) já travada por HYG-04 — não rediscutida.

---

## Claude's Discretion

- Ordem banco/storage no delete, tratamento de PDF órfão, UX de falha parcial no bulk, mensagens PT-BR
- Estratégia de pinning dos pacotes Supabase (caret vs exato)
- Granularidade das policies RLS, ordem dos domínios no rollout, helper para o join `user_phone` de `cases`, policies das tabelas auxiliares
- Detalhes do CI: versão de Node, cache, env placeholder para `next build`

## Deferred Ideas

None — discussion stayed within phase scope.
