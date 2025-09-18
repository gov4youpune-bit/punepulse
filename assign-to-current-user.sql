-- Assign a complaint to the current user for testing
-- Based on the logs, the current user is: user_32rjFea1XNjxGoRI9WDENGU702J

-- First, add this user to app_users table if not exists
INSERT INTO app_users (clerk_user_id, email, role, display_name, created_at)
VALUES (
  'user_32rjFea1XNjxGoRI9WDENGU702J',
  'current.user@test.com', -- Update with actual email
  'worker',
  'Current Test User',
  NOW()
)
ON CONFLICT (clerk_user_id) DO UPDATE SET
  role = 'worker';

-- Assign the most recent complaint to this user
INSERT INTO complaint_assignments (
  complaint_id, 
  assigned_to_clerk_id, 
  assigned_by_clerk_id, 
  note, 
  assigned_at, 
  created_at, 
  updated_at
)
VALUES (
  '0ffceb84-ba6e-484f-9399-fed433ef1f59', -- Most recent complaint from logs
  'user_32rjFea1XNjxGoRI9WDENGU702J',     -- Current user
  'user_32nebVLM3ALLGHJLTC7b1EJSceS',     -- Admin user
  'Test assignment for current user',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (complaint_id, assigned_to_clerk_id) DO UPDATE SET
  assigned_at = NOW(),
  updated_at = NOW();
