-- Comprehensive Schema Fix Migration
-- This migration fixes all identified schema issues and ensures consistency

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Create/Fix complaints table with all required columns
CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token varchar(64) UNIQUE NOT NULL,
  category text NOT NULL,
  subtype text,
  description text,
  location_point geography(Point,4326),
  location_text text,
  attachments jsonb DEFAULT '[]',
  email text,
  status text DEFAULT 'submitted',
  source text DEFAULT 'web',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  submitted_to_portal jsonb DEFAULT '{}',
  ward_number integer,
  urgency text DEFAULT 'medium',
  portal_text text,
  summary_en text,
  summary_mr text,
  classification_confidence real DEFAULT 0.0,
  -- Worker assignment fields
  assigned_to uuid DEFAULT NULL,
  assigned_at timestamptz DEFAULT NULL,
  verification_status text DEFAULT 'none',
  verified_at timestamptz DEFAULT NULL,
  verified_by uuid DEFAULT NULL,
  group_name text DEFAULT NULL
);

-- Add missing columns to existing complaints table if they don't exist
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS assigned_to uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verified_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS group_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS ward_number integer,
  ADD COLUMN IF NOT EXISTS portal_text text,
  ADD COLUMN IF NOT EXISTS summary_en text,
  ADD COLUMN IF NOT EXISTS summary_mr text,
  ADD COLUMN IF NOT EXISTS classification_confidence real DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS submitted_to_portal jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'web';

-- 2. Create/Fix workers table with correct column names
CREATE TABLE IF NOT EXISTS public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, -- Will add foreign key constraint later
  display_name text NOT NULL, -- This is the key fix - API expects display_name
  name text NOT NULL, -- Keep both for compatibility
  email text NOT NULL,
  phone text,
  department text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fix existing workers table if it has wrong column names
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update display_name from name if display_name is null
UPDATE public.workers 
SET display_name = name 
WHERE display_name IS NULL AND name IS NOT NULL;

-- Make display_name NOT NULL after populating it
ALTER TABLE public.workers ALTER COLUMN display_name SET NOT NULL;


-- 3. Create/Fix complaint_assignments table
CREATE TABLE IF NOT EXISTS public.complaint_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.workers(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create/Fix worker_reports table
CREATE TABLE IF NOT EXISTS public.worker_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES public.workers(id) ON DELETE CASCADE,
  comments text,
  photos text[], -- Array of storage keys
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Create/Fix attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE CASCADE,
  bucket text NOT NULL,
  path text NOT NULL,
  filename text NOT NULL,
  content_type text,
  file_size integer,
  uploaded_at timestamptz DEFAULT now()
);

