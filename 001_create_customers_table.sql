-- Create customers table to store customer information
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  source TEXT, -- 'csv', 'ocr', 'voice', 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "customers_select_own" ON public.customers 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "customers_insert_own" ON public.customers 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "customers_update_own" ON public.customers 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "customers_delete_own" ON public.customers 
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers(email);
