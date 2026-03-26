---
name: code-refactoring
description: Analisa domínios, módulos, pastas ou fluxos do FALAPED para identificar oportunidades de refatoração com base nas rules e convenções do projeto. Gera relatório estruturado por categoria e implementa após aprovação. Use quando o usuário pedir refatoração, revisão de código, limpeza, melhoria de qualidade, ou análise de débito técnico em um módulo, pasta ou fluxo.
---

# Code Refactoring – FALAPED

## Quando usar

Pedidos explícitos ou implícitos para: **refatorar**, **revisar código**, **limpar**, **melhorar qualidade**, **analisar débito técnico**, **reorganizar**, **simplificar**, **alinhar com convenções**, ou quando o agente identificar violações significativas das rules durante outra tarefa.

## Workflow obrigatório

```
1. ESCOPO   → Definir o alvo (pasta, módulo, fluxo)
2. ANÁLISE  → Ler código + rules; catalogar findings
3. RELATÓRIO → Apresentar findings organizados por categoria e severidade
4. APROVAÇÃO → Esperar confirmação do usuário antes de qualquer alteração
5. EXECUÇÃO → Refatorar item a item; validar lints após cada mudança
6. RESUMO   → Listar o que foi feito e atualizar docs/skills impactados
```

**Regra:** NUNCA refatorar antes de apresentar o relatório e receber aprovação.

---

## 1. Definir escopo

Antes de analisar, confirmar com o usuário:

- **Alvo**: pasta (`modules/cases/`), arquivo específico, fluxo (`auth flow`), ou "tudo"
- **Profundidade**: superficial (naming, tipos) ou profunda (arquitetura, responsabilidades)

Se o usuário não especificar, perguntar. Se disser "tudo", sugerir começar por um domínio e iterar.

---

## 2. Análise

Ler o código do escopo definido e cruzar com as **rules do projeto** (`.cursor/rules/`).

### Categorias de análise

| ID | Categoria | O que verificar | Rules de referência |
|----|-----------|----------------|---------------------|
| **NAM** | Naming | Arquivos kebab-case, funções camelCase, types PascalCase, variáveis descritivas, sem abreviações vagas | `code-conventions`, `language-conventions` |
| **STR** | Estrutura | Responsabilidade única por arquivo, separação I/O vs lógica, code placement correto | `code-placement`, `functions` |
| **DUP** | Duplicação | Código repetido, oportunidades de extração para `lib/` ou `modules/` | `code-placement`, `code-conventions` |
| **TYP** | TypeScript | `any`, tipagem fraca, retorno implícito em exports, `type` vs `interface` incorreto | `typescript` |
| **PAT** | Padrões do projeto | Supabase fora de módulos, select `*`, falta de `.single()`/`.maybeSingle()`, react-query sem `queryKeys`, Server Components com `"use client"` desnecessário | `supabase-calls`, `supabase-queries`, `state-management`, `react-next-tailwind` |
| **ERR** | Error handling | catch vazio, erros silenciados, falta de log, sem rethrow | `error-handling` |
| **REA** | Legibilidade | Funções longas (>40 linhas), nesting profundo (>3 níveis), falta de early return | `functions` |
| **PER** | Performance | Re-renders desnecessários, N+1 queries, imports pesados, falta de `enabled` em react-query | `supabase-queries`, `state-management` |
| **DEA** | Dead code | Imports não usados, variáveis, funções, componentes, arquivos órfãos | — |
| **UI** | UI/UX | Cores hardcoded, HTML manual em vez de Shadcn, falta de tokens, acessibilidade | `design-system`, `ux-ui-minimalist`, `radix` |

### Severidade

| Nível | Significado |
|-------|------------|
| **Critico** | Bug potencial, segurança, erro silenciado, `any` em boundary |
| **Alto** | Violação de rule do projeto, duplicação significativa |
| **Médio** | Legibilidade, naming inconsistente, tipagem melhorável |
| **Baixo** | Cosmético, oportunidade de melhoria menor |

---

## 3. Relatório

Apresentar ao usuário no seguinte formato:

```markdown
# Relatório de Refatoração — [escopo]

## Resumo
- **Arquivos analisados:** N
- **Findings:** N (X críticos, Y altos, Z médios, W baixos)

## Findings

### [CAT-001] Título descritivo
- **Categoria:** NAM | STR | DUP | TYP | PAT | ERR | REA | PER | DEA | UI
- **Severidade:** Critico | Alto | Médio | Baixo
- **Arquivo(s):** `path/to/file.ts`
- **Problema:** Descrição concisa do problema
- **Sugestão:** O que fazer para resolver
- **Rule:** `rule-name` (quando aplicável)

### [CAT-002] ...

## Plano de execução
1. [CAT-001] — ação resumida
2. [CAT-002] — ação resumida
...

Deseja prosseguir com a refatoração? (todos / selecionar itens / cancelar)
```

**Agrupar por severidade** (críticos primeiro). Numerar para facilitar seleção.

---

## 4. Aprovação

- Esperar resposta explícita do usuário
- O usuário pode: aprovar tudo, selecionar itens específicos, ou cancelar
- Se selecionar itens, refatorar apenas os aprovados

---

## 5. Execução

- Refatorar **um finding por vez**, na ordem aprovada
- Após cada mudança: verificar lints com `ReadLints`
- Se a mudança introduzir erros, corrigir antes de prosseguir
- **Nunca** alterar comportamento funcional — refatoração preserva equivalência
- Se uma mudança exigir alteração de imports em outros arquivos, incluir

### Cuidados

- **Renomear exports**: verificar todos os consumidores antes de alterar
- **Mover arquivos**: atualizar todos os imports; verificar re-exports
- **Alterar assinatura**: verificar todas as call sites
- Se a mudança for arriscada ou ambígua, pedir confirmação extra

---

## 6. Resumo e docs

Após execução, apresentar:

```markdown
## Refatoração concluída — [escopo]

### Alterações realizadas
- [CAT-001] Descrição da mudança — `arquivo(s)`
- [CAT-002] ...

### Impacto em docs/skills
- [ ] atualizar X se necessário
```

Seguir a regra `keep-skills-updated` para atualizar docs e skills impactados.

---

## Checklist de qualidade

Antes de apresentar o relatório, validar:

- [ ] Todas as rules relevantes foram lidas e aplicadas na análise
- [ ] Cada finding tem categoria, severidade, arquivo e sugestão
- [ ] Findings estão agrupados por severidade
- [ ] Plano de execução é claro e ordenado
- [ ] Nenhuma mudança é apresentada como "já feita" antes da aprovação

Referência detalhada por categoria: [reference.md](reference.md).
