---
status: testing
phase: 10-livro-caixa-de-ganhos-painel
source: [10-VERIFICATION.md, 10-04-SUMMARY.md, 10-05-SUMMARY.md]
started: 2026-08-23
updated: 2026-08-23
---

# Phase 10 UAT — Livro-caixa de Ganhos & Painel

40 itens, adiados por escolha explícita do usuário (`human_verify_mode: end-of-phase`).
Itens 1–22 vêm do checkpoint `[BLOCKING]` do plano 10-04 (janela 2 do ledger); itens 23–40 do
checkpoint do plano 10-05 (janela 3).

**Os itens 1–7 são obrigatórios por contrato do UI-SPEC** — a fase não passa sem eles.
O servidor de desenvolvimento roda na porta 3000; reusar, não subir um segundo.

## Current Test

number: 1
name: Largura do diálogo de encerramento
expected: |
  Abrir um caso ativo → Ações → encerrar caso. O diálogo renderiza em `sm:max-w-lg`,
  NÃO com 256px de largura. Uma caixa estreita de 256px é o sinal de diálogo aninhado em popover.
awaiting: user response

## Tests

### 1. [OBRIGATÓRIO] Largura do diálogo
expected: Abrir caso ativo → Ações → encerrar. Diálogo em `sm:max-w-lg`, não 256px.
result: [pending]

### 2. [OBRIGATÓRIO] Popover e foco
expected: Com o diálogo aberto, o popover de Ações está visivelmente FECHADO por trás. Ao fechar o diálogo, o foco volta ao botão de Ações e não sobra popover órfão.
result: [pending]

### 3. [OBRIGATÓRIO] Esc e backdrop com dados digitados
expected: Na etapa 2, digitar valores, apertar Esc, depois clicar no backdrop. O diálogo continua aberto e nenhum valor é perdido.
result: [pending]

### 4. [OBRIGATÓRIO] Grupo segmentado de pagamento
expected: Clicar em cada uma das quatro formas. Nenhum clique fecha o diálogo, nenhum submete o form.
result: [pending]

### 5. [OBRIGATÓRIO] Transição de etapa
expected: A passagem da etapa 1 para a 2 mantém o MESMO diálogo aberto — sem flash, sem segundo overlay.
result: [pending]

### 6. [OBRIGATÓRIO] Cortesia
expected: Clicar em `Sem cobrança` → caso encerrado com ZERO lançamentos, toast `Caso encerrado sem lançamento.` Confirmar no painel de Ganhos que nada foi criado.
result: [pending]

### 7. [OBRIGATÓRIO] Preço nulo
expected: Com o valor da consulta em branco no Perfil, abrir a etapa 2: o campo de consulta abre VAZIO e o hint com link para o Perfil aparece.
result: [pending]

### 8. Total do resumo fecha com o painel
expected: Encerrar preenchendo o valor da consulta + 2 procedimentos. O resumo ao vivo lê total e contagem no plural, e o total fecha EXATAMENTE com o painel de Ganhos depois. 3 lançamentos criados (consulta + 2).
result: [pending]

### 9. Guarda de re-encerramento (D-10)
expected: Reabrir o mesmo caso e encerrar de novo. O diálogo fecha depois da etapa 1, toast `Caso encerrado.`, sem perguntar nada — nenhuma etapa 2, nenhum banner de "já faturado". (Esta é a guarda que estava ausente do caminho de escrita e foi corrigida em `c27e247` — vale testar duplo-clique também.)
result: [pending]

### 10. Linha de ajuste
expected: Alterar o valor de um procedimento para algo diferente do catálogo → linha de ajuste em muted com o valor original. Voltar ao valor do catálogo → a linha desaparece. Com o preço do perfil nulo, a linha da consulta NÃO aparece.
result: [pending]

### 11. Backstop overflow (S3)
expected: Com ~20 procedimentos cadastrados, abrir a etapa 2: a lista rola (`max-h-56`) e o rodapé (saída de cortesia + primário) continua alcançável.
result: [pending]

### 12. Backstop 1-vs-N (S3)
expected: Marcar 1 procedimento e depois vários: o bloco não muda de layout entre 1 e N linhas, e o resumo concorda em número.
result: [pending]

### 13. Backstop nome longo (S3)
expected: Com procedimento de nome ~80 caracteres, o campo de preço não é empurrado para fora da linha (checkbox + nome + preço).
result: [pending]

