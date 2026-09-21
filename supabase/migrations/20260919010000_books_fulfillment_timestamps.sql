-- Operação dos pedidos da landing (books.falaped.com.br): marcas de quando o
-- comprador foi avisado por e-mail que o livro entrou em produção e de quando o
-- PDF foi enviado no WhatsApp. Por livro (um lead pode ter mais de um), não por lead.
alter table public.books
  add column notified_at timestamptz,
  add column delivered_at timestamptz;
