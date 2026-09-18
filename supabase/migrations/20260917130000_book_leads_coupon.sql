-- Cupom de indicação (10% off) informado pelo lead; códigos válidos vivem em código
-- (modules/books/constants.ts BOOK_COUPONS). Guardado em maiúsculas, já validado.
alter table public.book_leads add column coupon text check (coupon ~ '^[A-Z0-9]{3,30}$');
