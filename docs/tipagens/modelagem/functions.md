# Functions (public)

Funções PostgreSQL no schema `public`. Usadas por triggers ou por migrations (auth).

---

## set_updated_at()

- **Retorno:** trigger
- **Uso:** trigger BEFORE UPDATE em profiles (trg_profiles_set_updated_at)

Atribui `new.updated_at = now()` e retorna new.

---

## sync_linked_phone_status_on_phone_link_codes()

- **Retorno:** trigger
- **Segurança:** SECURITY DEFINER, search_path = 'public'
- **Uso:** trigger AFTER UPDATE em phone_link_codes (trigger_sync_linked_phone_status)

Se `new.used_at` e `new.linked_phone` estão preenchidos, atualiza `authenticated_users` para o phone = new.linked_phone: `linked_phone_status = true`, `whatsapp_linked_at = now()`.

---

## handle_new_auth_user()

- **Retorno:** trigger
- **Segurança:** SECURITY DEFINER, search_path = ''
- **Uso:** trigger em **auth.users** (AFTER INSERT) — criação de perfil e authenticated_users no signup

Lê `raw_user_meta_data->>'phone'` e `full_name` do new user; cria linha em `public.profiles` e em `public.authenticated_users` (status 'unpaid'). Só age se phone não for vazio.

---

## handle_auth_user_deleted()

- **Retorno:** trigger
- **Segurança:** SECURITY DEFINER, search_path = ''
- **Uso:** trigger em **auth.users** (on delete) — cascade de limpeza ao excluir usuário

Ordem de exclusão/atualização:
1. phone_link_codes (onde profile_id do auth user)
2. cases (user_phone do profile)
3. patients (user_phone do profile)
4. incoming_webhook_events (phone do profile)
5. trigger_buffer_runs (phone do profile)
6. authenticated_users (profile_id do profile)
7. profiles.report_template_id = null
8. report_templates (user_phone do profile — templates do usuário)
9. profiles (auth_user_id = old.id)

Return old.

---

## set_updated_at_medical_certificates()

- **Retorno:** trigger
- **Uso:** trigger BEFORE UPDATE em medical_certificates (trg_medical_certificates_set_updated_at)

Atribui `new.updated_at = now()` e retorna new.

---

## set_updated_at_prescriptions()

- **Retorno:** trigger
- **Uso:** trigger BEFORE UPDATE em prescriptions (trg_prescriptions_set_updated_at)

Atribui `new.updated_at = now()` e retorna new.

---

## set_updated_at_prescription_templates()

- **Retorno:** trigger
- **Uso:** trigger BEFORE UPDATE em prescription_templates (trg_prescription_templates_set_updated_at)

Atribui `new.updated_at = now()` e retorna new.
