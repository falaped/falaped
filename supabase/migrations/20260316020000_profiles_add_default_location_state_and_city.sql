alter table public.profiles
  add column if not exists default_location_state text null,
  add column if not exists default_location_city text null;

comment on column public.profiles.default_location_state is 'Estado padrão usado em relatórios, atestados e receitas';
comment on column public.profiles.default_location_city is 'Cidade padrão; exibido com estado como Estado - Cidade';