### 14. Procedimento gratuito
expected: Cadastrar procedimento com preço `0,00`. Encerrar caso marcando ESSE procedimento + valor da consulta: o checkbox PODE ser marcado, NENHUMA mensagem de cortesia aparece, o resumo conta 1 lançamento (só a consulta), e o painel mostra exatamente uma linha. Repetir marcando SÓ o gratuito, sem consulta: caso encerrado com zero lançamentos e sem erro.
result: [pending]

### 15. S7 sem lançamento
expected: Num caso sem faturamento, abrir Excluir caso: o diálogo está exatamente como antes desta fase, SEM bloco financeiro.
result: [pending]

### 16. S7 com lançamentos — MUDOU por causa do `restrict`
expected: Num caso com 2 lançamentos somando R$ 330,00: o bloco destrutivo aparece com a contagem no plural nos dois lugares e o valor completo (`R$ 330,00`, sem abreviação), e o botão de confirmação fica **DESABILITADO**. NÃO espere mais o botão `Excluir caso e N lançamentos` — o banco recusa a exclusão, então prometer isso seria mentira na UI.
result: [pending]

### 17. S7 singular — MUDOU por causa do `restrict`
expected: Num caso com 1 lançamento, tudo no singular, e o confirmar igualmente desabilitado.
result: [pending]

### 18. Backstop overflow (S7)
expected: Com total grande (`R$ 145.320,00`), ele cabe no corpo estreito do diálogo sem abreviar.
result: [pending]

