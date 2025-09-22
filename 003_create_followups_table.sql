-- Create follow-ups table to track scheduled follow-ups
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('payment_reminder', 'general_followup', 'overdue_notice')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'completed', 'cancelled')),
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_date TIMESTAMP WITH TIME ZONE,
  message TEXT,
  ai_generated_message TEXT,
  method TEXT CHECK (method IN ('email', 'phone', 'sms')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for followups
CREATE POLICY "followups_select_own" ON public.followups 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "followups_insert_own" ON public.followups 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "followups_update_own" ON public.followups 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "followups_delete_own" ON public.followups 
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS followups_user_id_idx ON public.followups(user_id);
CREATE INDEX IF NOT EXISTS followups_customer_id_idx ON public.followups(customer_id);
CREATE INDEX IF NOT EXISTS followups_scheduled_date_idx ON public.followups(scheduled_date);
CREATE INDEX IF NOT EXISTS followups_status_idx ON public.followups(status);
