-- Enable Row Level Security and create policies so users can only access their own profile

-- Enable RLS on profiles table
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own profile
CREATE POLICY IF NOT EXISTS "Profiles select own" ON public.profiles
  FOR SELECT
  USING ( auth.uid() = id );

-- Allow users to insert their own profile (they can create row with their id)
CREATE POLICY IF NOT EXISTS "Profiles insert own" ON public.profiles
  FOR INSERT
  WITH CHECK ( auth.uid() = id );

-- Allow users to update their own profile
CREATE POLICY IF NOT EXISTS "Profiles update own" ON public.profiles
  FOR UPDATE
  USING ( auth.uid() = id )
  WITH CHECK ( auth.uid() = id );
