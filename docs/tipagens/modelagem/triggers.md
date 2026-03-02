# Triggers (public)

Triggers no schema `public`. Funções executadas estão em [functions.md](./functions.md).

---

## trg_profiles_set_updated_at

| Tabela | Evento | Função |
|--------|--------|--------|
| profiles | BEFORE UPDATE | set_updated_at() |

**Definição:** `CREATE TRIGGER trg_profiles_set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at()`

Atualiza `updated_at` com `now()` antes de qualquer UPDATE em profiles.

---

## trigger_sync_linked_phone_status

| Tabela | Evento | Função |
|--------|--------|--------|
| phone_link_codes | AFTER UPDATE | sync_linked_phone_status_on_phone_link_codes() |

**Definição:** `CREATE TRIGGER trigger_sync_linked_phone_status AFTER UPDATE ON phone_link_codes FOR EACH ROW EXECUTE FUNCTION sync_linked_phone_status_on_phone_link_codes()`

Quando um código é usado (used_at e linked_phone preenchidos), atualiza authenticated_users: linked_phone_status = true, whatsapp_linked_at = now().
