# Phase 3: Curva de Crescimento - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-09
**Phase:** 3-curva-de-crescimento
**Areas discussed:** Indicadores & padrão de referência, Prematuridade / idade corrigida, Campos atuais vs histórico, O que o gráfico mostra & impressão

> Nota: esta fase foi inserida no roadmap em 2026-07-09 (renumeração inteira — Documentos → Phase 4, Vacinas → Phases 5–6). A discussão anterior da antiga Phase 3 (Documentos) não gerou artefatos.

---

## Indicadores & padrão de referência

| Option | Description | Selected |
|--------|-------------|----------|
| OMS (WHO) | Padrão do Ministério da Saúde/Caderneta no Brasil (0–5 + 5–19) | |
| CDC (EUA) | Curvas americanas, menos aderentes ao SUS | |
| OMS + Intergrowth p/ prematuro | OMS base + Intergrowth-21 para prematuros | ✓ |

**User's choice:** OMS + Intergrowth-21 para prematuro.

| Curvas (multi) | Selected |
|----------------|----------|
| Peso/idade | ✓ |
| Estatura(comprimento)/idade | ✓ |
| IMC/idade | ✓ |
| Perímetro cefálico/idade | ✓ |

**Faixa etária:** 0–19 anos (contra 0–5 e 0–2).
**Notes:** Todas as curvas sex-specific. Nota clínica registrada: cada curva cobre a faixa onde há dado oficial da OMS (peso/idade ~10a, estatura/IMC 19a, PC ~5a).

---

## Prematuridade / idade corrigida

| Option | Description | Selected |
|--------|-------------|----------|
| Intergrowth até termo, depois OMS por idade corrigida | Transição clínica mais correta | |
| Só OMS por idade corrigida | Mais simples, dispensa Intergrowth agora | |
| Mostrar os dois pontos (cronológica + corrigida) | Plota cronológica e corrigida lado a lado | ✓ |

**User's choice:** Mostrar os dois pontos (cronológica + corrigida).

| Até que idade corrigir | Selected |
|------------------------|----------|
| Até 2 anos | |
| Até 3 anos | ✓ |
| Você decide / por indicador | |

| Gatilho | Selected |
|---------|----------|
| Automático via idade gestacional | |
| Automático + toggle manual | ✓ |
| Sempre mostrar ambos | |

**Notes:** Correção até 36 meses. ⚠️ Landmine registrado no CONTEXT.md (D-07): motor da Phase 1 limita idade corrigida a 24m — precisa estender ou recalcular localmente até 3 anos.

---

## Campos atuais vs histórico

| Option | Description | Selected |
|--------|-------------|----------|
| Histórico vira a fonte da verdade | Valor atual = última medição; scalar derivado | |
| Coexistem separados | Cadastro mantém scalar de referência; histórico à parte | ✓ |
| Migrar valor atual e aposentar os campos | 1ª medição a partir do scalar; campos somem | |

**User's choice:** Coexistem separados.

| De onde registra | Selected |
|------------------|----------|
| Na tela do paciente e no atendimento | |
| Só na tela do paciente | ✓ (via resposta livre) |
| Só no atendimento | |

**User's choice (entrada):** resposta livre — "deverá ter um histórico para as medições no perfil do paciente". Interpretado como: registro + histórico no perfil do paciente (não amarrado ao caso neste MVP). Confirmado com o usuário na reflexão.

**Retroativo:** Sim, permite data passada (contra só data atual).

---

## O que o gráfico mostra & impressão

| Option | Description | Selected |
|--------|-------------|----------|
| Percentis (P3/P15/P50/P85/P97) | Como a Caderneta da Criança | |
| Escore-z (-3 a +3 DP) | Curvas técnicas OMS | |
| Ambos (alternar) | Toggle percentil ↔ z-score | ✓ |

**User's choice (referência):** Ambos (alternar).

| Cálculo da criança | Selected |
|--------------------|----------|
| Sim — percentil + classificação | ✓ |
| Só plotar o ponto | |
| Você decide | |

| Impressão/PDF | Selected |
|---------------|----------|
| Só tela agora, PDF depois | ✓ |
| Sim, gerar PDF da curva | |
| Você decide | |

**Notes:** Percentil + classificação reaproveitam a lógica de faixa de IMC existente. PDF adiado.

---

## Claude's Discretion

- Biblioteca/técnica de gráfico (não há chart lib no projeto).
- Modelo exato da tabela de medições, unidades armazenadas, derivação da idade da medição.
- Validação/limites de entrada (kg/g, cm).
- Estratégia de armazenamento/versionamento dos datasets de referência OMS/Intergrowth.

## Deferred Ideas

- PDF/impressão da curva → iteração futura.
- Registro no fluxo do atendimento (caso) → só no perfil neste MVP.
- Alertas automáticos de desvio de crescimento → fora do MVP.
- Migrar/aposentar os campos scalar `weight`/`height`/`head_circumference` → coexistem agora; reavaliar depois.
