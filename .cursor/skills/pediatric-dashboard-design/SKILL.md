---
name: pediatric-dashboard-design
description: Expert em design de dashboard pediátrico com foco em UX/UI, modelagem de páginas e padrões visuais. Use ao criar ou alterar páginas do dashboard, componentes feature (PatientCard, CasesTable), forms pediátricos, empty states ou ao falar de layout, hierarquia visual e copy em PT-BR para o contexto pediátrico.
---

# Pediatric Dashboard Design

## Quando usar

Ao criar ou alterar páginas do dashboard, componentes feature (PatientCard, CasesTable), forms pediátricos, empty states, listas de pacientes/casos, ou ao falar de layout, hierarquia visual e copy em PT-BR para o contexto pediátrico.

Rules aplicáveis: `design-system`, `ux-ui-minimalist`, `audience-context`, `forms` (validação técnica).

---

## Princípios

1. **Content-first**: conteúdo em destaque; decoração mínima.
2. **Clareza**: hierarquia visual óbvia; sem elementos competindo por atenção.
3. **Whitespace**: espaço em branco generoso.
4. **Profissional**: ferramenta séria para o pediatra; nunca "brincadeira".
5. **Orientado ao pediatra**: priorizar velocidade em ações frequentes (casos ativos, busca de pacientes).

Referência visual: Vercel/Supabase — fundo limpo, tipografia Geist/Inter, bordas sutis.

---

## Audience e terminologia

| Termo | Significado |
|-------|-------------|
| **Paciente** | Criança sob cuidado do pediatra |
| **Responsável** | Guardião; sempre nome completo (Maria Silva), nunca "mãe" ou "pai" |
| **Caso** | Atendimento por WhatsApp (conversa com responsável) |
| **contact_phone** | Telefone do responsável; obrigatório no contexto pediátrico (emergência) |

Copy em PT-BR; tom profissional e direto.

---

## Anatomia de página

### Template base

```tsx
<div className="flex flex-col gap-6">
  <div>
    <h1 className="text-2xl font-semibold tracking-tight">[Título]</h1>
    <p className="text-sm text-muted-foreground">[Descrição breve]</p>
  </div>
  {/* Conteúdo: cards, tabela, lista, form */}
</div>
```

- **Container**: `flex flex-col gap-6`; página com `max-w-5xl` ou `max-w-6xl` quando necessário.
- **Padding de página**: `p-6` ou `p-8`.
- **Header**: h1 em destaque; descrição em muted; sempre os dois juntos.

### Padrão de header

| Elemento | Classes |
|---------|---------|
| Título (h1) | `text-2xl font-semibold tracking-tight` |
| Descrição | `text-sm text-muted-foreground` |

Exemplo:

```tsx
<h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
<p className="text-sm text-muted-foreground">Gerencie os pacientes cadastrados.</p>
```

---

## Empty states

Padrão: ícone + título + descrição opcional + CTA.

### Estrutura

```tsx
<div className="rounded-xl border border-dashed p-8 text-center">
  {/* ícone sutil (opcional) */}
  <p className="text-muted-foreground font-medium">[Título]</p>
  {description && <p className="text-sm text-muted-foreground mt-1">[Descrição]</p>}
  {action && (
    <div className="mt-4">
      <Button asChild><Link href="...">[CTA]</Link></Button>
    </div>
  )}
</div>
```

### Copy por domínio

| Domínio | Título | CTA sugerido |
|---------|--------|--------------|
| Pacientes | Nenhum paciente cadastrado. | Cadastrar paciente |
| Casos | Nenhum caso ativo. | — (casos vêm do WhatsApp) |
| Relatórios | Nenhum relatório disponível. | Gerar relatório |
| Busca vazia | Nenhum resultado encontrado. | Limpar filtros |

---

## Componentes feature

### PatientCard

Exibir em listagens ou buscas. Hierarquia visual:

1. **Nome do paciente** (child) — `font-medium` ou `font-semibold`
2. **Responsável** — `text-sm text-muted-foreground`
3. **contact_phone** — visível e clicável (link tel: ou copy); essencial em pediatria
4. **Dados clínicos** (opcional): birth_date, sex, allergies — `text-sm` se houver espaço

Schema patients: `name`, `birth_date`, `responsible`, `contact_phone`, `sex`, `allergies`, etc.

```tsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-base">{patient.name}</CardTitle>
    <CardDescription>{patient.responsible}</CardDescription>
  </CardHeader>
  <CardContent className="text-sm text-muted-foreground">
    {patient.contact_phone && <span>{formatPhone(patient.contact_phone)}</span>}
  </CardContent>
</Card>
```

### CasesTable (lista em `/dashboard/cases`)

Prioridade: casos ativos primeiro; acesso rápido ao detalhe do caso (linha ou botão Abrir caso).

1. **Identificação**: telefone ou nome do responsável
2. **Status**: `active` | `closed` — Badge ou texto
3. **started_at** — data/hora formatada
4. **patient_id** — se associado, mostrar nome do paciente; senão "Sem paciente associado"

Schema cases: `status`, `started_at`, `ended_at`, `patient_id`, `awaiting_intent`, `awaiting_patient_choice`.

