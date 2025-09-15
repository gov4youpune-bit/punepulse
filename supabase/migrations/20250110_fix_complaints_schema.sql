-- Fix complaints table schema to ensure all required columns exist
-- This migration ensures the complaints table has all necessary columns

-- Add missing columns to complaints table if they don't exist
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assigned_to UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_by UUID DEFAULT NULL;

-- Add check constraints for urgency values
ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS check_urgency_values;

ALTER TABLE public.complaints
  ADD CONSTRAINT check_urgency_values 
  CHECK (urgency IN ('high', 'medium', 'low'));

-- Add check constraints for verification status
ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS check_verification_status;

ALTER TABLE public.complaints
  ADD CONSTRAINT check_verification_status 
  CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_complaints_urgency ON public.complaints(urgency);
CREATE INDEX IF NOT EXISTS idx_complaints_group_name ON public.complaints(group_name);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_verification_status ON public.complaints(verification_status);

-- Update existing complaints to have default urgency if null
UPDATE public.complaints 
SET urgency = 'medium' 
WHERE urgency IS NULL;

-- Ensure all complaints have a token (backup token generation)
DO $$
DECLARE
  complaint_record RECORD;
  new_token TEXT;
BEGIN
  FOR complaint_record IN 
    SELECT id FROM public.complaints WHERE token IS NULL OR token = ''
  LOOP
    -- Generate a unique token
    LOOP
      new_token := 'PMC-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
      IF NOT EXISTS (SELECT 1 FROM public.complaints WHERE token = new_token) THEN
        EXIT;
      END IF;
    END LOOP;
    
    -- Update the complaint with the new token
    UPDATE public.complaints 
    SET token = new_token 
    WHERE id = complaint_record.id;
  END LOOP;
END $$;

-- Drop and recreate the token generation function to avoid conflicts
DROP FUNCTION IF EXISTS generate_complaint_token();

CREATE FUNCTION generate_complaint_token()
RETURNS TEXT AS $$
DECLARE
  new_token TEXT;
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Generate a token like PMC-123456
    new_token := 'PMC-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if token already exists
    IF NOT EXISTS (SELECT 1 FROM public.complaints WHERE token = new_token) THEN
      RETURN new_token;
    END IF;
    
    -- Prevent infinite loop
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique token after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger function to avoid conflicts
DROP FUNCTION IF EXISTS set_complaint_token();

CREATE FUNCTION set_complaint_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token IS NULL OR NEW.token = '' THEN
    NEW.token := generate_complaint_token();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_set_complaint_token ON public.complaints;
CREATE TRIGGER trigger_set_complaint_token
  BEFORE INSERT OR UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION set_complaint_token();
