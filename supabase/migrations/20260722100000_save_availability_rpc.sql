-- Salvamento TRANSACIONAL da disponibilidade do médico (CR-02, Fase 6 v2).
--
-- PORQUÊ desta migration:
--   A `saveAvailabilityAction` v2 reconciliava a grade em 3 round-trips
--   independentes (delete+insert de rules → inserts de overrides aditivos →
--   deletes de overrides removidos), SEM transação. Uma falha no meio do fluxo
--   deixava o estado corrompido: a grade recorrente podia ficar zerada (delete
--   feito, insert não) ou os overrides podiam divergir dos rules. Sem atomicidade,
--   o cliente não tinha como saber quanto do batch persistiu.
--
--   Esta função encapsula TODA a reconciliação num único corpo `plpgsql`, que é
--   IMPLICITAMENTE atômico: se qualquer statement falhar (constraint, RLS, etc.),
--   a função inteira faz rollback — nenhuma escrita parcial escapa (CR-02).
--
-- SEGURANÇA:
--   - SECURITY INVOKER: a função roda com as permissões/RLS do chamador
--     (`authenticated`), então as 4 policies owner-scoped de availability_rules e
--     availability_exceptions continuam valendo como defesa-em-profundidade.
--   - Owner-check explícito no topo (defesa redundante contra IDOR, D-13): o
--     p_profile_id precisa pertencer ao auth.uid() corrente. Nunca confiar no
--     cliente — a action stampa profile.id, mas a função re-verifica.
--   - SET search_path = '' + nomes totalmente qualificados (public.*, auth.uid()):
--     evita o advisor `function_search_path_mutable` e sequestro de search_path.
--
-- FORMATO dos parâmetros (espelha o diff validado por Zod em lib/schemas/availability.ts):
--   p_rules            jsonb array de { weekday, start_minute, end_minute, slot_minutes }
--   p_overrides_add    jsonb array de { override_type, exception_date, start_minute,
--                      end_minute, slot_minutes }
--   p_overrides_remove uuid[] de ids de availability_exceptions a remover.

create or replace function public.save_availability(
  p_profile_id uuid,
  p_rules jsonb,
  p_overrides_add jsonb,
  p_overrides_remove uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Owner-check (D-13): o perfil alvo tem de pertencer ao usuário autenticado.
  if not exists (
    select 1
    from public.profiles
    where id = p_profile_id
      and auth_user_id = auth.uid()
  ) then
    raise exception 'Perfil não pertence ao usuário autenticado.'
      using errcode = '42501';
  end if;

  -- (1) SUBSTITUI a grade recorrente completa (delete-then-insert), escopada por
  --     profile_id. Array vazio => grade limpa (delete sem insert).
  delete from public.availability_rules
  where profile_id = p_profile_id;

  if p_rules is not null and jsonb_array_length(p_rules) > 0 then
    insert into public.availability_rules
      (profile_id, weekday, start_minute, end_minute, slot_minutes)
    select
      p_profile_id,
      (r->>'weekday')::smallint,
      (r->>'start_minute')::smallint,
      (r->>'end_minute')::smallint,
      (r->>'slot_minutes')::smallint
    from jsonb_array_elements(p_rules) as r;
  end if;

  -- (2) Remove os overrides marcados, escopados por AMBOS profile_id + id (backstop
  --     de ownership contra IDOR). Idempotente: id inexistente/de outro dono é no-op.
  if p_overrides_remove is not null and array_length(p_overrides_remove, 1) is not null then
    delete from public.availability_exceptions
    where profile_id = p_profile_id
      and id = any (p_overrides_remove);
  end if;

  -- (3) Insere os overrides adicionados, stampando profile_id server-side. Aditivos
  --     carregam slot_minutes próprio; subtrativos deixam slot_minutes null.
  if p_overrides_add is not null and jsonb_array_length(p_overrides_add) > 0 then
    insert into public.availability_exceptions
      (profile_id, override_type, exception_date, start_minute, end_minute, slot_minutes)
    select
      p_profile_id,
      o->>'override_type',
      (o->>'exception_date')::date,
      nullif(o->>'start_minute', '')::smallint,
      nullif(o->>'end_minute', '')::smallint,
      nullif(o->>'slot_minutes', '')::smallint
    from jsonb_array_elements(p_overrides_add) as o;
  end if;
end;
$$;

comment on function public.save_availability(uuid, jsonb, jsonb, uuid[]) is
  'Salva em lote e ATOMICAMENTE a disponibilidade do médico (CR-02): substitui a grade recorrente, remove overrides marcados e insere overrides novos num único corpo plpgsql transacional. SECURITY INVOKER (RLS owner-scoped aplica) + owner-check explícito por auth.uid() (D-13).';

-- Só `authenticated` pode chamar (a RLS por dentro ainda restringe as linhas).
revoke all on function public.save_availability(uuid, jsonb, jsonb, uuid[]) from public;
grant execute on function public.save_availability(uuid, jsonb, jsonb, uuid[]) to authenticated;
