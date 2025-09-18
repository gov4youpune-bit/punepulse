-- Add missing worker to app_users table
-- This will allow the user to access the worker dashboard

-- First, let's check if the user already exists
SELECT * FROM app_users WHERE clerk_user_id = 'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG';

-- If the user doesn't exist, add them as a worker
INSERT INTO app_users (clerk_user_id, email, role, display_name, created_at)
VALUES (
  'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG',
  'worker@example.com', -- You can update this with the actual email
  'worker',
  'Field Worker',
  NOW()
)
ON CONFLICT (clerk_user_id) DO UPDATE SET
  role = 'worker';

-- Also add them to the workers table if they have assignments
INSERT INTO workers (clerk_user_id, name, email, area, created_at, updated_at)
VALUES (
  'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG',
  'Field Worker',
  'worker@example.com', -- You can update this with the actual email
  'Pune',
  NOW(),
  NOW()
)
ON CONFLICT (clerk_user_id) DO UPDATE SET
  name = 'Field Worker',
  updated_at = NOW();

-- Verify the user was added
SELECT * FROM app_users WHERE clerk_user_id = 'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG';
SELECT * FROM workers WHERE clerk_user_id = 'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG';