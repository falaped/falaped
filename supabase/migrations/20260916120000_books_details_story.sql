-- books.falaped.com.br — história personalizada (issue #30).
-- details: entrada do formulário (animal de estimação, familiares, brinquedo, texto livre).
-- story: as 17 páginas finais (texto PT, cena EN, painel, refs) e o elenco extra com
-- descrição visual fixa, geradas pelo modelo de texto e revisadas pelo usuário antes
-- de criar o livro. Null = usa o texto do tema como está.
alter table public.books
  add column details jsonb,
  add column story jsonb;
