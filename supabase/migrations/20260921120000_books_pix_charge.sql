-- Cobrança Pix (Asaas) por livro da landing. O QR é estático com valor fixo e
-- uso único: quando alguém paga, a Asaas cria a cobrança e o webhook liga o
-- pagamento ao livro por `pix_qr_code_id`.
alter table public.books
  add column if not exists pix_qr_code_id text,
  add column if not exists pix_payload text,
  add column if not exists pix_expires_at timestamptz,
  add column if not exists paid_at timestamptz;

comment on column public.books.pix_qr_code_id is 'Id do QR Code Pix estático na Asaas; liga o webhook de pagamento a este livro.';
comment on column public.books.pix_payload is 'Copia e cola do Pix, guardado para reexibir sem chamar a Asaas de novo.';
comment on column public.books.pix_expires_at is 'Expiração do QR. Passou disso, o checkout gera outro.';
comment on column public.books.paid_at is 'Quando o Pix foi confirmado pela Asaas. Nunca setado pelo cliente.';

create unique index if not exists books_pix_qr_code_id_key
  on public.books (pix_qr_code_id)
  where pix_qr_code_id is not null;
