-- Add urgency column with default 'medium'
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'medium';

-- Add optional group_name column
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT NULL;

-- Ensure token unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_token ON public.complaints (token);

-- Add check constraint for urgency values
ALTER TABLE public.complaints
  ADD CONSTRAINT IF NOT EXISTS check_urgency_values 
  CHECK (urgency IN ('high', 'medium', 'low'));
