-- Bucket profile-logos: public so the URL saved in profiles (logo_url_full, logo_url_short) is publicly accessible.
insert into storage.buckets (id, name, public)
values ('profile-logos', 'profile-logos', true)
on conflict (id) do update set public = true;

-- RLS: only the profile owner (path = profile_id/...) can select, insert, update, delete objects.
create policy "Profile logos select own"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-logos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Profile logos insert own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-logos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Profile logos update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-logos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);

create policy "Profile logos delete own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-logos'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);
