# Phase 6: Disponibilidade & Calendário do Médico - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-20
**Phase:** 6-Disponibilidade & Calendário do Médico
**Areas discussed:** Edição da disponibilidade, Modelo de exceções, Views do calendário, Geração de slots

---

## Edição da disponibilidade

### Método de entrada
| Option | Description | Selected |
|--------|-------------|----------|
| Formulário de linhas | Lista de regras "dia + início + fim"; recomendado | |
| Grade semanal clicável | Grade Seg–Dom × horas, pinta/arrasta blocos | ✓ |
| Você decide | Deixar a critério do planner | |

**User's choice:** Grade semanal clicável.

### Faixas por dia
| Option | Description | Selected |
|--------|-------------|----------|
| Múltiplas faixas | Manhã + tarde com almoço de fora; recomendado | ✓ |
| Uma faixa contínua por dia | Só um início/fim por dia | |

**User's choice:** Múltiplas faixas.

### Granularidade da grade
| Option | Description | Selected |
|--------|-------------|----------|
| Passo de 30 min | Blocos de 30 min; recomendado | ✓ |
| Passo de 15 min | Mais preciso, grade mais densa | |
| Passo de 1 hora | Grade limpa, menos flexível | |

**User's choice:** Passo de 30 min.

---

## Modelo de exceções

### Escopo do bloqueio
| Option | Description | Selected |
|--------|-------------|----------|
| Dia todo + parcial | Dia inteiro OU faixa da data; recomendado | ✓ |
| Só dia inteiro | Data cheia bloqueada | |

**User's choice:** Dia todo + parcial (exceção guarda data + faixa opcional).

### Subtrativo vs aditivo
| Option | Description | Selected |
|--------|-------------|----------|
| Só subtrativo por ora | Remove horário (roadmap); recomendado | ✓ |
| Também aditivo | Bloquear OU abrir extra | |

**User's choice:** Só subtrativo. Aditivo → ideia adiada.

---

## Views do calendário

### View padrão
| Option | Description | Selected |
|--------|-------------|----------|
| Semana | Horizonte natural da recorrência; recomendado | ✓ |
| Dia | Foco no hoje | |
| Mês | Visão macro | |

**User's choice:** Semana.

### O que o mês mostra (sem consultas na Fase 6)
| Option | Description | Selected |
|--------|-------------|----------|
| Indicador leve por dia | Atende/folga + total de slots; recomendado | ✓ |
| Slots livres reais no dia | Horários dentro da célula do mês | |

**User's choice:** Indicador leve por dia.

### Construção da grade dia/semana
| Option | Description | Selected |
|--------|-------------|----------|
| Grade custom CSS grid | Tailwind, sem nova dep; recomendado | ✓ |
| Adicionar lib de calendário | schedule-x / big-calendar | |
| Você decide | Deixar para pesquisa | |

**User's choice:** Grade custom com CSS grid.

---

## Geração de slots

### Configuração da duração
| Option | Description | Selected |
|--------|-------------|----------|
| Uma duração global | Único slot padrão (AGENDA-02); recomendado | |
| Por faixa/dia | Cada faixa/dia com sua duração | ✓ |

**User's choice:** Por faixa/dia (divergência consciente da recomendação e de AGENDA-02).

### Grão da duração
| Option | Description | Selected |
|--------|-------------|----------|
| Por faixa | Cada faixa contígua tem sua duração; recomendado | ✓ |
| Por dia | Uma duração por dia da semana | |

**User's choice:** Por faixa (duração é campo da linha de faixa).

### Tratamento da sobra
| Option | Description | Selected |
|--------|-------------|----------|
| Descartar a sobra | Só slots cheios; recomendado | ✓ |
| Slot final parcial | Último slot menor | |

**User's choice:** Descartar a sobra (teste explícito no .spec).

---

## Claude's Discretion

- Range de horas visível na grade, rótulos, densidade e detalhes de interação (arrastar vs clicar-célula) — respeitando o passo de 30 min.
- Nomes de tabelas/colunas e assinatura exata da função pura de expansão — respeitando exceção com faixa opcional e duração por faixa.

## Deferred Ideas

- Disponibilidade extra pontual (exceção aditiva) — fora do escopo da Fase 6 (só subtrativo).
- Duração de slot global única como fallback futuro, se a duração por faixa se mostrar excesso.
- View de mês mais rica (slots reais na célula) — só depois que houver consultas (Phase 7+).
