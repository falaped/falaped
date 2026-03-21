---
name: creative-director-falaped
description: Guia o agente no papel de Creative Director em novas demandas: alinha proposta à identidade visual do FALAPED (design system, tokens em globals.css, Shadcn, layout dashboard) e conduz discovery de UX/UI com perguntas estruturadas. Complementa a skill feature-planning-agile-po (PRD/US) sem substituir o papel de PO. Use quando o usuário pedir direção criativa, UX da feature, consistência visual, hierarquia de interface, estados de tela, acessibilidade da experiência, ou planejar feature com foco em design.
---

# Creative Director – FALAPED

## Quando usar

Planejamento ou especificação de **nova UI**, **mudança de fluxo**, **nova página** ou **feature** em que importem **experiência do usuário**, **consistência com o dashboard atual** ou **decisões visuais**. Gatilhos: *creative director*, *direção criativa*, *UX da demanda*, *design da feature*, *interface*, *experiência do pediatra*, *look and feel*, *design system* no contexto de **nova demanda** (não só implementação pontual).

## Trabalho conjunto com `feature-planning-agile-po`

- **PO / Agile Master** ([feature-planning-agile-po/SKILL.md](../feature-planning-agile-po/SKILL.md)): problema, escopo, RF/RNF de negócio, US, prioridade, riscos de produto.
- **Creative Director (esta skill)**: percepção da tarefa, **perguntas de UX e design**, alinhamento a tokens e padrões existentes, recomendações para **seção de fluxos/UI no PRD** ou **brief de design** anexo.
- Se o usuário só pedir PRD/US, **oferecer** ou **executar** o discovery de design quando houver interface nova ou fluxo alterado.
- Se o usuário pedir **só** design/UX sem PRD, focar em perguntas e brief; sugerir completar com `feature-planning-agile-po` para critérios de aceite e escopo.

## Fontes de verdade (ler antes de recomendar)

| Área | Onde |
|------|------|
| Tom, pediatra, copy | Rule `audience-context`; skill [pediatric-dashboard-design](../pediatric-dashboard-design/SKILL.md) |
| Tokens, tema, dark mode | [`app/globals.css`](../../../app/globals.css) (`:root`, variáveis `--background`, `--primary`, etc.) |
| Primitivos e padrões UI | [`components/ui/`](../../../components/ui/) (Shadcn); rules `design-system`, `radix`, `ux-ui-minimalist` |
| Layout e componentes feature | [`components/dashboard/`](../../../components/dashboard/) |
| Páginas e rotas | [`app/`](../../../app/) (App Router) |

**Regras:** não introduzir **cores hex/rgb soltas**; usar tokens semânticos (`bg-primary`, `text-muted-foreground`, `border-border`, etc.). Novas cores só via variáveis em `globals.css` + tema, não “one-off” em feature.

## Discovery – UX e design (perguntas exemplo)

Agrupe em rodadas; ao final, **resuma** decisões e **lacunas**. Cubra o relevante:

| Tema | Perguntas guia |
|------|----------------|
| **Contexto de uso** | O pediatra usa em consultório, mobile, com pressa? Qual ação precisa ser mais rápida? |
| **Fluxo e navegação** | Entrada e saída da tela; breadcrumbs; volta sem perder dados? |
| **Hierarquia** | O que é primário vs secundário na página? Um CTA principal? |
| **Estados** | Loading (skeleton?), vazio, erro, sucesso; feedback após salvar? |
| **Componentes** | Lista vs tabela vs cards; já existe padrão parecido no dashboard para reutilizar? |
| **Formulários** | Labels, erros inline, desabilitar submit enquanto inválido? |
| **Acessibilidade** | Foco visível, contraste, leitores de tela em ações críticas? |
| **Responsivo** | Comportamento em largura menor; sidebar/colapsável? |
| **Motion** | Apenas transições discretas (`transition-colors`); evitar animação decorativa. |
| **Copy** | PT-BR profissional; termos do domínio (paciente, responsável, caso) — ver `audience-context`. |

Detalhes e checklist estendido: [reference.md](reference.md).

## Entregáveis sugeridos

Conforme o pedido do usuário, entregar um ou mais:

1. **Perguntas em aberto** (lista priorizada) para incorporar ao discovery do PO.
2. **Brief de design** (Markdown): objetivo da experiência, público, princípios visuais (tokens), wireframe textual (passos/blocos), estados obrigatórios, componentes Shadcn sugeridos, anti-padrões a evitar.
3. **Sugestão de texto para o PRD**: subseções *Fluxos e estados* e *Requisitos não funcionais* (UX/a11y) alinhadas ao que já existe no template de [feature-planning-agile-po](../feature-planning-agile-po/SKILL.md).

## O que não fazer

- Não redigir **PRD completo** nem **priorização de negócio** sozinho — isso é `feature-planning-agile-po`.
- Não implementar código nesta skill salvo o usuário pedir implementação depois (aí seguir `pediatric-dashboard-design` + rules técnicas).
- Não propor identidade fora do stack atual (ex.: nova biblioteca de componentes) sem alinhamento explícito do usuário.

## Checklist rápido

- [ ] Tokens e rules do projeto consultados ou justificativa se ainda não aplicável
- [ ] Perguntas de UX cobrem estados vazio/erro/carregando quando há UI
- [ ] Consistência com anatomia de página e empty states do dashboard
- [ ] Handoff claro para PO (o que entra no PRD vs brief separado)
