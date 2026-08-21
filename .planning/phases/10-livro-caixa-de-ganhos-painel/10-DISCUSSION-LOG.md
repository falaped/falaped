# Phase 10: Livro-caixa de Ganhos & Painel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-21
**Phase:** 10-livro-caixa-de-ganhos-painel
**Areas discussed:** Onde e quando lança o valor, Campos do lançamento, Leitura do painel, Anulação (estorno)

---

## Onde e quando lança o valor

### Onde o médico registra o valor recebido de uma consulta?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| No detalhe da consulta, na agenda | Reusa `appointment-detail-menu.tsx` | |
| Na página de Ganhos, escolhendo a consulta | Preenchimento em lote | |
| Nos dois lugares | Agenda + lote | |
| **(texto livre do usuário)** | Perfil ganha "Valor da Consulta" e "Valor do atendimento" (procedimentos: frenectomia, laserterapia); ao encerrar, perguntar o que foi realizado a mais | ✓ |

**Escolha do usuário:** resposta livre — redesenhou a questão. O preço vive no **perfil**, e o lançamento nasce no **encerramento**, com pergunta sobre procedimentos extras.
**Notas:** Rejeitou implicitamente as três opções apresentadas (todas ancoradas na agenda).

### O lançamento nasce sozinho quando a consulta vira "realizada"?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Não — sempre manual | Marcar realizada e lançar dinheiro separados | |
| Sim, com valor padrão do perfil | Exige campo de preço no perfil | |
| Sim, pedindo confirmação do valor | Abre campo pré-preenchido | |
| **(texto livre do usuário)** | "somente ao encerrar um caso, nao será associado mais a agenda de consultas" | ✓ |

**Escolha do usuário:** o gatilho é **encerrar o caso** (domínio `cases`), e o vínculo com a agenda sai.
**Notas:** Este é o desvio DV-1 do roadmap — EARN-01 dizia "ligado ao agendamento" e a fase dependia da Phase 7.

### Uma consulta pode ter mais de um lançamento?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Não — 1 por consulta | Unique em `appointment_id` where `voided_at is null` | |
| Sim, N lançamentos por consulta | Permite parcial/complemento | ✓ |

**Escolha do usuário:** N lançamentos.
**Notas:** Consistente com o gatilho escolhido — consulta + 1 lançamento por procedimento extra. Consequência: nenhuma constraint impede duplicata; daí a guarda de aplicação no re-encerramento (D-10).

### De onde sai o lançamento avulso (sem consulta)?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Botão na página de Ganhos | Um lugar só | |
| Na página de Ganhos e na agenda | Dois pontos de entrada | |
| Você decide | Critério do planner | ✓ |

**Escolha do usuário:** "Você decide".
**Notas:** Resolvido como botão "Novo lançamento" só na página de Ganhos — o avulso não tem horário.

---

## Onde e quando lança o valor (rodada 2 — follow-ups do schema)

### "Valor do atendimento" é um valor único ou um catálogo de procedimentos com preço cada?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Catálogo por perfil, preço em cada | Molde `exam_catalog_items`; procedimentos têm preços muito diferentes | ✓ |
| Um valor único pra qualquer procedimento | Um campo só, correção manual frequente | |
| Valor único agora, catálogo depois | Nome digitado livre | |

**Escolha do usuário:** catálogo por perfil com preço em cada item.
**Notas:** Gera o desvio DV-3 — superfície nova (tabela + tela) não prevista no roadmap da fase.

### O preço do perfil muda depois. E os lançamentos já gravados?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Congelam no valor da época | Snapshot de centavos no lançamento | ✓ |
| Seguem o preço atual do perfil | Reajuste reescreve histórico | |

**Escolha do usuário:** snapshot.
**Notas:** É o que sustenta "números auditáveis que reconciliam ao centavo" do goal da fase.

### Caso encerrado pode ser reaberto. Se ele reabrir e encerrar de novo?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Não lança de novo — só o 1º encerramento gera | Guarda no app: já existe lançamento não-anulado | ✓ |
| Pergunta de novo e soma | Trata reabrir como novo atendimento | |
| Pergunta, avisando que já existe lançamento | Mostra o já lançado e deixa decidir | |

**Escolha do usuário:** não relança.
**Notas:** Levantado a partir de `update-case-status.ts`, que permite reabrir e reseta o cronômetro.

### O vínculo com a agenda (EARN-01) sai de vez?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Sai — só caso e avulso | Zero coluna de agendamento; ajustar EARN-01 e ROADMAP | ✓ |
| Guarda `appointment_id` nullable pro futuro | Flexibilidade não usada | |

**Escolha do usuário:** sai de vez.
**Notas:** Confirma DV-1. A fase deixa de depender da Phase 7.

---

## Campos do lançamento

### Qual data manda no painel?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Data do encerramento do caso | Herda o instante, zero digitação | |
| Data que ele escolhe (recebimento) | Cobre pagamento atrasado; mais um campo | ✓ |
| Encerramento por padrão, editável | Meio-caminho | |

**Escolha do usuário:** data de recebimento escolhida por ele.
**Notas:** Rejeitou explicitamente a variante "default do encerramento, editável" — a data é um campo próprio com semântica de *quando o dinheiro entrou*, não de quando o atendimento aconteceu. Abre a possibilidade de guardar como `date` puro (sem fuso) — anotado como item de research.

