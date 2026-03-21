# Referência – Creative Director FALAPED

Complemento à [SKILL.md](SKILL.md).

## Hierarquia de UI no projeto

1. **Primitives** — `components/ui/` (Button, Input, Card, Dialog…). Preferir sempre a variant existente + `className` com `cn()`.
2. **Feature** — `components/dashboard/`. Novas telas devem **ecoar** padrões de listas, cards, headers já usados em casos/pacientes.
3. **Página** — `app/(dashboard)/...`: layout, título + descrição muted, `gap-6`, `max-w-5xl` / `max-w-6xl` quando fizer sentido.

## Checklist estendido de UX

- [ ] **Scanability**: o pediatra acha a informação crítica em segundos?
- [ ] **Carga cognitiva**: quantos conceitos novos por tela?
- [ ] **Erro recuperável**: mensagem clara + ação (tentar de novo, voltar)?
- [ ] **Empty state**: ícone discreto + título + descrição + CTA quando aplicável
- [ ] **Dark mode**: tokens HSL/OKLCH já suportam; evitar cores fixas que quebrem o tema
- [ ] **Touch targets**: áreas clicáveis confortáveis em uso rápido

## Relação com PRD (feature-planning-agile-po)

| Conteúdo | Onde costuma ir |
|----------|------------------|
| Personas / atores | PRD (já existe) — reforçar implicações visuais no brief |
| Fluxos e estados | PRD seção 8 + detalhe visual no brief se necessário |
| RNF de UX/a11y | PRD seção 7 |
| “Como deve parecer” | Brief de design ou anexo; critérios de aceite nas US (“exibe estado vazio com…”) |

## Anti-padrões (alinhado a `ux-ui-minimalist`)

- Gradientes chamativos, sombras pesadas, muitas cores além de primary + neutros
- Remover `focus-visible` sem substituto
- Labels genéricos que conflitem com `audience-context` (ex.: “Mãe” em vez de responsável)
