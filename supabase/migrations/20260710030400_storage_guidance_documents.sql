-- Bucket for guidance document PDFs (orientações), organized by profile_id.
-- Private bucket: access via signed URLs or RLS; only the profile owner can read/write their folder.

insert into storage.buckets (id, name, public)
values ('guidance', 'guidance', false)
on conflict (id) do update set public = false;

create policy "Guidance documents select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'guidance'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Guidance documents insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'guidance'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Guidance documents update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'guidance'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Guidance documents delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'guidance'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);
