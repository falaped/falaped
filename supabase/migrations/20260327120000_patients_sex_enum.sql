-- Canonical patient sex: keys masculino | feminino (labels Masculino | Feminino in UI).

CREATE TYPE public.patient_sex AS ENUM ('masculino', 'feminino');

COMMENT ON TYPE public.patient_sex IS 'Biological sex for pediatric record: masculino (Masculino), feminino (Feminino).';

ALTER TABLE public.patients
  ALTER COLUMN sex TYPE public.patient_sex
  USING (
    CASE
      WHEN sex IS NULL OR btrim(sex) = '' THEN NULL::public.patient_sex
      WHEN lower(btrim(sex)) IN ('m', 'male', 'masculino') THEN 'masculino'::public.patient_sex
      WHEN lower(btrim(sex)) IN ('f', 'female', 'feminino') THEN 'feminino'::public.patient_sex
      WHEN btrim(sex) = 'Masculino' THEN 'masculino'::public.patient_sex
      WHEN btrim(sex) = 'Feminino' THEN 'feminino'::public.patient_sex
      ELSE NULL::public.patient_sex
    END
  );

COMMENT ON COLUMN public.patients.sex IS 'patient_sex enum: masculino | feminino.';
