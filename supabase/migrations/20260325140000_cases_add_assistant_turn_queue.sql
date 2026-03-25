alter table public.cases
add column if not exists assistant_turn_queue jsonb;
