-- Worker Assignment & Verification Workflow Migrations

-- Create workers table
CREATE TABLE IF NOT EXISTS public.workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create complaint_assignments table
CREATE TABLE IF NOT EXISTS public.complaint_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.workers(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create worker_reports table
CREATE TABLE IF NOT EXISTS public.worker_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
  comments TEXT,
  photos TEXT[], -- Array of storage keys
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to complaints table
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.workers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'none' CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_complaint_id ON public.complaint_assignments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_assignments_assigned_to ON public.complaint_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_worker_reports_complaint_id ON public.worker_reports(complaint_id);
CREATE INDEX IF NOT EXISTS idx_worker_reports_worker_id ON public.worker_reports(worker_id);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_verification_status ON public.complaints(verification_status);

-- Create RLS policies for workers table
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

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

-- Create RLS policies for complaint_assignments table
ALTER TABLE public.complaint_assignments ENABLE ROW LEVEL SECURITY;

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

-- Create RLS policies for worker_reports table
ALTER TABLE public.worker_reports ENABLE ROW LEVEL SECURITY;

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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaint_assignments_updated_at BEFORE UPDATE ON public.complaint_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_reports_updated_at BEFORE UPDATE ON public.worker_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