-- 6. Create/Fix audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id uuid REFERENCES public.complaints(id),
  actor text,
  action text NOT NULL,
  payload jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- 7. Create/Fix admin_profiles table
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'operator',
  ward_assignments integer[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- 9. Add check constraints
ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS check_urgency_values;

ALTER TABLE public.complaints
  ADD CONSTRAINT check_urgency_values 
  CHECK (urgency IN ('high', 'medium', 'low'));

ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS check_verification_status;

ALTER TABLE public.complaints
  ADD CONSTRAINT check_verification_status 
  CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected'));

-- 10. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_complaints_location ON public.complaints USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON public.complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_token ON public.complaints(token);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON public.complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_ward ON public.complaints(ward_number);
CREATE INDEX IF NOT EXISTS idx_complaints_urgency ON public.complaints(urgency);
CREATE INDEX IF NOT EXISTS idx_complaints_group_name ON public.complaints(group_name);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_verification_status ON public.complaints(verification_status);

CREATE INDEX IF NOT EXISTS idx_attachments_complaint ON public.attachments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_complaint ON public.audit_logs(complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_complaint_assignments_complaint_id ON public.complaint_assignments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_assigned_to ON public.complaint_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_worker_reports_complaint_id ON public.worker_reports(complaint_id);
CREATE INDEX IF NOT EXISTS idx_worker_reports_worker_id ON public.worker_reports(worker_id);

-- 11. Enable Row Level Security
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for complaints
DROP POLICY IF EXISTS "Anyone can submit complaints" ON public.complaints;
CREATE POLICY "Anyone can submit complaints"
  ON public.complaints
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read complaints by token" ON public.complaints;
CREATE POLICY "Anyone can read complaints by token"
  ON public.complaints
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage all complaints" ON public.complaints;
CREATE POLICY "Admins can manage all complaints"
  ON public.complaints
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 13. Create RLS policies for workers
DROP POLICY IF EXISTS "Workers can view their own record" ON public.workers;
CREATE POLICY "Workers can view their own record" ON public.workers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all workers" ON public.workers;
CREATE POLICY "Admins can view all workers" ON public.workers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage workers" ON public.workers;
CREATE POLICY "Admins can manage workers" ON public.workers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 14. Create RLS policies for complaint_assignments
DROP POLICY IF EXISTS "Workers can view their assignments" ON public.complaint_assignments;
CREATE POLICY "Workers can view their assignments" ON public.complaint_assignments
  FOR SELECT USING (
    assigned_to IN (
      SELECT id FROM public.workers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all assignments" ON public.complaint_assignments;
CREATE POLICY "Admins can view all assignments" ON public.complaint_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage assignments" ON public.complaint_assignments;
CREATE POLICY "Admins can manage assignments" ON public.complaint_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 15. Create RLS policies for worker_reports
DROP POLICY IF EXISTS "Workers can view their reports" ON public.worker_reports;
CREATE POLICY "Workers can view their reports" ON public.worker_reports
  FOR SELECT USING (
    worker_id IN (
      SELECT id FROM public.workers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workers can create reports" ON public.worker_reports;
CREATE POLICY "Workers can create reports" ON public.worker_reports
  FOR INSERT WITH CHECK (
    worker_id IN (
      SELECT id FROM public.workers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all reports" ON public.worker_reports;
CREATE POLICY "Admins can view all reports" ON public.worker_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage reports" ON public.worker_reports;
CREATE POLICY "Admins can manage reports" ON public.worker_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 16. Create RLS policies for attachments
DROP POLICY IF EXISTS "Anyone can upload attachments" ON public.attachments;
CREATE POLICY "Anyone can upload attachments"
  ON public.attachments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read attachments" ON public.attachments;
CREATE POLICY "Anyone can read attachments"
  ON public.attachments
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage attachments" ON public.attachments;
CREATE POLICY "Admins can manage attachments"
  ON public.attachments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 17. Create RLS policies for audit_logs
DROP POLICY IF EXISTS "Only admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Only admins can create audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can create audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 18. Create RLS policies for admin_profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.admin_profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can update own profile" ON public.admin_profiles;
CREATE POLICY "Admins can update own profile"
  ON public.admin_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- 19. Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complaint-attachments', 'complaint-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 20. Storage policies
DROP POLICY IF EXISTS "Anyone can upload complaint attachments" ON storage.objects;
CREATE POLICY "Anyone can upload complaint attachments"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'complaint-attachments');

DROP POLICY IF EXISTS "Anyone can read complaint attachments" ON storage.objects;
CREATE POLICY "Anyone can read complaint attachments"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'complaint-attachments');

DROP POLICY IF EXISTS "Admins can delete complaint attachments" ON storage.objects;
CREATE POLICY "Admins can delete complaint attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'complaint-attachments' AND
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- 21. Functions for token generation
DROP FUNCTION IF EXISTS generate_complaint_token();
CREATE OR REPLACE FUNCTION generate_complaint_token()
RETURNS text AS $$
DECLARE
  token_prefix text := 'PMC-';
  token_suffix text;
  full_token text;
  token_exists boolean;
BEGIN
  LOOP
    -- Generate 6-digit random number
    token_suffix := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
    full_token := token_prefix || token_suffix;
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM public.complaints WHERE token = full_token) INTO token_exists;
    
    -- If token doesn't exist, break the loop
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN full_token;
END;
$$ LANGUAGE plpgsql;

-- 22. Trigger to auto-generate tokens
-- Drop trigger first, then function
DROP TRIGGER IF EXISTS trigger_set_complaint_token ON public.complaints;
DROP FUNCTION IF EXISTS set_complaint_token();

CREATE OR REPLACE FUNCTION set_complaint_token()
RETURNS trigger AS $$
BEGIN
  IF NEW.token IS NULL OR NEW.token = '' THEN
    NEW.token := generate_complaint_token();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_complaint_token
  BEFORE INSERT OR UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION set_complaint_token();

-- 23. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 24. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_workers_updated_at ON public.workers;
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_complaint_assignments_updated_at ON public.complaint_assignments;
CREATE TRIGGER update_complaint_assignments_updated_at BEFORE UPDATE ON public.complaint_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_worker_reports_updated_at ON public.worker_reports;
CREATE TRIGGER update_worker_reports_updated_at BEFORE UPDATE ON public.worker_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_complaints_updated_at ON public.complaints;
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 25. Function to create audit log entry
DROP FUNCTION IF EXISTS create_audit_log(uuid, text, text, jsonb, inet, text);
CREATE OR REPLACE FUNCTION create_audit_log(
  p_complaint_id uuid,
  p_actor text,
  p_action text,
  p_payload jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    complaint_id, 
    actor, 
    action, 
    payload, 
    ip_address, 
    user_agent
  )
  VALUES (
    p_complaint_id,
    p_actor,
    p_action,
    p_payload,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 26. Update existing complaints to have default urgency if null
UPDATE public.complaints 
SET urgency = 'medium' 
WHERE urgency IS NULL;

-- 27. Ensure all complaints have a token (backup token generation)
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

-- 28. Make token column NOT NULL
ALTER TABLE public.complaints ALTER COLUMN token SET NOT NULL;

-- 29. Insert sample admin profiles for testing (only if auth users exist)
DO $$
BEGIN
  -- Only insert admin profiles if the corresponding auth users exist
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001'::uuid) THEN
    INSERT INTO public.admin_profiles (id, email, full_name, role, ward_assignments, is_active)
    VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@punepulse.dev', 'System Administrator', 'admin', ARRAY[1,2,3,4,5], true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000002'::uuid) THEN
    INSERT INTO public.admin_profiles (id, email, full_name, role, ward_assignments, is_active)
    VALUES ('00000000-0000-0000-0000-000000000002'::uuid, 'operator@punepulse.dev', 'Ward Operator', 'operator', ARRAY[1,2], true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 30. Insert sample workers for testing (only if auth users exist)
DO $$
BEGIN
  -- Only insert workers if the corresponding auth users exist
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001'::uuid) THEN
    INSERT INTO public.workers (user_id, display_name, name, email, phone, department, is_active) 
    VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'John Doe', 'John Doe', 'john.doe@punepulse.dev', '+91-9876543210', 'Roads Department', true)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000002'::uuid) THEN
    INSERT INTO public.workers (user_id, display_name, name, email, phone, department, is_active) 
    VALUES ('00000000-0000-0000-0000-000000000002'::uuid, 'Jane Smith', 'Jane Smith', 'jane.smith@punepulse.dev', '+91-9876543211', 'Water Department', true)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000003'::uuid) THEN
    INSERT INTO public.workers (user_id, display_name, name, email, phone, department, is_active) 
    VALUES ('00000000-0000-0000-0000-000000000003'::uuid, 'Mike Johnson', 'Mike Johnson', 'mike.johnson@punepulse.dev', '+91-9876543212', 'Urban Development', true)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

-- 31. Add foreign key constraints (at the very end after all tables and data are ready)
DO $$
BEGIN
  -- Add user_id foreign key constraint to workers table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_workers_user_id' 
    AND table_name = 'workers' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.workers
      ADD CONSTRAINT fk_workers_user_id 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add assigned_to foreign key constraint to complaints table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_complaints_assigned_to' 
    AND table_name = 'complaints' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.complaints
      ADD CONSTRAINT fk_complaints_assigned_to 
      FOREIGN KEY (assigned_to) REFERENCES public.workers(id) ON DELETE SET NULL;
  END IF;

  -- Add verified_by foreign key constraint to complaints table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_complaints_verified_by' 
    AND table_name = 'complaints' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.complaints
      ADD CONSTRAINT fk_complaints_verified_by 
      FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
