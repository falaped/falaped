# Plano: Templates de Receita e novos campos

## Migrations (aplicar via MCP Supabase)

Serão necessárias **duas migrations**, aplicadas com o MCP **user-supabase-falaped**, ferramenta `apply_migration` (parâmetros: `name` em snake_case e `query` com o SQL).

---

### Migration 1: Novos campos na tabela `prescriptions`

**Nome sugerido:** `prescriptions_add_orientations_warning_signs_additional_notes`

Adicionar três colunas (text, nullable) para os novos campos da receita:

- `orientations` — Orientações
- `warning_signs` — Sinais de Alerta  
- `additional_notes` — Anotações Adicionais

**Query:**

```sql
alter table public.prescriptions
  add column if not exists orientations text null,
  add column if not exists warning_signs text null,
  add column if not exists additional_notes text null;

comment on column public.prescriptions.orientations is 'Orientações gerais da receita';
comment on column public.prescriptions.warning_signs is 'Sinais de alerta para o paciente/responsável';
comment on column public.prescriptions.additional_notes is 'Anotações adicionais do médico';
```

**Impacto no código:**

- `insert-prescription.ts`: incluir os três campos no insert (a partir do payload ou parâmetros).
- `generate-prescription` action: ler do payload do schema e repassar para insert.
- Schema Zod e tipos: payload pode manter os campos para o formulário; na persistência mapear para as colunas (ou enviar também nas colunas).
- Preview/PDF: ler de `payload` ou das colunas conforme decisão (se ler do payload, o action precisa gravar também nas colunas a partir do mesmo valor).

---

### Migration 2: Tabela `prescription_templates`

**Nome sugerido:** `create_prescription_templates`

Criar tabela de templates de receita por perfil:

**Query:**

```sql
create table public.prescription_templates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_prescription_templates_profile_id on public.prescription_templates (profile_id);

comment on table public.prescription_templates is 'Templates de receita salvos pelo médico. snapshot: medications, orientations, warning_signs, additional_notes, location_state.';

create or replace function public.set_updated_at_prescription_templates()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_prescription_templates_set_updated_at
  before update on public.prescription_templates
  for each row
  execute function public.set_updated_at_prescription_templates();
```

---

## Como aplicar com o MCP

1. Usar o servidor MCP **user-supabase-falaped**.
2. Chamar a ferramenta **apply_migration** com:
   - `name`: nome em snake_case (ex.: `prescriptions_add_orientations_warning_signs_additional_notes`, `create_prescription_templates`).
   - `query`: o bloco SQL correspondente acima.

Após aplicar, criar também os arquivos de migration locais em `supabase/migrations/` com o mesmo SQL (para manter o histórico do projeto), por exemplo:

- `supabase/migrations/YYYYMMDDHHMMSS_prescriptions_add_orientations_warning_signs_additional_notes.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_create_prescription_templates.sql`

---

## Resumo do plano (demais pontos)

- **Formulário:** wizard de receita com os três campos (Orientações, Sinais de Alerta, Anotações Adicionais) e opção “Salvar como template”.
- **Persistência receita:** além do payload (medicamentos etc.), preencher as colunas `orientations`, `warning_signs`, `additional_notes` na tabela `prescriptions`.
- **Templates:** tabela `prescription_templates` com `snapshot` (jsonb) contendo medications, orientations, warning_signs, additional_notes, location_state.
- **Telas:** listagem de Templates de Receita em `/dashboard/prescription-templates` (mesmo padrão da tela de Templates de Relatório); usar template ao criar nova receita (query `templateId` ou opção no passo 1).
- **Sidebar:** item “Templates de receita” no menu Templates.
