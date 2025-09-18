-- Fix worker_reports table to populate worker_clerk_id field
-- This will make the existing reports visible in admin panel

-- 1. Update existing worker_reports records to populate worker_clerk_id
UPDATE public.worker_reports 
SET worker_clerk_id = w.clerk_user_id
FROM public.workers w
WHERE worker_reports.worker_id = w.id 
  AND worker_reports.worker_clerk_id IS NULL;

-- 2. Add a constraint to ensure worker_clerk_id is always populated
ALTER TABLE public.worker_reports 
ALTER COLUMN worker_clerk_id SET NOT NULL;

-- 3. Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_worker_reports_clerk_id ON public.worker_reports(worker_clerk_id);

-- 4. Verify the update worked
SELECT 
  wr.id,
  wr.complaint_id,
  wr.worker_id,
  wr.worker_clerk_id,
  wr.status,
  w.display_name as worker_name,
  w.email as worker_email
FROM public.worker_reports wr
LEFT JOIN public.workers w ON wr.worker_id = w.id
ORDER BY wr.created_at DESC
LIMIT 10;
