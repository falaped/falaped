# Referência – PRD, US e refinamento

Complemento à [SKILL.md](SKILL.md). Leia quando precisar aprofundar qualidade de PRD, INVEST, fatiamento ou spikes.

**Ordem de trabalho:** a seção *Regra obrigatória* do SKILL.md tem precedência — perguntas ao usuário antes do PRD/US, salvo skip explícito.

## Boas práticas de PRD

1. **Problema antes da solução** — descreva dor, contexto e resultado desejado antes de detalhar telas ou stack.
2. **Requisito ≠ implementação** — “o sistema deve permitir X” em vez de “usar biblioteca Y” (salvo restrição explícita de negócio ou arquitetura).
3. **Testável e observável** — cada RF deve ser verificável; evite adjetivos vagos (“rápido”, “intuitivo”) sem critério mensurável ou exemplo de comportamento.
4. **Escopo negativo** — “Fora do escopo” reduz discussões e scope creep.
5. **Uma fonte** — decisões dispersas em chat; o PRD consolida para stakeholders e time técnico.
6. **PRD ≠ ADR** — decisões arquiteturais profundas ficam em ADR ou documento técnico; o PRD pode citar “spike necessário” ou “anexo técnico”.

## INVEST (user stories)

Histórias bem formadas tendem a ser:

| Letra | Significado | Pergunta guia |
|-------|-------------|----------------|
| **I**ndependent | Pouca dependência para entregar valor | Dá para entregar sem bloqueio externo longo? |
| **N**egotiable | Detalhe conversável com o time | O “como” é flexível; o “por quê” é firme? |
| **V**aluable | Valor para usuário ou negócio | Quem ganha e como? |
| **E**stimable | Time consegue estimar esforço | Escopo e critérios estão claros? |
| **S**mall | Cabe em um sprint (regra prática) | Dá para fatiar sem perder valor? |
| **T**estable | Aceite verificável | Dá para dizer “passou/falhou”? |

## Fatiamento de histórias grandes

- **Preferir fatia vertical** — um incremento que entrega um pedaço de fluxo ponta a ponta (mesmo que mínimo), em vez de apenas “só backend” ou “só UI” sem uso real.
- **Por persona ou cenário** — separar fluxo principal de exceções ou de segundo ator.
- **Por valor de negócio** — entregar primeiro o que desbloqueia aprendizado ou receita.
- **Evitar** fatiar só por camada técnica sem entrega utilizável ao final de cada fatia, quando o objetivo é release incremental.

## Spike vs story

| | **Spike** | **User story** |
|---|-----------|----------------|
| **Objetivo** | Reduzir incerteza (pesquisa, prova de conceito) | Entregar incremento de produto com valor e aceite claro |
| **Duração** | Time-box curto (ex.: 1–2 dias; combinar com o time) | Tamanho de sprint habitual |
| **Saída** | Documento curto, decisão, critérios para histórias seguintes | Software/comportamento em produção ou integrado conforme DoD |
| **Quando usar** | Tecnologia desconhecida, integração incerta, esforço imprevisível | Requisito compreendido o suficiente para critérios de aceite |

Se a incerteza for grande, registre no PRD uma **história de spike** com time-box e entregáveis explícitos (ex.: “documento com opções A/B e recomendação”).

## Riscos – tipos úteis (lembrar no PRD)

- **Técnico** — débito, integração frágil, performance, segurança.
- **Produto** — adoção, UX confusa, escopo mal definido.
- **Processo** — dependência de terceiro, aprovação legal, disponibilidade de stakeholder.
- **Dados** — migração, qualidade, LGPD.

Para cada risco: descrição breve, probabilidade/impacto (baixo/médio/alto), mitigação.
