-- Fix schema mismatch between SQL and code

-- 1) Fix column names and add missing columns
ALTER TABLE public.complaints
  DROP COLUMN IF EXISTS assignment_status,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_by UUID;

-- 2) Update workers table to match code expectations
ALTER TABLE public.workers
  DROP COLUMN IF EXISTS user_id,
  ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3) Update complaint_assignments table to match code expectations
ALTER TABLE public.complaint_assignments
  ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed')),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4) Update worker_reports table to match code expectations
ALTER TABLE public.worker_reports
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5) Create proper indexes
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_complaint_id ON public.complaint_assignments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_assigned_to ON public.complaint_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_worker_reports_complaint_id ON public.worker_reports(complaint_id);
CREATE INDEX IF NOT EXISTS idx_worker_reports_worker_id ON public.worker_reports(worker_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_verification_status ON public.complaints(verification_status);

-- 6) Enable RLS and create policies
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_reports ENABLE ROW LEVEL SECURITY;

-- Workers policies
CREATE POLICY "Workers can view their own record" ON public.workers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all workers" ON public.workers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can manage workers" ON public.workers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' = 'admin'
    )
  );

-- Complaint assignments policies
CREATE POLICY "Workers can view their assignments" ON public.complaint_assignments
  FOR SELECT USING (
    assigned_to IN (
      SELECT id FROM public.workers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all assignments" ON public.complaint_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can manage assignments" ON public.complaint_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' = 'admin'
    )
  );

-- Worker reports policies
CREATE POLICY "Workers can view their own reports" ON public.worker_reports
  FOR SELECT USING (
    worker_id IN (
      SELECT id FROM public.workers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all reports" ON public.worker_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' = 'admin'
    )
  );

CREATE POLICY "Workers can create reports" ON public.worker_reports
  FOR INSERT WITH CHECK (
    worker_id IN (
      SELECT id FROM public.workers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can update their own reports" ON public.worker_reports
  FOR UPDATE USING (
    worker_id IN (
      SELECT id FROM public.workers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage reports" ON public.worker_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.user_metadata->>'role' = 'admin'
    )
  );

-- 7) Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8) Create triggers for updated_at
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaint_assignments_updated_at BEFORE UPDATE ON public.complaint_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_reports_updated_at BEFORE UPDATE ON public.worker_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

