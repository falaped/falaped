-- Add optional title to discussions
ALTER TABLE public.discussions ADD COLUMN IF NOT EXISTS title text;
