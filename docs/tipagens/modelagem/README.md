# Modelagem do banco de dados (Supabase / PostgreSQL)

Documentação da tipagem e modelagem do banco **public** do projeto FALAPED. Gerada/validada com base no Supabase (MCP). Use estes arquivos como referência para implementações e para validar alterações de schema.

## Índice

### Tabelas (uma por arquivo)

| Tabela | Arquivo |
|--------|---------|
| authenticated_users | [authenticated_users.md](./authenticated_users.md) |
| profiles | [profiles.md](./profiles.md) |
| cases | [cases.md](./cases.md) |
| case_messages | [case_messages.md](./case_messages.md) |
| discussions | [discussions.md](./discussions.md) |
| discussion_messages | [discussion_messages.md](./discussion_messages.md) |
| case_reports | [case_reports.md](./case_reports.md) |
| patients | [patients.md](./patients.md) |
| report_templates | [report_templates.md](./report_templates.md) |
| phone_link_codes | [phone_link_codes.md](./phone_link_codes.md) |
| incoming_webhook_events | [incoming_webhook_events.md](./incoming_webhook_events.md) |
| leads | [leads.md](./leads.md) |
| trigger_buffer_runs | [trigger_buffer_runs.md](./trigger_buffer_runs.md) |

### Outros

- **Enums:** [enums.md](./enums.md) — tipos enum (ex.: case_report_source)
- **Triggers:** [triggers.md](./triggers.md) — triggers por tabela
- **Functions:** [functions.md](./functions.md) — funções PL/pgSQL usadas por triggers ou auth

## Atualização

Ao alterar o schema (migrations, novos enums, triggers ou functions), atualize o arquivo correspondente nesta pasta e, se necessário, o índice acima. O agente deve usar esta documentação para validar implementações e novas features.
