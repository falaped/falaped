# Code Refactoring — Reference por Categoria

Checklists detalhados para cada categoria de análise. O agente deve usar como referência durante a fase de análise.

---

## NAM — Naming

| Verificação | Esperado | Rule |
|-------------|----------|------|
| Arquivos | kebab-case (`get-patients-by-user-phone.ts`) | `code-conventions` |
| Funções | camelCase com verbo (`getPatient`, `formatDate`) | `code-conventions`, `functions` |
| Types/Interfaces | PascalCase (`AuthenticatedUser`, `CaseWithMessages`) | `code-conventions` |
| Variáveis | Descritivas; sem letras soltas ou abreviações vagas (`patient`, não `p`) | `code-conventions` |
| Código (identificadores) | Inglês | `language-conventions` |
| Copy (UI) | Português (Brasil) | `language-conventions` |

### Sinais de problema

- Variável `p`, `usr`, `d` fora de callback curto
- Arquivo PascalCase ou camelCase (`GetPatients.ts`)
- Função sem verbo (`patient()` em vez de `getPatient()`)
- Mix de idiomas no mesmo arquivo (variável em PT, função em EN)

---

## STR — Estrutura

| Verificação | Esperado | Rule |
|-------------|----------|------|
| Um export principal por arquivo | Sim (types e constantes auxiliares OK) | `code-conventions` |
| Separação I/O vs lógica | Funções puras para transformação; I/O isolado | `functions` |
| Code placement | Parsers em `lib/`, queries em `modules/`, UI em `components/` | `code-placement` |
| Responsabilidade única | Arquivo não mistura parsing + HTTP + persistência | `code-conventions` |
| Componentes | Server Component por padrão; `"use client"` só quando necessário | `react-next-tailwind` |
| Pages | Shell fino: importa Content + Loading, envolve em Suspense | `dashboard-falaped` SKILL |

### Sinais de problema

- Arquivo com 3+ exports não relacionados
- Componente com `"use client"` sem usar hooks, eventos ou browser APIs
- Lógica de negócio dentro de componente UI
- Formatter ou parser dentro de `modules/` ou `components/`

---

## DUP — Duplicação

| Verificação | Ação |
|-------------|------|
| Mesmo bloco de código em 2+ arquivos | Extrair para `lib/` ou `modules/` |
| Queries Supabase similares diferindo só no filtro | Parametrizar |
| Componentes com JSX quase idêntico | Extrair componente com props |
| Validações Zod repetidas | Centralizar schema em `lib/parsers.ts` ou módulo |

### Sinais de problema

- Copy-paste visível (mesmo bloco com variações mínimas)
- Mesmo `supabase.from('X').select(...)` em múltiplos arquivos
- Schema Zod definido inline em múltiplos forms

---

## TYP — TypeScript

| Verificação | Esperado | Rule |
|-------------|----------|------|
| Sem `any` | Usar `unknown` + type guard ou Zod | `typescript` |
| Retorno explícito | Em funções públicas/exportadas | `typescript` |
| `interface` vs `type` | `interface` para objetos; `type` para unions/primitives/tuples | `typescript` |
| Casting (`as`) | Evitar; preferir narrowing ou Zod parse | `typescript` |

### Sinais de problema

- `any` em parâmetros ou retornos
- `as SomeType` sem validação prévia
- Função exportada sem return type
- `type` para objeto shape simples que deveria ser `interface`

---

## PAT — Padrões do Projeto

### Supabase

| Verificação | Esperado | Rule |
|-------------|----------|------|
| Chamadas Supabase em componentes | Nunca; usar `modules/` | `supabase-calls` |
| Select explícito | `.select('id, name, ...')` não `.select('*')` | `supabase-queries` |
| Single row | `.single()` ou `.maybeSingle()` | `supabase-queries` |
| Erro checado | `if (error) throw ...` | `supabase-queries` |
| Client como 1o argumento | `(supabase, ...args)` | `code-conventions` |

### React Query

| Verificação | Esperado | Rule |
|-------------|----------|------|
| Query keys | Usar `queryKeys` centralizados | `state-management` |
| `enabled` | Presente quando depende de dados async | `state-management` |
| Invalidation | Após mutations | `state-management` |

### React / Next.js

| Verificação | Esperado | Rule |
|-------------|----------|------|
| Server vs Client | Server por padrão; Client só com hooks/eventos | `react-next-tailwind` |
| Layouts | Shared structure em layouts, não duplicada | `react-next-tailwind` |
| Data fetching | Em Server Components; dados passados como props | `react-next-tailwind` |

---

## ERR — Error Handling

| Verificação | Esperado | Rule |
|-------------|----------|------|
| Catch vazio | Nunca; log + rethrow | `error-handling` |
| Erros silenciados | `return null` em catch sem log = problema | `error-handling` |
| Custom errors | `ValidationError`, `AuthError`, `NotFoundError` quando aplicável | `error-handling` |
| HTTP mapping | Só na boundary (route/action); módulos fazem throw | `error-handling` |
| Prefixo no log | `[MODULE]`, `[AUTH]`, `[CASES]` | `code-conventions` |

### Sinais de problema

- `catch (e) {}` — vazio
- `catch (e) { return null }` — sem log
- `try/catch` em módulo que converte para HTTP status (deveria ser na route)
- Erro genérico `throw new Error('Error')` sem contexto

---

## REA — Legibilidade

| Verificação | Esperado | Rule |
|-------------|----------|------|
| Tamanho de função | < 40 linhas idealmente | `functions` |
| Nesting | ≤ 3 níveis | `functions` |
| Early return | Guards no topo; happy path depois | `functions` |
| Abstração | Um nível por função; não misturar low e high level | `functions` |

### Sinais de problema

- Função com 80+ linhas
- `if` dentro de `if` dentro de `if` dentro de `if`
- Bloco de lógica com comentário explicativo → candidato a extração
- Mix de validação + I/O + formatação na mesma função

---

## PER — Performance

| Verificação | Impacto |
|-------------|---------|
| N+1 queries | Usar `.select('*, relation(*)')` ou batch | 
| Re-renders | Memoização (useMemo/useCallback) quando necessário; split components |
| `enabled: false` ausente | Query roda sem dados; request desnecessário |
| Bundle size | Imports pesados não tree-shaken (ex.: import inteira de lodash) |
| Client-side data em Server Component | Dados que poderiam ser fetched no server |

---

## DEA — Dead Code

| Verificação | Ação |
|-------------|------|
| Imports não usados | Remover |
| Variáveis declaradas sem uso | Remover |
| Funções exportadas sem consumidor | Verificar; se órfã, remover |
| Arquivos inteiros sem import | Verificar; se órfão, remover ou documentar por quê existe |
| Código comentado | Remover (git preserva histórico) |
| Console.log de debug | Remover ou converter em log estruturado |

---

## UI — UI/UX

| Verificação | Esperado | Rule |
|-------------|----------|------|
| Cores | Tokens (`bg-primary`, `text-muted-foreground`); nunca hex/rgb | `design-system`, `ux-ui-minimalist` |
| HTML manual | Usar Shadcn (`Button`, `Input`, `Card`); nunca `<button>`, `<input>` | `design-system`, `radix` |
| `cn()` | Para merge de classes; nunca concatenação manual | `design-system` |
| `forwardRef` | Em componentes que encapsulam elementos nativos | `design-system` |
| Acessibilidade | Labels em inputs, focus-visible, aria-label em ícones | `design-system` |
| Copy | PT-BR | `language-conventions` |
| Inline styles | Nunca para layout/spacing; usar Tailwind | `react-next-tailwind` |
