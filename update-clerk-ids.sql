-- Update Clerk IDs across all tables for the specified email addresses
-- This script updates all references to the old Clerk IDs with the new ones

-- 1. Update app_users table
UPDATE public.app_users 
SET clerk_user_id = 'user_32sxbjwXOs1zsxvVfpEYPiey6S2'
WHERE email = 'drive.akshay3thakur@gmail.com';

UPDATE public.app_users 
SET clerk_user_id = 'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG'
WHERE email = 'akshaythakur0311@gmail.com';

UPDATE public.app_users 
SET clerk_user_id = 'user_32rjFea1XNjxGoRI9WDENGU702J'
WHERE email = 'gov4youpune@gmail.com';

UPDATE public.app_users 
SET clerk_user_id = 'user_32qFl9Ab1x2bve9crzaZIsfkPoX'
WHERE email = 'akshay3thakur@gmail.com';

-- 2. Update workers table
UPDATE public.workers 
SET clerk_user_id = 'user_32sxbjwXOs1zsxvVfpEYPiey6S2'
WHERE email = 'drive.akshay3thakur@gmail.com';

UPDATE public.workers 
SET clerk_user_id = 'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG'
WHERE email = 'akshaythakur0311@gmail.com';

UPDATE public.workers 
SET clerk_user_id = 'user_32rjFea1XNjxGoRI9WDENGU702J'
WHERE email = 'gov4youpune@gmail.com';

UPDATE public.workers 
SET clerk_user_id = 'user_32qFl9Ab1x2bve9crzaZIsfkPoX'
WHERE email = 'akshay3thakur@gmail.com';

-- 3. Update complaints table (assigned_to_clerk_id)
UPDATE public.complaints 
SET assigned_to_clerk_id = 'user_32sxbjwXOs1zsxvVfpEYPiey6S2'
WHERE assigned_to_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'drive.akshay3thakur@gmail.com'
);

UPDATE public.complaints 
SET assigned_to_clerk_id = 'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG'
WHERE assigned_to_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'akshaythakur0311@gmail.com'
);

UPDATE public.complaints 
SET assigned_to_clerk_id = 'user_32rjFea1XNjxGoRI9WDENGU702J'
WHERE assigned_to_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'gov4youpune@gmail.com'
);

UPDATE public.complaints 
SET assigned_to_clerk_id = 'user_32qFl9Ab1x2bve9crzaZIsfkPoX'
WHERE assigned_to_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'akshay3thakur@gmail.com'
);

-- 4. Update complaint_assignments table (assigned_to_clerk_id and assigned_by_clerk_id)
UPDATE public.complaint_assignments 
SET assigned_to_clerk_id = 'user_32sxbjwXOs1zsxvVfpEYPiey6S2'
WHERE assigned_to_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'drive.akshay3thakur@gmail.com'
);

UPDATE public.complaint_assignments 
SET assigned_to_clerk_id = 'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG'
WHERE assigned_to_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'akshaythakur0311@gmail.com'
);

UPDATE public.complaint_assignments 
SET assigned_to_clerk_id = 'user_32rjFea1XNjxGoRI9WDENGU702J'
WHERE assigned_to_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'gov4youpune@gmail.com'
);

UPDATE public.complaint_assignments 
SET assigned_to_clerk_id = 'user_32qFl9Ab1x2bve9crzaZIsfkPoX'
WHERE assigned_to_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'akshay3thakur@gmail.com'
);

-- Update assigned_by_clerk_id
UPDATE public.complaint_assignments 
SET assigned_by_clerk_id = 'user_32sxbjwXOs1zsxvVfpEYPiey6S2'
WHERE assigned_by_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'drive.akshay3thakur@gmail.com'
);

UPDATE public.complaint_assignments 
SET assigned_by_clerk_id = 'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG'
WHERE assigned_by_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'akshaythakur0311@gmail.com'
);

UPDATE public.complaint_assignments 
SET assigned_by_clerk_id = 'user_32rjFea1XNjxGoRI9WDENGU702J'
WHERE assigned_by_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'gov4youpune@gmail.com'
);

UPDATE public.complaint_assignments 
SET assigned_by_clerk_id = 'user_32qFl9Ab1x2bve9crzaZIsfkPoX'
WHERE assigned_by_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'akshay3thakur@gmail.com'
);

-- 5. Update worker_reports table (worker_clerk_id)
UPDATE public.worker_reports 
SET worker_clerk_id = 'user_32sxbjwXOs1zsxvVfpEYPiey6S2'
WHERE worker_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'drive.akshay3thakur@gmail.com'
);

UPDATE public.worker_reports 
SET worker_clerk_id = 'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG'
WHERE worker_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'akshaythakur0311@gmail.com'
);

UPDATE public.worker_reports 
SET worker_clerk_id = 'user_32rjFea1XNjxGoRI9WDENGU702J'
WHERE worker_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'gov4youpune@gmail.com'
);

UPDATE public.worker_reports 
SET worker_clerk_id = 'user_32qFl9Ab1x2bve9crzaZIsfkPoX'
WHERE worker_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'akshay3thakur@gmail.com'
);

-- 6. Update audit_logs table (actor_clerk_id)
UPDATE public.audit_logs 
SET actor_clerk_id = 'user_32sxbjwXOs1zsxvVfpEYPiey6S2'
WHERE actor_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'drive.akshay3thakur@gmail.com'
);

UPDATE public.audit_logs 
SET actor_clerk_id = 'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG'
WHERE actor_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'akshaythakur0311@gmail.com'
);

UPDATE public.audit_logs 
SET actor_clerk_id = 'user_32rjFea1XNjxGoRI9WDENGU702J'
WHERE actor_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'gov4youpune@gmail.com'
);

UPDATE public.audit_logs 
SET actor_clerk_id = 'user_32qFl9Ab1x2bve9crzaZIsfkPoX'
WHERE actor_clerk_id IN (
  SELECT clerk_user_id FROM public.app_users WHERE email = 'akshay3thakur@gmail.com'
);

-- Verification queries to check the updates
SELECT 'app_users' as table_name, email, clerk_user_id FROM public.app_users WHERE email IN (
  'drive.akshay3thakur@gmail.com', 
  'akshaythakur0311@gmail.com', 
  'gov4youpune@gmail.com', 
  'akshay3thakur@gmail.com'
)
UNION ALL
SELECT 'workers' as table_name, email, clerk_user_id FROM public.workers WHERE email IN (
  'drive.akshay3thakur@gmail.com', 
  'akshaythakur0311@gmail.com', 
  'gov4youpune@gmail.com', 
  'akshay3thakur@gmail.com'
)
ORDER BY table_name, email;