### O lançamento guarda forma de pagamento?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Não, só o valor | Nenhum critério do roadmap pede | |
| Sim, enum fixo (pix/dinheiro/cartão/convênio) | Permite somar por método depois | ✓ |
| Sim, texto livre opcional | Flexível, não somável | |

**Escolha do usuário:** enum fixo.
**Notas:** O campo é gravado, mas relatório por método fica deferred — não é critério desta fase.

### Ao encerrar, ele consegue dizer "não cobrei nada"?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Sim — dá pra pular o lançamento | Sai do numerador e do denominador | ✓ |
| Sim, mas lança R$ 0,00 | Entra no denominador e derruba a média | |
| Não — encerrar sempre lança | Obriga anular depois | |

**Escolha do usuário:** pode encerrar sem lançar nada.
**Notas:** Consequência aceita e registrada: cortesia não aparece no livro-caixa de forma alguma.

### O que identifica um lançamento avulso na lista?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Descrição livre obrigatória + data | Único jeito de reconhecer meses depois | ✓ |
| Procedimento do catálogo + data | Consistente, mas não cobre o fora-do-catálogo | |
| Catálogo ou texto livre | Cobre os dois, mais UI | |

**Escolha do usuário:** descrição livre obrigatória.

---

## Leitura do painel

### O que vai no denominador da "média por consulta"?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Casos distintos + avulsos | Atendimento com 3 procedimentos conta 1; desvia da letra do EARN-04 | ✓ |
| Número de lançamentos (letra do EARN-04) | Fiel ao requisito, média cai artificialmente | |
| Mostra as duas métricas | Dois números onde um bastava | |

**Escolha do usuário:** casos distintos + avulsos.
**Notas:** Desvio DV-2 — exige emenda no EARN-04 e no SC-3 da Phase 10.

### Como o painel mostra os ganhos?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Cards de totais + lista | Entrega os 4 critérios sem gráfico | |
| Cards + gráfico de barras por dia | `recharts` já instalado | |
| Cards + gráfico + lista | Os três; tela mais cheia | ✓ |

**Escolha do usuário:** os três.
**Notas:** Nenhum critério do roadmap pede gráfico — é adição deliberada. `recharts` 3.9.0 já está no projeto, então não entra dependência nova.

### Que período o painel abre por padrão?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Mês atual | Janela de acompanhamento | ✓ |
| Hoje | Fechar o caixa à noite | |
| Semana atual | Meio-caminho | |

**Escolha do usuário:** mês atual.

### Onde "Ganhos" entra no menu lateral?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Grupo próprio "Financeiro" | Ícone de carteira | ✓ |
| Dentro de "Atendimentos" | Mistura dinheiro com clínica | |
| Dentro de "Serviços" | Grupo hoje é só documento | |

**Escolha do usuário:** grupo novo "Financeiro".
**Notas:** O grupo "Agenda" foi removido do sidebar em `4475d4d` nesta mesma sessão — registrado pra não ser reintroduzido por engano.

---

## Anulação (estorno)

### Corrigir um valor errado: edita ou anula e lança de novo?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Anula e lança de novo | Histórico mostra errado anulado + certo | ✓ |
| Edita o valor no lugar | Número anterior desaparece | |
| Edita descrição/data, anula pra mudar valor | Preserva auditoria do dinheiro | |

**Escolha do usuário:** anula e lança de novo.

### De onde ele anula um lançamento?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Só na lista do painel de Ganhos | Um lugar pra mexer em dinheiro | |
| No painel e também dentro do caso | Mais conveniente, ação em duas telas | ✓ |

**Escolha do usuário:** painel + dentro do caso.

### Lançamento anulado — aparece ou desaparece?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Escondido, atrás de "mostrar anulados" | Leitura limpa, auditável no filtro | ✓ |
| Sempre visível, riscado | Erro à vista, mês poluído | |

**Escolha do usuário:** escondido com filtro.

### Anular por engano — dá pra desfazer?

| Opção | Descrição | Escolhida |
|--------|-------------|----------|
| Não — só lançar de novo | Trilha que nunca volta atrás | |
| Toast com "Desfazer" por alguns segundos | Padrão já usado na agenda | ✓ |
| Sim, reversível a qualquer momento | Histórico deixa de ser confiável | |

**Escolha do usuário:** toast com "Desfazer" por alguns segundos.
**Notas:** Reusa o padrão dos botões "Limpar disponibilidade/folgas" da agenda (`71bfa06`). A janela exata em segundos ficou como discrição do planner.

---

## Claude's Discretion

- **Onde nasce o avulso** — usuário respondeu "Você decide". Resolvido: botão "Novo lançamento" só na página de Ganhos.
- Nomes de tabelas/colunas; enum vs text+CHECK pra forma de pagamento.
- Obrigatoriedade da forma de pagamento no diálogo.
- Janela em segundos do "Desfazer".
- Layout do painel e se o diálogo de valores é passo do `AlertDialog` de "Encerrar caso" ou um dialog seguinte.
- Se catálogo + campos de preço viram plano separado dentro da fase.

## Deferred Ideas

- Relatório/filtro por forma de pagamento (o campo é gravado, a tela não).
- Editar valor de um lançamento.
- Des-anular a qualquer momento.
- Vínculo com `appointments` (removido; voltar exigiria fase nova + backfill).
- Exportação do livro-caixa (CSV/PDF).
- Despesas / lucro / DRE.
- Ganhos visíveis para a assistente (Phase 8/9).
- Preço por convênio / tabela de preços por plano.
