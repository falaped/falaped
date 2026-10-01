-- O formulário da landing (falaped-lp) grava em lp_leads com a chave anon.
-- A 20260604000004_rls_auxiliary ligou o RLS sem policy e todo envio passou
-- a falhar com 42501. Libera só INSERT para anon; leitura continua só pela
-- service role (painel admin).

create policy "lp_leads anon insert" on public.lp_leads
  for insert to anon
  with check (
    source in ('beta_signup', 'demo_booking', 'final_cta')
    and length(name) between 1 and 200
    and length(email) between 3 and 320
    and (whatsapp is null or length(whatsapp) <= 40)
  );
