---
phase: quick-260724-ojm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/dashboard/agenda/calendar-editor.tsx
  - components/dashboard/agenda/appointment-detail-menu.tsx
autonomous: true
requirements: [OJM-01]
must_haves:
  truths:
    - "Após criar uma consulta, ela aparece na grade da agenda sem reload manual."
    - "Após uma transição de status, a mudança aparece na grade sem reload manual."
  artifacts:
    - components/dashboard/agenda/calendar-editor.tsx
    - components/dashboard/agenda/appointment-detail-menu.tsx
  key_links:
    - "calendar-editor chama router.refresh() em onCreated e via onChanged do AppointmentDetailMenu"
    - "appointment-detail-menu invoca onChanged?.() no ramo result.ok de runTransition"
---

<objective>
Corrigir a agenda que não atualiza após criar consulta ou mudar status. As server
actions (`createAppointmentAction`, `transitionAppointmentStatusAction`) já funcionam
e chamam `revalidatePath("/dashboard/agenda")`, mas os client components as invocam
com `await` simples — o cache do servidor é invalidado, porém o RSC da página atual
não re-renderiza no cliente. A correção adiciona `router.refresh()` após cada ação.

Purpose: eliminar o reload manual e as linhas duplicadas percebidas pelo médico.
Output: dois client components ajustados (calendar-editor, appointment-detail-menu).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@components/dashboard/agenda/calendar-editor.tsx
@components/dashboard/agenda/appointment-detail-menu.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Disparar router.refresh() após criar consulta e após transição de status</name>
  <files>components/dashboard/agenda/calendar-editor.tsx, components/dashboard/agenda/appointment-detail-menu.tsx</files>
  <action>
Aplicar EXATAMENTE estas mudanças, nada além disso (OJM-01):

Em components/dashboard/agenda/calendar-editor.tsx:
- Adicionar o import do roteador junto aos demais imports do topo: importar `useRouter` de "next/navigation".
- Dentro do componente (o mesmo que renderiza o Sheet de criação e o AppointmentDetailMenu), instanciar o roteador com `useRouter()` numa const `router`.
- Na prop `onCreated` do AgendaSidePanel (atualmente `onCreated={() => setDrawerOpen(false)}`, ~linha 1238): manter o `setDrawerOpen(false)` e, em seguida, chamar `router.refresh()` no mesmo callback.
- No `<AppointmentDetailMenu ... />` (~linha 1246): adicionar a prop `onChanged` cujo callback chama `router.refresh()`. Manter as props existentes (`appointment`, `onOpenChange`) intactas.

Em components/dashboard/agenda/appointment-detail-menu.tsx:
- Adicionar uma prop opcional `onChanged?: () => void` ao tipo de props do componente e desestruturá-la na assinatura (junto de `appointment` e `onOpenChange`).
- Em `runTransition`, dentro do ramo `if (result.ok)`, após `toast.success(...)` e `onOpenChange(false)`, invocar `onChanged?.()`.
- Incluir `onChanged` na lista de dependências do `useCallback` de `runTransition`.

NÃO tocar: as server actions, lib/schemas/appointment.ts, modules/appointments/*,
nenhuma migration nem o banco. Seguir CLAUDE.md: indentação de 2 espaços, aspas
duplas, comentários em PT-BR quando o arquivo já usa. "use client" já presente em
ambos os arquivos.
  </action>
  <verify>
    <automated>yarn typecheck</automated>
  </verify>
  <done>
`yarn typecheck` passa. calendar-editor importa e usa `useRouter`, chama
`router.refresh()` em `onCreated` e passa `onChanged={() => router.refresh()}` ao
AppointmentDetailMenu. appointment-detail-menu aceita a prop `onChanged?: () => void`
e a invoca no ramo `result.ok` de `runTransition`, com `onChanged` nas dependências
do useCallback.
  </done>
</task>

</tasks>

<verification>
- `yarn typecheck` passa sem erros.
- Nenhum arquivo fora dos dois client components foi alterado.
</verification>

<success_criteria>
Criar uma consulta e mudar status refletem imediatamente na grade da agenda sem
reload manual; `yarn typecheck` limpo.
</success_criteria>

<output>
Create `.planning/quick/260724-ojm-corrigir-agenda-n-o-atualizar-ap-s-criar/260724-ojm-SUMMARY.md` when done
</output>
