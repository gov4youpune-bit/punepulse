-- Schema Verification Script
-- Run this after applying the comprehensive migration to verify everything is working

-- 1. Check if all tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('complaints', 'workers', 'complaint_assignments', 'worker_reports', 'attachments', 'audit_logs', 'admin_profiles')
ORDER BY table_name;

-- 2. Check complaints table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'complaints' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check workers table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'workers' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if display_name column exists in workers
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'workers' 
  AND table_schema = 'public'
  AND column_name = 'display_name';

-- 5. Check foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('complaints', 'workers', 'complaint_assignments', 'worker_reports')
ORDER BY tc.table_name, kcu.column_name;

-- 6. Check indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('complaints', 'workers', 'complaint_assignments', 'worker_reports', 'attachments', 'audit_logs')
ORDER BY tablename, indexname;

-- 7. Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. Test token generation function
SELECT generate_complaint_token() as test_token;

-- 9. Check sample data
SELECT COUNT(*) as complaint_count FROM public.complaints;
SELECT COUNT(*) as worker_count FROM public.workers;
SELECT COUNT(*) as admin_count FROM public.admin_profiles;

-- 10. Test a simple insert to complaints table
INSERT INTO public.complaints (category, description, location_text, email)
VALUES ('test', 'Test complaint for schema verification', 'Test location', 'test@example.com')
RETURNING id, token, status;

-- Clean up test data
DELETE FROM public.complaints WHERE category = 'test' AND description = 'Test complaint for schema verification';


