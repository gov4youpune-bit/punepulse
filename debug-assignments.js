// Debug script to check assignments in the database
const { createClient } = require('@supabase/supabase-js');

// You'll need to add your Supabase credentials here
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAssignments() {
  console.log('=== DEBUGGING ASSIGNMENTS ===');
  
  // Check all assignments
  const { data: allAssignments, error: allError } = await supabase
    .from('complaint_assignments')
    .select('*')
    .order('assigned_at', { ascending: false });
  
  if (allError) {
    console.error('Error fetching assignments:', allError);
    return;
  }
  
  console.log('All assignments:', allAssignments);
  
  // Check specific user assignments
  const testUserId = 'user_32ryu1Zca1sKxTZ8cMk2GLbqSMG';
  console.log(`\nChecking assignments for user: ${testUserId}`);
  
  const { data: userAssignments, error: userError } = await supabase
    .from('complaint_assignments')
    .select('*')
    .eq('assigned_to_clerk_id', testUserId);
  
  if (userError) {
    console.error('Error fetching user assignments:', userError);
  } else {
    console.log('User assignments:', userAssignments);
  }
  
  // Check app_users table
  console.log('\nChecking app_users table:');
  const { data: appUsers, error: appUsersError } = await supabase
    .from('app_users')
    .select('*')
    .eq('clerk_user_id', testUserId);
  
  if (appUsersError) {
    console.error('Error fetching app_users:', appUsersError);
  } else {
    console.log('App users:', appUsers);
  }
}

debugAssignments().catch(console.error);
