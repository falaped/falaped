# Contrato: vinculação WhatsApp (Dashboard + Bot)

Documento para implementação no **falaped-bot**. O dashboard gera códigos e exibe na UI; o bot valida o código enviado pelo usuário e persiste a vinculação no Supabase.

---

## Tabela `phone_link_codes`

| Coluna      | Tipo        | Descrição                          |
|------------|-------------|------------------------------------|
| `id`       | uuid        | PK                                 |
| `code`     | text        | Código de 6 dígitos (ex.: "482917") |
| `profile_id` | uuid      | FK → profiles(id); conta a vincular |
| `expires_at` | timestamptz | Código válido até este momento     |
| `used_at`  | timestamptz | null = não usado; preenchido ao vincular |

- Índice: `idx_phone_link_codes_code_unused` em `(code)` onde `used_at is null and expires_at > now()`.

---

## Fluxo no bot (ao receber mensagem)

1. Obter **phone** do remetente (número que enviou a mensagem) e **texto** da mensagem.
2. **Se o texto for um código de 6 dígitos** (apenas dígitos, length 6):
   - Query no Supabase:
     - `from('phone_link_codes')`
     - `.eq('code', texto.trim())`
     - `.is('used_at', null)`
     - `.gt('expires_at', new Date().toISOString())` (ou equivalente em SQL: `expires_at > now()`)
     - `.maybeSingle()` ou `.single()`
   - **Se encontrar um registro:**
     - Obter `profile_id` do registro.
     - **Vincular phone ao profile:** upsert em `authenticated_users`:
       - Setar/atualizar `profile_id`, `phone` (número do remetente), `status` (ex.: `'unpaid'`) e **`whatsapp_linked_at` = now()**. O dashboard só exibe "Conta vinculada" quando `whatsapp_linked_at` está preenchido.
       - Se já existir linha com esse `phone`: atualizar `profile_id`, `whatsapp_linked_at`.
       - Se não existir: inserir `(id, profile_id, phone, status, whatsapp_linked_at)`.
     - Marcar o código como usado: `update('phone_link_codes').eq('id', row.id).set({ used_at: new Date().toISOString() })`.
     - Responder ao usuário: ex. "WhatsApp vinculado com sucesso."
   - **Se não encontrar:** responder: "Código inválido ou expirado."
3. **Se o texto não for código de 6 dígitos:** seguir o fluxo normal da conversa (ex.: validar phone em `authenticated_users`, checar status paid/unpaid/blocked, etc.).

---

## Validação em toda mensagem (já existente no bot)

Após a vinculação, o bot continua validando da mesma forma:

- Consultar `authenticated_users` por **phone**.
- Se não encontrar → tratar como não cadastrado (ex.: pedir cadastro/contato).
- Se encontrar → ler **status**: `paid` = segue fluxo; `unpaid` ou `blocked` = mensagem de pagamento/contato.

---

## Resumo para o bot

| Ação              | Onde              | Detalhe                                                                 |
|-------------------|-------------------|-------------------------------------------------------------------------|
| Buscar código     | `phone_link_codes` | code = texto, used_at is null, expires_at > now()                      |
| Vincular          | `authenticated_users` | Upsert por phone; setar profile_id, phone, status e **whatsapp_linked_at = now()** |
| Marcar código usado | `phone_link_codes` | used_at = now() no registro encontrado                                  |

---

*Documento alinhado ao [relatório de autenticação](relatorio-autenticacao-dashboard-bot.md) e à Fase 3 do plano de implementação.*
