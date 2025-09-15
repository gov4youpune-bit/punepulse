-- Check and fix complaints table structure

-- 1) Check if token column exists and has proper constraints
DO $$
BEGIN
  -- Check if token column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'complaints' 
    AND column_name = 'token'
    AND table_schema = 'public'
  ) THEN
    -- Add token column if it doesn't exist
    ALTER TABLE public.complaints ADD COLUMN token TEXT;
  END IF;
  
  -- Check if status column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'complaints' 
    AND column_name = 'status'
    AND table_schema = 'public'
  ) THEN
    -- Add status column if it doesn't exist
    ALTER TABLE public.complaints ADD COLUMN status TEXT DEFAULT 'submitted';
  END IF;
  
  -- Check if urgency column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'complaints' 
    AND column_name = 'urgency'
    AND table_schema = 'public'
  ) THEN
    -- Add urgency column if it doesn't exist
    ALTER TABLE public.complaints ADD COLUMN urgency TEXT DEFAULT 'medium';
  END IF;
END
$$;

-- 2) Create a function to generate tokens if it doesn't exist
CREATE OR REPLACE FUNCTION generate_complaint_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  counter INTEGER := 0;
BEGIN
  LOOP
    -- Generate a token like PMC-123456
    token := 'PMC-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if token already exists
    IF NOT EXISTS (SELECT 1 FROM public.complaints WHERE complaints.token = token) THEN
      RETURN token;
    END IF;
    
    -- Prevent infinite loop
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique token after 100 attempts';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3) Create trigger to auto-generate tokens
CREATE OR REPLACE FUNCTION set_complaint_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token IS NULL OR NEW.token = '' THEN
    NEW.token := generate_complaint_token();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_complaint_token ON public.complaints;

-- Create the trigger
CREATE TRIGGER trigger_set_complaint_token
  BEFORE INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION set_complaint_token();

-- 4) Ensure unique constraint on token
CREATE UNIQUE INDEX IF NOT EXISTS idx_complaints_token ON public.complaints (token);

-- 5) Update any existing complaints that don't have tokens
UPDATE public.complaints 
SET token = generate_complaint_token() 
WHERE token IS NULL OR token = '';

-- 6) Make token column NOT NULL
ALTER TABLE public.complaints ALTER COLUMN token SET NOT NULL;

