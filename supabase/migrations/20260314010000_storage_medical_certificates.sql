-- Bucket for medical certificate PDFs (atestados), organized by profile_id.
-- Private bucket: access via signed URLs or RLS; only the profile owner can read/write their folder.

insert into storage.buckets (id, name, public)
values ('medical-certificates', 'medical-certificates', false)
on conflict (id) do update set public = false;

-- RLS: only the profile owner (path = profile_id/...) can select, insert, update, delete objects.
create policy "Medical certificates select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'medical-certificates'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Medical certificates insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'medical-certificates'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Medical certificates update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'medical-certificates'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Medical certificates delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'medical-certificates'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);
