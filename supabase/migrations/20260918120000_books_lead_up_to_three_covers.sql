-- Landing pública: o lead deixa de ter um único livro e passa a poder criar até
-- 3 capas (uma por tema). O teto de 3 é da aplicação; o banco garante só que o
-- mesmo lead não repete o mesmo tema, que é o aviso mostrado no wizard.
alter table public.books drop constraint books_lead_id_key;

create index books_lead_id_idx on public.books (lead_id) where lead_id is not null;

create unique index books_lead_id_theme_key on public.books (lead_id, theme) where lead_id is not null;
