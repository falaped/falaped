# Schema Supabase (banco de dados)

A documentação de **tipagem e modelagem** do banco (tabelas, enums, triggers, functions) está em:

- **[docs/tipagens/modelagem/](tipagens/modelagem/README.md)**

Nessa pasta há um arquivo por tabela, além de `enums.md`, `triggers.md` e `functions.md`. Use como referência para implementações e para validar alterações de schema. Ao criar migrations ou alterar o banco, atualize os arquivos correspondentes em `docs/tipagens/modelagem/`.

Atualização recente relevante: tabela `cases` possui `assistant_turn_queue` (jsonb) para persistir a fila sequencial de intents do assistente no workspace do dashboard.
