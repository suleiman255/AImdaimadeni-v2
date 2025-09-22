-- Update default currency to TZS for payments table
ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'TZS';

-- Update any existing USD payments to TZS if needed (optional - uncomment if you want to convert existing data)
-- UPDATE public.payments SET currency = 'TZS' WHERE currency = 'USD';
