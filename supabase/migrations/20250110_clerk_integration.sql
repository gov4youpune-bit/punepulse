-- Clerk Integration Migration
-- This migration adds support for Clerk authentication while keeping Supabase for data storage

-- 0. enable pgcrypto if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) app_users mapping table to map Clerk user id -> role (admin|worker|citizen) and email
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  role text DEFAULT 'citizen', -- 'admin' | 'worker' | 'citizen'
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- Add clerk_user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'app_users' 
                   AND column_name = 'clerk_user_id') THEN
        ALTER TABLE public.app_users ADD COLUMN clerk_user_id text UNIQUE NULL;
    END IF;
END $$;

-- 2) workers table (optionally references app_users.id)
CREATE TABLE IF NOT EXISTS public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL, -- references public.app_users(id) if you want
  display_name text NOT NULL,
  phone text NULL,
  area text NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Add clerk_user_id column to workers if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'workers' 
                   AND column_name = 'clerk_user_id') THEN
        ALTER TABLE public.workers ADD COLUMN clerk_user_id text NULL;
    END IF;
END $$;

-- 3) complaint_assignments
CREATE TABLE IF NOT EXISTS public.complaint_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  assigned_to uuid NULL,        -- workers.id OR app_users.id
  assigned_to_clerk_id text NULL,
  assigned_by_clerk_id text NULL,
  note text NULL,
  assigned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 4) worker_reports
CREATE TABLE IF NOT EXISTS public.worker_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  worker_clerk_id text NULL,
  worker_user_id uuid NULL, -- app_users.id
  comments text NULL,
  photos text[] DEFAULT ARRAY[]::text[], -- storage keys
  status text DEFAULT 'submitted', -- 'submitted' | 'admin_verification_pending' | 'reviewed' | 'rejected'
  created_at timestamptz DEFAULT now()
);

-- 5) augment complaints table with persistence fields if missing
DO $$ 
BEGIN
    -- Add assigned_to column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'complaints' 
                   AND column_name = 'assigned_to') THEN
        ALTER TABLE public.complaints ADD COLUMN assigned_to uuid NULL;
    END IF;
    
    -- Add assigned_to_clerk_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'complaints' 
                   AND column_name = 'assigned_to_clerk_id') THEN
        ALTER TABLE public.complaints ADD COLUMN assigned_to_clerk_id text NULL;
    END IF;
    
    -- Add assigned_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'complaints' 
                   AND column_name = 'assigned_at') THEN
        ALTER TABLE public.complaints ADD COLUMN assigned_at timestamptz NULL;
    END IF;
    
    -- Add verification_status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'complaints' 
                   AND column_name = 'verification_status') THEN
        ALTER TABLE public.complaints ADD COLUMN verification_status text DEFAULT NULL;
    END IF;
    
    -- Add resolved_by_clerk_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'complaints' 
                   AND column_name = 'resolved_by_clerk_id') THEN
        ALTER TABLE public.complaints ADD COLUMN resolved_by_clerk_id text NULL;
    END IF;
    
    -- Add resolved_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'complaints' 
                   AND column_name = 'resolved_at') THEN
        ALTER TABLE public.complaints ADD COLUMN resolved_at timestamptz NULL;
    END IF;
    
    -- Add resolution_notes column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'complaints' 
                   AND column_name = 'resolution_notes') THEN
        ALTER TABLE public.complaints ADD COLUMN resolution_notes text NULL;
    END IF;
END $$;

-- 6) audit_logs if missing (safe)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NULL,
  actor_clerk_id text NULL,
  actor_app_user_id uuid NULL,
  action text NOT NULL,
  payload jsonb NULL,
  created_at timestamptz DEFAULT now()
);

-- 7) Enable RLS for new tables and create policies
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_reports ENABLE ROW LEVEL SECURITY;

-- App users policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_users' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile" ON public.app_users
          FOR SELECT USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_users' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile" ON public.app_users
          FOR UPDATE USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_users' AND policyname = 'Users can insert their own profile') THEN
        CREATE POLICY "Users can insert their own profile" ON public.app_users
          FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Workers policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'Anyone can view active workers') THEN
        CREATE POLICY "Anyone can view active workers" ON public.workers
          FOR SELECT USING (is_active = true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'Admins can manage workers') THEN
        CREATE POLICY "Admins can manage workers" ON public.workers
          FOR ALL USING (true);
    END IF;
END $$;

-- Complaint assignments policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'complaint_assignments' AND policyname = 'Users can view assignments for their complaints') THEN
        CREATE POLICY "Users can view assignments for their complaints" ON public.complaint_assignments
          FOR SELECT USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'complaint_assignments' AND policyname = 'Admins can manage assignments') THEN
        CREATE POLICY "Admins can manage assignments" ON public.complaint_assignments
          FOR ALL USING (true);
    END IF;
END $$;

-- Worker reports policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'worker_reports' AND policyname = 'Workers can view their own reports') THEN
        CREATE POLICY "Workers can view their own reports" ON public.worker_reports
          FOR SELECT USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'worker_reports' AND policyname = 'Workers can create reports') THEN
        CREATE POLICY "Workers can create reports" ON public.worker_reports
          FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'worker_reports' AND policyname = 'Admins can manage all reports') THEN
        CREATE POLICY "Admins can manage all reports" ON public.worker_reports
          FOR ALL USING (true);
    END IF;
END $$;

-- 8) Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_users_clerk_id ON public.app_users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_workers_clerk_id ON public.workers(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_clerk_id ON public.complaint_assignments(assigned_to_clerk_id);
CREATE INDEX IF NOT EXISTS idx_worker_reports_clerk_id ON public.worker_reports(worker_clerk_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_clerk_id ON public.complaints(assigned_to_clerk_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clerk_id ON public.audit_logs(actor_clerk_id);
