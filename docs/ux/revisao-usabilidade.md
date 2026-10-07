# Etapa 4: revisão de usabilidade do protótipo

Data: 08/10/2026 · Base: `prototipo.html`, 19 telas · Método: heurísticas de Nielsen e Krug (skill `ux-heuristics`), tela por tela, no tema claro e no escuro.

**Nota: 7/10.** O caminho principal funciona bem: do cadastro à primeira consulta, documento sem sair da consulta e próximo paciente. Os problemas estão em quatro pontos:
- alertas clínicos que dependem de hover;
- ações que ignoram a regra de "uma consulta aberta por vez";
- um escore mostrado antes da hora;
- exclusão sem proteção.

Corrigindo os 5 itens de severidade 3, a nota sobe para 9. Corrigindo também os de severidade 2, chega a 10.

Escala de severidade: 1 cosmético · 2 menor (atrasa ou irrita) · 3 maior (pode levar a erro) · 4 impede a tarefa. Nenhum item ficou com severidade 4.

## Severidade 3: corrigir antes da Etapa 5

| # | Tela | Problema | Heurística | Correção |
|---|---|---|---|---|
| 1 | Consulta, Receita emitida, Escala, Ler exame (cabeçalho) | A alergia aparece só como símbolo e o nome do remédio só no hover. É justamente a tela onde o assistente sugere medicamentos. No tablet não existe hover. | Prevenção de erro; informação crítica não pode depender de hover | Na Consulta, a alergia vai por extenso, em vermelho: "Alergia: amoxicilina". Os símbolos ficam para listas e cartões. Regra na ficha: **onde se prescreve ou se conversa com o assistente, a alergia aparece escrita**. |
| 2 | Consultas, Pacientes, Buscar paciente, Início | Com a Helena em consulta, continuam ativos "Iniciar consulta", "Atender" e "↵ Iniciar". O app só permite uma consulta aberta por vez, e a tela não diz o que acontece com a da Helena. | Prevenção de erro; visibilidade do estado | Com consulta aberta, essas ações abrem uma confirmação curta: "A consulta da Helena ainda está aberta." Opções: [Voltar à consulta da Helena] ou [Encerrar a da Helena e atender Miguel]. Nada fecha sem o médico ver. |
| 3 | Escala | O escore e a interpretação ("Baixo risco") aparecem com 3 de 20 itens respondidos. | Correspondência com o mundo real; prevenção de erro clínico | Antes do fim, mostrar "3 de 20 respondidos" e "escore parcial: 2". A interpretação só aparece quando todos os itens estiverem respondidos. "Registrar na consulta" fica desabilitado até lá, com o motivo escrito. |
| 4 | Escala | A resposta marcada (Sim/Não) só muda um azul bem claro. Fica difícil conferir as respostas antes de registrar. | Visibilidade do estado; contraste | Resposta marcada com fundo azul cheio e ícone de check. A não marcada fica com contorno. |
| 5 | Consultas (menu ⋯) | "Excluir consulta" não tem confirmação nem desfazer. A exclusão apaga o relatório e os documentos. | Controle e liberdade; prevenção de erro | Confirmação que diz o que some: "Excluir a consulta de Lara (06/10)? O relatório e 1 receita também serão apagados." Botão vermelho "Excluir consulta". Sem campo de digitar nome, para não exagerar. |

## Severidade 2: corrigir junto, sem pressa

| # | Tela | Problema | Correção |
|---|---|---|---|
| 6 | Início, Pacientes, Ficha | Os símbolos abrem com hover e foco, mas no protótipo não abrem com toque. | O toque abre e fecha o detalhe, e o "Esc" fecha. Isso já está na regra da ficha; falta no protótipo. |
| 7 | Ler exame | O cabeçalho diz "14 valores encontrados", mas a tabela mostra só 3, sem como ver o resto. | Mostrar primeiro os valores alterados e, embaixo, um link "Ver os 14 valores". |
| 8 | Escala | O rodapé diz "Medidas (peso, altura, PC, PA) usam este painel", mas Medidas tem botão próprio na barra. A frase confunde. | Tirar a frase. |
| 9 | Consulta | O botão de pausar o cronômetro só tem ícone. | Rótulo acessível e dica: "Pausar cronômetro". |
| 10 | Consulta encerrada | "Enviar documentos à responsável" supõe o gênero e não diz por qual canal vai. | Usar o nome e o canal: "Enviar à Carla pelo WhatsApp". Antes, confirmar se o app já envia documentos ao responsável. Se não envia, o botão sai. |
| 11 | Perfil | Não há aviso ao sair da página com alterações não salvas. | Confirmação ao sair: "Sair sem salvar? [Continuar editando] [Sair sem salvar]". |
| 12 | Encerrar consulta | Fechar o painel no X durante a etapa 2 não diz se a revisão foi guardada. | Fechar mantém tudo o que foi revisado; a consulta continua aberta. Um aviso confirma: "Consulta continua aberta". |

## Severidade 1: cosmético

- Os painéis laterais têm 4 larguras diferentes (560, 620, 640 e 720 px). Proposta: 560 para formulário e 720 para os que mostram prévia ou relatório.
- No Início do 1º acesso, o link "Perfil" do passo 4 é pequeno. Pode virar "Personalizar".

## Dados: o que existe e o que precisa de cálculo

Conferi no código as telas que mostram alertas. Nenhum deles precisa de tabela ou coluna nova; todos saem de dados que já existem, com cálculo na tela ou no módulo:

| Alerta | De onde vem |
|---|---|
| Alergia | `patients.allergies` (texto livre) |
| Vacina atrasada | calendário em `vaccines` + doses tomadas em `patient-vaccine-doses` |
| Sem medida recente | `patient-growth` (medidas) |
| Ficha incompleta | campos vazios do paciente |
| Sem valor lançado | `financial-entries` × consultas encerradas |
| Retorno marcado/vencido | `appointments` do tipo `retorno` |
| Lembrete da última consulta | resumo de continuidade (`generate-case-carryover-summary`) |

**Uma dúvida para o gestor:** existe `app/dashboard/agenda` e o módulo `appointments`, com status e tipo `retorno`, mas a agenda não aparece no menu. Se ela não está em uso, o alerta "Retorno marcado/vencido" sai das telas.

## O que passou bem

- **Teste do porta-malas** (Krug): de qualquer tela dá para saber onde se está, já que todas têm título, migalha ou cabeçalho do paciente e item ativo no menu. A consulta aberta fica visível em todas as telas.
- **Uma ação principal por tela**: em todas, menos nos dois casos do item 2.
- **Reconhecer em vez de lembrar**: a última consulta e os lembretes aparecem no topo da consulta, a busca tem os recentes e a receita traz o peso da consulta.
- **Erros com saída**: o telefone incompleto diz o que falta; consulta encerrada pode ser reaberta; receita emitida pode ser baixada de novo.
- **Texto**: segue o guia de escrita, sem jargão de sistema ("caso", "workspace").
