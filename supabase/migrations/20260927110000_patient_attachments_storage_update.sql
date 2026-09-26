-- Mover objeto no storage (leitura de exames → anexos) é UPDATE em
-- storage.objects. Sem esta policy o move devolve "Object not found", porque
-- a RLS esconde a linha em vez de negar. Mesmo escopo das outras: prefixo
-- {profile_id}/ no path.

create policy "Patient attachments storage update own"
on storage.objects for update to authenticated
using (
  bucket_id = 'patient-attachments'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
)
with check (
  bucket_id = 'patient-attachments'
  and (storage.foldername(name))[1] in (
    select id::text from public.profiles where auth_user_id = auth.uid()
  )
);
