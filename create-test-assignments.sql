-- Create test assignments for all users
-- This script will assign complaints to users so they can see them in the worker dashboard

-- First, ensure all users are in app_users table
INSERT INTO app_users (clerk_user_id, email, role, display_name, created_at)
VALUES 
  ('user_32rjFea1XNjxGoRI9WDENGU702J', 'admin@test.com', 'admin', 'Admin User', NOW()),
  ('user_32nebVLM3ALLGHJLTC7b1EJSceS', 'akshay3thakur@gmail.com', 'admin', 'Akshay Thakur', NOW()),
  ('user_32nOkYoKPicRnLva1t7IFDJXud9', 'gov4youpune@gmail.com', 'worker', 'Gov Worker', NOW()),
  ('user_32niy9L7pEBMSMgj1eW6rqkrHN7', 'worker1@test.com', 'worker', 'Worker 1', NOW()),
  ('user_32ryu1Zca1sKxTZ8cMk2GLbqSMG', 'worker2@test.com', 'worker', 'Worker 2', NOW())
ON CONFLICT (clerk_user_id) DO UPDATE SET
  role = EXCLUDED.role,
  display_name = EXCLUDED.display_name;

-- Get some existing complaints to assign
-- Assign complaints to different workers for testing

-- Assignment 1: Assign to current user (user_32rjFea1XNjxGoRI9WDENGU702J)
INSERT INTO complaint_assignments (
  complaint_id, 
  assigned_to_clerk_id, 
  assigned_by_clerk_id, 
  note, 
  assigned_at, 
  created_at, 
  updated_at
)
SELECT 
  '0ffceb84-ba6e-484f-9399-fed433ef1f59' as complaint_id,
  'user_32rjFea1XNjxGoRI9WDENGU702J' as assigned_to_clerk_id,
  'user_32nebVLM3ALLGHJLTC7b1EJSceS' as assigned_by_clerk_id,
  'Test assignment for current user' as note,
  NOW() as assigned_at,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (
  SELECT 1 FROM complaint_assignments 
  WHERE complaint_id = '0ffceb84-ba6e-484f-9399-fed433ef1f59' 
  AND assigned_to_clerk_id = 'user_32rjFea1XNjxGoRI9WDENGU702J'
);

-- Assignment 2: Assign to gov worker
INSERT INTO complaint_assignments (
  complaint_id, 
  assigned_to_clerk_id, 
  assigned_by_clerk_id, 
  note, 
  assigned_at, 
  created_at, 
  updated_at
)
SELECT 
  '38d3a23d-44a6-4359-a9cc-eb91adb9d00c' as complaint_id,
  'user_32nOkYoKPicRnLva1t7IFDJXud9' as assigned_to_clerk_id,
  'user_32rjFea1XNjxGoRI9WDENGU702J' as assigned_by_clerk_id,
  'Test assignment for gov worker' as note,
  NOW() as assigned_at,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (
  SELECT 1 FROM complaint_assignments 
  WHERE complaint_id = '38d3a23d-44a6-4359-a9cc-eb91adb9d00c' 
  AND assigned_to_clerk_id = 'user_32nOkYoKPicRnLva1t7IFDJXud9'
);

-- Assignment 3: Assign to worker 1
INSERT INTO complaint_assignments (
  complaint_id, 
  assigned_to_clerk_id, 
  assigned_by_clerk_id, 
  note, 
  assigned_at, 
  created_at, 
  updated_at
)
SELECT 
  '892d3ce9-b30b-4131-80ae-42f4c3403e22' as complaint_id,
  'user_32niy9L7pEBMSMgj1eW6rqkrHN7' as assigned_to_clerk_id,
  'user_32rjFea1XNjxGoRI9WDENGU702J' as assigned_by_clerk_id,
  'Test assignment for worker 1' as note,
  NOW() as assigned_at,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (
  SELECT 1 FROM complaint_assignments 
  WHERE complaint_id = '892d3ce9-b30b-4131-80ae-42f4c3403e22' 
  AND assigned_to_clerk_id = 'user_32niy9L7pEBMSMgj1eW6rqkrHN7'
);

-- Update complaints table to reflect assignments
UPDATE complaints 
SET 
  assigned_to_clerk_id = 'user_32rjFea1XNjxGoRI9WDENGU702J',
  assigned_at = NOW(),
  status = 'assigned',
  updated_at = NOW()
WHERE id = '0ffceb84-ba6e-484f-9399-fed433ef1f59';

UPDATE complaints 
SET 
  assigned_to_clerk_id = 'user_32nOkYoKPicRnLva1t7IFDJXud9',
  assigned_at = NOW(),
  status = 'assigned',
  updated_at = NOW()
WHERE id = '38d3a23d-44a6-4359-a9cc-eb91adb9d00c';

UPDATE complaints 
SET 
  assigned_to_clerk_id = 'user_32niy9L7pEBMSMgj1eW6rqkrHN7',
  assigned_at = NOW(),
  status = 'assigned',
  updated_at = NOW()
WHERE id = '892d3ce9-b30b-4131-80ae-42f4c3403e22';

-- Show results
SELECT 
  ca.complaint_id,
  ca.assigned_to_clerk_id,
  ca.assigned_at,
  c.token,
  c.category,
  c.subtype,
  c.status
FROM complaint_assignments ca
JOIN complaints c ON ca.complaint_id = c.id
ORDER BY ca.assigned_at DESC;
