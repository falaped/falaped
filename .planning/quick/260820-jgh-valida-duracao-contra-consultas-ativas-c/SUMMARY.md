---
quick_id: 260820-jgh
date: 2026-08-20
status: complete
---

# Quick 260820-jgh — duração validada contra consultas ativas

## Bug reportado

"Consulta das 15h30 cancelada, slot aberto, mas não consigo criar outra no mesmo
horário: *Este horário já foi ocupado por outra consulta.*"

## O que a investigação mostrou

A premissa estava trocada, e o banco estava certo:

- A `EXCLUDE` constraint filtra `WHERE status IN ('pending','confirmed')` —
  cancelada **não** segura slot. Verificado em `pg_constraint`.
- A consulta cancelada era das **15:00** (15:00–15:15), não das 15:30.
- Às **15:30** havia uma `confirmed` ATIVA, criada 2 min depois do cancelamento
  e nunca cancelada (`created_at == updated_at`):
  - `16:51:20Z` criou 15:00 → `16:51:35Z` cancelou
  - `16:53:59Z` criou 15:30 → confirmed, ativa

O slot das 15:00 estava (corretamente) livre. O erro vinha da **duração**:
`45/60/90 min` a partir das 15:00 invadem a confirmed das 15:30. Confirmado
contra os dados reais via SQL:

| Tentativa em 15:00 | Resultado | Colide com |
|---|---|---|
| 15 min | OK | — |
| 30 min | OK | — |
| 45 min | 23P01 | 15:30–16:00 (confirmed) |
| 60 min | 23P01 | 15:30–16:00 (confirmed) |
| 90 min | 23P01 | 15:30–16:00 + 16:00–16:15 |

Como a duração default virou 60 min (`ba78fe7`), o caminho natural caía no erro.

## Root cause

A duração escolhida nunca era validada contra as consultas existentes:

1. `railFreeSlots` (`calendar-editor.tsx`) filtrava só o minuto de **início** do
   slot — não dependia de `duration`. 15:00 seguia listado como livre com 60 min
   selecionado, sem aviso.
2. A camada de fundo da grade renderizava faixas de UMA HORA (`GRID_STEP=60`) e
   avaliava o estado só no minuto de início da hora. A chave `:930` nunca era
   consultada, então a consulta das 15:30 era **invisível** para a célula das 15h
   — e inalcançável por teclado.

Não corrigido nesta task (decisão do usuário): a validação server-side. Ver
pendência abaixo.

## O que mudou

- **`lib/max-slot-duration.ts`** (novo) — função pura que encadeia células de
  `step` contíguas livres até um `cap`, devolvendo a duração máxima agendável.
  Extraída do `useMemo` justamente para ser testável: é a lógica que evita
  double-booking.
- **`lib/max-slot-duration.spec.ts`** (novo) — 7 casos, incluindo o cenário real
  (15:00 com 15:30 confirmada → 30 min) e o de status final não bloqueando.
- **`calendar-editor.tsx`** — `FreeSlot` agora carrega `maxDuration`, derivado
  via `maxSlotDuration` com `cellStateOf` + `appointmentByCell`.
- **`booking-rail.tsx`** — chips maiores que `maxDuration` ficam `disabled` com
  `title` explicando o teto; um `useEffect` rebaixa a duração selecionada para o
  maior preset que cabe ao escolher um slot mais curto.
- **`calendar-time-grid.tsx`** — camada de fundo passa de 1 faixa por hora para
  1 faixa por `STEP` (30). Cada meia hora ganha estado próprio e tabstop próprio.
  O visual por hora (260725-dvv) é preservado por `isHourEdge`: só a faixa que
  termina em hora cheia desenha a borda inferior, então duas metades de mesmo
  estado continuam lendo como um bloco de uma hora.

## Verificação

- `yarn typecheck` — passou.
- `yarn test` — 554/554 passando.
- `yarn build` — passou.
- Conflitos conferidos por SQL contra os dados reais (tabela acima).

Nota de ambiente: a suíte parecia estar quebrada (vários `TransformError`) porque
o Node em uso era **x86_64 sob Rosetta** numa máquina M2, e o esbuild do `tsx` —
como o `lightningcss` do build — só tem binário arm64 instalado. Com
`nvm use 22` (arm64) tudo passa. Nada disso é do código.

## Pendências conhecidas

1. **Servidor sem checagem de sobreposição.** `create-appointment.ts` valida
   apenas cobertura por slots de *disponibilidade*; nunca consulta `appointments`.
   A exclusion constraint continua sendo a única barreira real, e a copy dela
   ("já foi ocupado por outra consulta") é de corrida — não diz o horário em
   conflito. O cliente agora evita o caso comum, mas um cliente desatualizado ou
   uma corrida real ainda produzem a mensagem genérica. Fix: pré-checar overlap
   no action e devolver erro específico.
2. **Granularidade sub-STEP.** Uma consulta de 15:00–15:15 ocupa a célula inteira
   das 15:00 no mapa (`floor(rawStart/STEP)*STEP`), então os 15 min restantes não
   são oferecidos. Herdado do modelo de 30 min, não introduzido aqui.
