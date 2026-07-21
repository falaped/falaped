# Phase 1: Experiência da Consulta - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 1-Experiência da Consulta
**Areas discussed:** Cronômetro de consulta, Exibição da idade, Casos de borda da idade

---

## Cronômetro de Consulta

| Pergunta | Opções | Escolha |
|----------|--------|---------|
| Vínculo | Vinculado ao caso (reusa started_at) / Avulso só na tela | **Vinculado ao caso** |
| Gatilho | Botão "Iniciar consulta" / Automático ao abrir o caso | **Automático ao abrir** |
| Pausa | Só tempo decorrido / Com pausar-retomar | **Com pausar/retomar** |
| Local | Cabeçalho do caso / Flutuante / Você decide | **Flutuante reposicionável (drag-and-drop em qualquer lugar)** |

**Notas:** Pausa/retomada exige persistência além de started_at/ended_at. Widget arrastável reaproveita @dnd-kit (já instalado).

---

## Exibição da Idade

| Pergunta | Opções | Escolha |
|----------|--------|---------|
| Onde | Perfil / Listas / Cabeçalho do caso / Documentos | **Perfil + Cabeçalho do caso + Documentos** (não em listas) |
| Formato | Acompanha a data / Só a idade | **Acompanha a data** |
| Semanas | Não, só padrão / Sim, mostrar semanas | **Sim, mostrar semanas** |
| Estilo | Por extenso / Abreviado / Você decide | **Por extenso** |

**Notas:** Documentos se concretizam na Fase 3; aqui só registra intenção.

---

## Casos de Borda da Idade

| Pergunta | Opções | Escolha |
|----------|--------|---------|
| Sem data | "Idade não informada" / Nada / Aviso pra completar | **Aviso pra completar** |
| Prematuro | Fica pra depois / Entra agora | **Entra agora (idade corrigida + campo de idade gestacional)** |
| Semanas até | ~3 meses (12 sem) / ~2 meses (8 sem) / Você decide | **~3 meses (12 sem)** |
| Data inválida | Tratar como não informada / Mostrar erro-aviso | **Mostrar erro/aviso** |

**Notas:** Decisão de prematuro amplia o escopo de CONS-01 (migração + form). Capturado como D-10.

---

## Claude's Discretion

- Estilo/posição do badge de idade por contexto (abreviar em espaços apertados)
- Persistência da posição do widget flutuante entre sessões
- Estrutura de dados da pausa (segmentos vs acumulado)

## Deferred Ideas

- Analytics de tempo de consulta → v2 (AI-02)
- Correção do PDF (CONS-04): não discutida por escolha do usuário; resolvida via pesquisa (segue no escopo da Fase 1, não diferida)