```tsx
// Exemplo de linha em lista
<div className="flex items-center justify-between py-3">
  <div>
    <p className="font-medium">{case.contactPhoneOrResponsible}</p>
    <p className="text-sm text-muted-foreground">{formatDate(case.startedAt)}</p>
  </div>
  <Badge variant={case.status === 'active' ? 'default' : 'secondary'}>
    {case.status === 'active' ? 'Ativo' : 'Encerrado'}
  </Badge>
</div>
```

---

## Forms pediátricos

### PatientForm – campos essenciais

| Campo | Obrigatório | Validação | Placeholder/Label |
|-------|-------------|-----------|-------------------|
| name | Sim | min 2 caracteres | Nome do paciente |
| responsible | Sim | nome completo; não aceitar "mãe", "pai", etc. | Nome completo do responsável |
| contact_phone | Sim | min 10 dígitos | Telefone de contato |
| birth_date | Não | date válida | Data de nascimento |

Campos opcionais (schema): `sex`, `legal_guardian`, `blood_type`, `weight`, `height`, `head_circumference`, `allergies`, `current_medications`, `medical_history`.

### Layout do form

- Usar `Field` + `FieldLabel` + `Input`/`PhoneInput` (de `components/ui/field.tsx`)
- Labels acima do input; placeholders discretos
- Botão primário: "Salvar" ou "Cadastrar"; estado `Salvando...` durante submit
- Erros: `text-destructive text-sm` abaixo do campo
- Regra `forms`: react-hook-form, Zod, zodResolver; mensagens de validação em PT-BR

---

## Data display

### Tabelas

- Bordes discretas ou dividers
- Cabeçalho: `font-medium text-muted-foreground` ou `text-sm`
- Células: `px-4 py-3`
- Linhas alternadas sutis: `even:bg-muted/50` (opcional)
- Empty state quando não houver dados

### Listas vs cards

- **Lista**: muitos itens, busca/filtro; layout compacto
- **Cards**: menos itens, mais destaque por item; grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

## Sidebar e navegação

Itens padrão: Início, Casos, Pacientes, Perfil.

- Estado ativo: `bg-muted` ou `bg-primary/10` + `text-primary`
- Prioridade de fluxo: Casos (atendimentos) e Pacientes são centrais
- Sidebar compacta: ícones + labels; tooltip se colapsada

---

## Design tokens

Sempre usar tokens; nunca hex ou rgb em componentes.

| Uso | Token / classe |
|-----|----------------|
| Background | `bg-background` |
| Texto principal | `text-foreground` |
| Texto secundário | `text-muted-foreground` |
| Ação primária | `bg-primary text-primary-foreground` |
| Erro | `text-destructive` |
| Bordas | `border-border` |
| Cards | `bg-card text-card-foreground` |

Spacing: `p-2`, `p-4`, `p-6`, `gap-4`, `space-y-4`. Cards: `p-4` ou `p-6`.

---

## Copy (PT-BR) – referência rápida

| Tela/contexto | Título | Descrição | Botão/Ação |
|---------------|--------|-----------|------------|
| Pacientes | Pacientes | Gerencie os pacientes cadastrados. | Cadastrar paciente |
| Casos | Casos | Gerencie seus atendimentos por WhatsApp. | — |
| Perfil | Perfil | Gerencie suas informações de conta. | Salvar alterações |
| Dashboard | Dashboard | Bem-vindo ao FALAPED. Gerencie seus casos e pacientes. | — |
| Associar paciente | Associar paciente ao caso | Vincule um paciente cadastrado a este atendimento. | Associar |
| Relatório | Relatório | Relatório disponível para download. | Baixar PDF |
| Empty pacientes | Nenhum paciente cadastrado. | Cadastre o primeiro paciente para começar. | Cadastrar paciente |
| Empty casos | Nenhum caso ativo. | Os atendimentos aparecem aqui quando iniciados pelo WhatsApp. | — |

Tom: claro, profissional, orientado à ação quando há CTA.

---

## Loading e feedback

- **Loading**: Skeleton (Shadcn) ou spinner pequeno; evitar bloquear tela inteira
- **Success**: toast discreto ou feedback inline breve
- **Erro**: mensagem clara + ação de retry quando aplicável
- **Hover/focus**: `transition-colors`; `focus-visible:ring-2`

---

## Checklist antes de entregar

- [ ] Página segue anatomia (header h1 + descrição + conteúdo)
- [ ] Tokens de cor; sem hex/rgb
- [ ] Empty state com copy apropriado; CTA quando fizer sentido
- [ ] PatientCard/CasesTable: contact_phone e responsible visíveis quando aplicável
- [ ] Form: responsible e contact_phone com validações; copy PT-BR
- [ ] Hierarquia tipográfica consistente (text-2xl, text-sm, text-muted-foreground)
- [ ] Espaço em branco adequado; sem poluição visual
- [ ] Acessibilidade: labels em inputs; focus-visible; semântica correta

---

## Referências

- Rules: `design-system`, `ux-ui-minimalist`, `audience-context`, `forms`
- Skill: `dashboard-falaped` (estrutura de pastas, rotas)
- Schema: `supabase-falaped/schema.md` (patients, cases)
- Exemplos expandidos: [reference.md](reference.md)
