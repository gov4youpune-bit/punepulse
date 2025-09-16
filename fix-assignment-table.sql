-- Fix complaint_assignments table and add test data
-- Run this in Supabase SQL editor

-- First, add missing columns to complaints table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'assigned_to') THEN
    ALTER TABLE public.complaints ADD COLUMN assigned_to text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'assigned_to_clerk_id') THEN
    ALTER TABLE public.complaints ADD COLUMN assigned_to_clerk_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'assigned_at') THEN
    ALTER TABLE public.complaints ADD COLUMN assigned_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'verification_status') THEN
    ALTER TABLE public.complaints ADD COLUMN verification_status text DEFAULT 'none';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'resolved_by_clerk_id') THEN
    ALTER TABLE public.complaints ADD COLUMN resolved_by_clerk_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'resolved_at') THEN
    ALTER TABLE public.complaints ADD COLUMN resolved_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'resolution_notes') THEN
    ALTER TABLE public.complaints ADD COLUMN resolution_notes text;
  END IF;
END $$;

-- Ensure complaint_assignments table exists with correct structure
CREATE TABLE IF NOT EXISTS public.complaint_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  assigned_to text NOT NULL, -- worker ID
  assigned_to_clerk_id text, -- Clerk user ID
  assigned_by_clerk_id text, -- Admin Clerk user ID
  note text,
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.complaint_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for complaint_assignments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'complaint_assignments' AND policyname = 'Anyone can view assignments') THEN
    CREATE POLICY "Anyone can view assignments" ON public.complaint_assignments
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'complaint_assignments' AND policyname = 'Admins can insert assignments') THEN
    CREATE POLICY "Admins can insert assignments" ON public.complaint_assignments
      FOR INSERT WITH CHECK (true); -- Allow for now, will be restricted later
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'complaint_assignments' AND policyname = 'Admins can update assignments') THEN
    CREATE POLICY "Admins can update assignments" ON public.complaint_assignments
      FOR UPDATE USING (true); -- Allow for now, will be restricted later
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_complaint_id ON public.complaint_assignments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_assigned_to ON public.complaint_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_assigned_to_clerk_id ON public.complaint_assignments(assigned_to_clerk_id);

-- Add indexes for complaints table new columns
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to_clerk_id ON public.complaints(assigned_to_clerk_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_at ON public.complaints(assigned_at);
CREATE INDEX IF NOT EXISTS idx_complaints_verification_status ON public.complaints(verification_status);
CREATE INDEX IF NOT EXISTS idx_complaints_resolved_by_clerk_id ON public.complaints(resolved_by_clerk_id);
CREATE INDEX IF NOT EXISTS idx_complaints_resolved_at ON public.complaints(resolved_at);

-- Add test data to app_users table
INSERT INTO public.app_users (clerk_user_id, email, role, display_name) 
VALUES 
  ('user_32nOkYoKPicRnLva1t7IFDJXud9', 'admin@punepulse.dev', 'admin', 'System Admin'),
  ('hardcoded-clerk-id', 'gov4youpune@gmail.com', 'worker', 'Gov4You Pune Worker')
ON CONFLICT (clerk_user_id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name;

-- Add test data to workers table
INSERT INTO public.workers (id, clerk_user_id, display_name, email, phone, area, is_active) 
VALUES 
  ('hardcoded-worker-1', 'hardcoded-clerk-id', 'Gov4You Pune Worker', 'gov4youpune@gmail.com', '+91-9876543210', 'Pune City', true)
ON CONFLICT (id) DO UPDATE SET
  clerk_user_id = EXCLUDED.clerk_user_id,
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  area = EXCLUDED.area,
  is_active = EXCLUDED.is_active;

-- Verify the data
SELECT 'app_users' as table_name, count(*) as count FROM public.app_users
UNION ALL
SELECT 'workers' as table_name, count(*) as count FROM public.workers
UNION ALL
SELECT 'complaint_assignments' as table_name, count(*) as count FROM public.complaint_assignments;
