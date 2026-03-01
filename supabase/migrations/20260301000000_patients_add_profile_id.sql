-- Associate patients with the doctor by profile_id (dashboard). user_phone kept for bot compatibility.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.patients
  ALTER COLUMN user_phone DROP NOT NULL;

COMMENT ON COLUMN public.patients.profile_id IS 'Profile (doctor) that owns this patient.';

CREATE INDEX IF NOT EXISTS idx_patients_profile_id
  ON public.patients(profile_id);
