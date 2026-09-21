-- A imagem do QR só volta da Asaas na criação. Guardar evita gerar um QR novo
-- (de uso único) toda vez que o comprador recarrega a tela de pagamento.
alter table public.books add column if not exists pix_encoded_image text;
comment on column public.books.pix_encoded_image is 'PNG do QR Pix em base64, sem o prefixo data:.';
