-- "Receba em PDF" nas ferramentas da landing grava o lead com a origem
-- `ferramenta:<slug>` (ex.: ferramenta:curva-de-crescimento-oms).
drop policy "lp_leads anon insert" on public.lp_leads;
create policy "lp_leads anon insert" on public.lp_leads
  for insert to anon
  with check (
    (source in ('beta_signup', 'demo_booking', 'final_cta') or source ~ '^ferramenta:[a-z0-9-]{1,60}$')
    and length(name) between 1 and 200
    and length(email) between 3 and 320
    and (whatsapp is null or length(whatsapp) <= 40)
  );
