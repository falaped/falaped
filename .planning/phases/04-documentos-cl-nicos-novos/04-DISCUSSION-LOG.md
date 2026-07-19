# Phase 4: Documentos Clínicos Novos - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-10
**Phase:** 04-documentos-cl-nicos-novos
**Areas discussed:** Catálogo de exames + painéis, Biblioteca de orientações, Campos (encaminhamento + relatório), Navegação e ponto de entrada

---

## Catálogo de exames + painéis (DOC-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Seed + busca + texto livre | Catálogo pediátrico seed pesquisável + texto livre | ✓ |
| Só texto livre | Médico digita tudo à mão | |
| Catálogo construído pelo médico | Começa vazio | |

| Option | Description | Selected |
|--------|-------------|----------|
| Seed default + médico cria | Alguns painéis default + painéis do médico | ✓ |
| Só o médico cria | Sem painéis seed | |
| Sem painéis nesta fase | Só itens individuais | |

| Option | Description | Selected |
|--------|-------------|----------|
| Itens editáveis no pedido | Painel expande em itens editáveis | ✓ |
| Bloco fixo | Painel inserido como bloco | |

**User's choice:** seed + busca + texto livre; seed default + médico cria; itens editáveis.
**Notes:** Conteúdo seed do catálogo e dos painéis é clínico → exige checkpoint de acurácia no build.

---

## Biblioteca de orientações (DOC-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Seed editável + médico ajusta | Textos iniciais por marco, editáveis | ✓ |
| Vazio, médico escreve | Sem conteúdo seed | |

| Option | Description | Selected |
|--------|-------------|----------|
| Calendário de consultas padrão | 1ª consulta, 1m, 2m, 4m, 6m, 9m, 12m, 18m, 24m + anual | ✓ |
| Poucos marcos iniciais | 1ª consulta, 1m, 2m, 4m, 6m, 12m | |
| Médico define os marcos | Categorias livres | |

| Option | Description | Selected |
|--------|-------------|----------|
| Documento próprio + auto-fill | Imprimível próprio com cabeçalho do paciente | ✓ |
| Anexo à receita/receituário | Anexado à receita | |
| Ambos | Próprio + anexável | |

**User's choice:** seed editável; calendário puericultura padrão; documento próprio com auto-fill.
**Notes:** Textos seed de orientação são conteúdo clínico → checkpoint de acurácia no build.

---

## Campos: encaminhamento + relatório (DOC-01 / DOC-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Picklist comum + texto livre | Dropdown de destinos pediátricos + livre | ✓ |
| Só texto livre | Digita a especialidade | |

| Option | Description | Selected |
|--------|-------------|----------|
| Rotina / Prioritário / Urgente | Três níveis | ✓ |
| Rotina / Urgente / Emergência | Inclui emergência | |
| Só Rotina / Urgente | Dois níveis | |

| Option | Description | Selected |
|--------|-------------|----------|
| Título + corpo rich-text livre | Campo título + um corpo TipTap | ✓ |
| Só corpo rich-text | Corpo puro | |
| Reusar editor de seções do laudo | Reusa seções (risco de confundir com laudo) | |

**User's choice:** picklist + texto livre; Rotina/Prioritário/Urgente; título + corpo rich-text livre.
**Notes:** Relatório médico deliberadamente distinto do laudo multi-seção.

---

## Navegação e ponto de entrada

| Option | Description | Selected |
|--------|-------------|----------|
| Hub 'Documentos' unificado | Uma seção agrupando todos | |
| Rotas separadas por tipo | Cada tipo com rota top-level (padrão atual) | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Do perfil do paciente + avulso | Do perfil (auto-fill) + avulso com seletor | ✓ |
| Só do perfil do paciente | Sempre a partir do paciente | |
| Só avulso com seletor | Só standalone | |

| Option | Description | Selected |
|--------|-------------|----------|
| Modo da receita existente | Modo "branco" do fluxo de receita | ✓ |
| Tipo de documento próprio | Tipo separado replicando o layout | |

**User's choice:** rotas separadas por tipo; do perfil + avulso; receituário = modo da receita existente.
**Notes:** —

---

## Claude's Discretion

- Armazenamento do payload (JSONB vs colunas dedicadas) — seguir analog `prescriptions`.
- AI-assist (Groq) no corpo do relatório médico — a critério do planner, provavelmente fora do MVP.
- Escopo de compartilhamento de templates — per-médico por padrão.

## Deferred Ideas

- Extração de exames por foto via IA — v2.
- Anexar orientações dentro da receita — não adotado (orientações são doc próprio).
- Hub "Documentos" unificado — preterido; revisitar se a sidebar ficar densa.
- **Content accuracy checkpoint:** dados seed (catálogo de exames, painéis, orientações) exigem sign-off clínico no build.
