-- Migration: create profiles table if not exists and add whatsapp fields if missing

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='whatsapp_token'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN whatsapp_token text;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='whatsapp_phone_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN whatsapp_phone_id text;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='whatsapp_business_number'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN whatsapp_business_number text;
  END IF;
END
$$;
