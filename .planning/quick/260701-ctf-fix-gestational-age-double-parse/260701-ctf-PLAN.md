---
phase: quick-260701-ctf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/schemas/patient.ts
  - lib/schemas/patient.spec.ts
autonomous: true
requirements: [CTF-FIX-GESTATIONAL-AGE]

must_haves:
  truths:
    - "Criar/editar paciente informando idade gestacional (ex.: 34 semanas) não lança mais 'Invalid input: expected string, received number'."
    - "Re-parse do schema com gestational_age_weeks já numérico (ex.: 34) tem sucesso e devolve 34."
    - "Comportamento para string, vazio, undefined e fora de faixa permanece idêntico."
  artifacts:
    - lib/schemas/patient.ts
    - lib/schemas/patient.spec.ts
  key_links:
    - "optionalGestationalAgeWeeks (const compartilhado) alimenta createPatientSchema (linha ~105) e updatePatientSchema (linha ~151)."
---

<objective>
Corrigir o erro "Invalid input: expected string, received number" no campo "Idade gestacional ao nascer" ao criar/editar paciente.

Purpose: O bug é um double-parse. `patient-form.tsx` roda o zodResolver (que devolve a saída transformada — `gestational_age_weeks` vira `number`) e passa esse `data` para `createPatientAction`/`updatePatientAction`, que fazem `safeParse` uma segunda vez. Na segunda passada, `optionalGestationalAgeWeeks` começa com `z.string()` e recebe um `number` → erro. É o único campo que quebra porque é o único cujo transform muda o tipo de saída para não-string.

Output: `optionalGestationalAgeWeeks` tolerante a `string | number | undefined`, preservando comportamento e saída idênticos (`number | undefined`), a mesma mensagem PT-BR e a mesma faixa 20-42 inclusiva. Regressão coberta por teste.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@lib/schemas/patient.ts
@lib/schemas/patient.spec.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Tornar optionalGestationalAgeWeeks tolerante a número (fix do double-parse)</name>
  <files>lib/schemas/patient.ts, lib/schemas/patient.spec.ts</files>
  <behavior>
    - Re-parse: objeto com gestational_age_weeks numérico (34) → sucesso, saída 34.
    - String "34" → sucesso, saída 34 (comportamento inalterado).
    - "" → sucesso, saída undefined; campo ausente/undefined → sucesso, saída undefined.
    - Fora de faixa como número (10) → falha com "Informe um valor entre 20 e 42 semanas.".
    - Fora de faixa como string ("50") → falha com a mesma mensagem PT-BR.
    - Bounds inclusivos 20 e 42 aceitos (string e número).
  </behavior>
  <action>
    Em lib/schemas/patient.ts, reescrever o const compartilhado `optionalGestationalAgeWeeks` (atualmente linhas ~45-57) para aceitar entrada `string | number | undefined`, normalizando qualquer entrada numérica para String antes do pipeline existente de trim/vazio/refine/Number. Trocar a base `z.string()` por `z.union([z.string(), z.number()])` seguida de `.optional()`, e no primeiro transform normalizar: se `v` for `number`, converter com `String(v)`; então aplicar a lógica atual (trim → "" vira undefined). Manter o `.refine` com a MESMA mensagem PT-BR "Informe um valor entre 20 e 42 semanas." e a MESMA validação `Number.isInteger(n) && n >= 20 && n <= 42`, e o transform final `(v === undefined ? undefined : Number(v))` para saída `number | undefined`. NÃO alterar os dois pontos de uso (createPatientSchema ~linha 105 e updatePatientSchema ~linha 151) — o const é compartilhado, então corrigi-lo corrige ambos. NÃO tocar patient-form.tsx nem os actions (o fix de schema é suficiente e mínimo). Manter 2-space indent, aspas duplas e JSDoc; atualizar a JSDoc do const para mencionar que aceita string ou número (re-parse).

    Em lib/schemas/patient.spec.ts, adicionar um teste de regressão dentro do describe existente "createPatientSchema gestational_age_weeks" que faz safeParse com `gestational_age_weeks: 34` (NÚMERO, simulando o re-parse) e assere sucesso com saída 34. Adicionar também um teste que assere que a string "50" (fora de faixa) ainda falha com a mensagem PT-BR. Os testes existentes de "34" (string), "" e undefined já cobrem os demais casos — mantê-los intactos e passando.
  </action>
  <verify>
    <automated>yarn typecheck &amp;&amp; yarn test</automated>
  </verify>
  <done>`yarn typecheck` sem erros; `yarn test` verde; novo teste com número 34 passa e devolve 34; string "50" fora de faixa falha com a mensagem PT-BR; nenhum teste pré-existente regride.</done>
</task>

</tasks>

<verification>
- `yarn typecheck` passa (tipos de entrada/saída do schema ainda compilam).
- `yarn test` passa incluindo os novos testes de regressão.
- Sanity manual (opcional): criar paciente com idade gestacional 34 não lança o erro de double-parse.
</verification>

<success_criteria>
- optionalGestationalAgeWeeks aceita string, número e undefined; saída continua number | undefined.
- Mensagem PT-BR e faixa 20-42 inclusiva preservadas.
- Somente lib/schemas/patient.ts e lib/schemas/patient.spec.ts modificados.
</success_criteria>

<output>
Create `.planning/quick/260701-ctf-fix-gestational-age-double-parse/260701-ctf-SUMMARY.md` when done
</output>
