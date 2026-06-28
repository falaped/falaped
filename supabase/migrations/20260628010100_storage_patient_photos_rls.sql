-- Bucket for patient photos (fotos de crianças), organized by profile_id.
-- Private bucket: access via signed URLs or RLS; only the profile owner can read/write their folder.

insert into storage.buckets (id, name, public)
values ('patient-photos', 'patient-photos', false)
on conflict (id) do update set public = false;

create policy "Patient photos select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'patient-photos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Patient photos insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'patient-photos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Patient photos update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'patient-photos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Patient photos delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'patient-photos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);
