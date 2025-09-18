-- Create a test assignment for the current user
-- Based on the logs, this user is: user_32qFl9Ab1x2bve9crzaZIsfkPoX

-- First, let's assign one of the existing complaints to this user
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
  '38d3a23d-44a6-4359-a9cc-eb91adb9d00c', -- Use the most recent complaint
  'user_32qFl9Ab1x2bve9crzaZIsfkPoX',     -- Current user
  'user_32rjFea1XNjxGoRI9WDENGU702J',     -- Admin user (from assign API logs)
  'Test assignment for worker dashboard',
  NOW(),
  NOW(),
  NOW()
);

-- Also add this user to app_users table if not exists
INSERT INTO app_users (clerk_user_id, email, role, display_name, created_at)
VALUES (
  'user_32qFl9Ab1x2bve9crzaZIsfkPoX',
  'worker@test.com', -- Update with actual email
  'worker',
  'Test Worker',
  NOW()
)
ON CONFLICT (clerk_user_id) DO UPDATE SET
  role = 'worker';