### 19. S7 bloqueio — MUDOU: agora tem dois caminhos
expected: |
  Caminho A — forçar a falha da leitura dos totais: o confirmar fica DESABILITADO e aparece
  `Não foi possível verificar os lançamentos deste caso. Tente novamente.`
  Caminho B (novo) — um caso com SÓ lançamentos anulados passa pelo diálogo normal e é barrado
  pelo `23503` traduzido (`Este caso tem lançamentos no livro-caixa e não pode ser excluído.
  O faturamento fica registrado para auditoria.`), com o diálogo PERMANECENDO aberto.
  Nota: a justificativa original do plano ("com a FK em cascade, prosseguir sem contagem apaga
  dinheiro em silêncio") está obsoleta — o banco agora recusa. O item continua valendo porque
  prosseguir sem contagem ainda dá erro cru em vez de explicação antecipada.
result: [pending]

### 20. S7 falha de exclusão
expected: Provocar falha na exclusão e confirmar que o diálogo PERMANECE aberto para nova tentativa.
result: [pending]

### 21. Máquina de status intacta
expected: `git diff --stat modules/cases/update-case-status.ts actions/cases/update-case-status.ts` sai vazio — o encerramento não foi alterado pela etapa de lançamento.
result: [pending]

### 22. [MAIOR RISCO SILENCIOSO] Data de recebimento no fuso da clínica
expected: |
  Abrir a etapa 2 e confirmar que `Recebido em` já vem com a data de HOJE. Repetir com o host
  forçado em UTC e o relógio depois das 21h de Brasília (`TZ=UTC yarn dev` às 22:00 BRT, ou
  simplesmente testar de verdade depois das 21h). A data no campo tem de continuar sendo o dia
  de Brasília, NÃO o dia seguinte. Salvar e conferir que o lançamento caiu no card `Hoje` e no
  bucket do dia certo.
  Não é item visual: é a coluna que define todos os buckets da fase, e errar aqui não emite erro.
result: [pending]

### 23. Painel abre no mês atual
expected: Abrir `/dashboard/earnings`. Abre no mês atual e a URL NÃO tem search param de mês na primeira carga.
result: [pending]

### 24. Escopo duplo
expected: Clicar no mês anterior. Gráfico, tabela, total e média trocam; os TRÊS cards da Faixa A não mudam nada; o badge `Sempre o mês atual` aparece ao lado do título da Faixa A; o rótulo do período no header da Faixa B fica em peso médio e cor normal (não muted). Clicar em `Hoje` → o badge desaparece.
result: [pending]

### 25. Navegador de período
expected: Os botões de anterior/próximo têm o MESMO tamanho dos do navegador da agenda (28px) — não maiores.
result: [pending]

### 26. Período vazio
expected: Navegar para um mês sem lançamento. O gráfico NÃO aparece (não um eixo vazio); o bloco tracejado `Nenhum lançamento neste período.` ocupa o corpo da Faixa B com CTA `Novo lançamento`; os cards da Faixa A continuam com os valores de hoje.
result: [pending]

### 27. Gráfico
expected: Com lançamentos em vários dias: uma barra por dia, altura numérica fixa, eixo X só com o dia do mês, eixo Y com valores em reais completos e sem abreviação (checar especificamente que `R$ 1.200,00` cabe — é a razão dos 88px), tooltip com valor formatado e rótulo prefixado com Dia, e NENHUMA animação ao carregar.
result: [pending]

### 28. Tabela
expected: Quatro colunas com os cabeçalhos exatos, valor alinhado à DIREITA com dígitos de largura fixa, badge PT-BR da forma de pagamento, e o nome do paciente virando link para o caso quando o lançamento tem caso.
result: [pending]

### 29. Backstop de texto longo (S1)
expected: Criar avulso com descrição de ~200 caracteres. A célula truncada mostra tooltip com o texto completo e a coluna de valor NÃO sai da tela.
result: [pending]

### 30. Anulação
expected: Anular uma linha. Título `Anular lançamento?`, descrição citando valor e data daquele lançamento, e dizendo explicitamente que não se pode editar valores, só anular e lançar de novo. Confirmar → a linha desaparece (filtro desligado) e cards, total, média e gráfico caem imediatamente, sem F5.
result: [pending]

### 31. Desfazer
expected: No toast, rótulo `Desfazer`, durando ~8 segundos (não ~4). Clicar → `Anulação desfeita.`, linha de volta, números restaurados. Repetir deixando o toast expirar: o desfazer não está mais disponível em lugar nenhum.
result: [pending]

### 32. Filtro de anulados
expected: Marcar `mostrar anulados`. As linhas anuladas aparecem INTERCALADAS em ordem de data (não empilhadas no fim), em `line-through` e cor muted, com badge `Anulado`, SEM botão de anular, e SEM nenhuma cor destrutiva ou vermelha. Cards, total, média e gráfico NÃO mudam ao ligar o filtro.
result: [pending]

### 33. Filtro ligado, nada anulado — MUDOU (item era impossível como escrito)
expected: Mês com lançamentos mas nenhum anulado, filtro ligado → `Nenhum lançamento anulado neste período.` com corpo sobre auditoria e SEM CTA. Aparece como nota tracejada ABAIXO da tabela, porque com o filtro ligado a lista nunca está vazia num mês que tem lançamentos.
result: [pending]

### 34. Nenhuma edição de valor
expected: Percorrer a tabela procurando qualquer afordância de editar valor — ícone de lápis, duplo-clique numa célula, menu de contexto. NADA disso pode existir. (O banco também recusa: `update amount_cents` → 42501.)
result: [pending]

### 35. Reconciliação ao centavo (SC-3)
expected: Somar à mão os valores visíveis da tabela do período e conferir contra o card `Total do período`. Tem de fechar EXATAMENTE, ao centavo. Conferir também que a média mostrada é o total dividido pela contagem impressa na sub-linha.
result: [pending]

### 36. S4 — card de ganhos no caso
expected: Abrir um caso encerrado com lançamento. Card `Ganhos deste atendimento` com as mesmas colunas do painel, rodapé com total e contagem no plural correto. Anular por ali e confirmar que o painel de Ganhos reflete a queda.
result: [pending]

### 37. S4 vazio
expected: Abrir um caso sem faturamento. O card NÃO existe — nem vazio, nem com mensagem.
result: [pending]

### 38. Backstop overflow (S4)
expected: Num caso com muitos lançamentos, o card não cresce sem limite: já está em `max-h-64 overflow-y-auto` — confirmar que o scroll interno funciona e o rodapé segue visível.
result: [pending]

### 39. Backstop zero-um-muitos (S4)
expected: O rodapé lê singular com um lançamento e plural com vários. A contagem é de NÃO-anulados — um caso com 3 linhas e 1 anulada lê `2 lançamentos` por design.
result: [pending]

### 40. Tema escuro e claro
expected: Testar nos dois temas: nenhum verde e nenhum vermelho significando dinheiro em nenhuma das duas superfícies.
result: [pending]

## Summary

total: 40
passed: 0
issues: 0
pending: 40
skipped: 0
blocked: 0

## Gaps
