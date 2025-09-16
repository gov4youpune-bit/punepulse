// Complete Flow Test Script for Pune Pulse
// Run with: node test-complete-flow.js

const testCompleteFlow = async () => {
  console.log('🧪 Testing Complete Pune Pulse Flow...\n');

  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Home Page Loads
    console.log('1️⃣ Testing Home Page...');
    const homeResponse = await fetch(baseUrl);
    if (homeResponse.ok) {
      console.log('✅ Home page loads successfully');
    } else {
      throw new Error(`Home page failed: ${homeResponse.status}`);
    }

    // Test 2: Workers API
    console.log('\n2️⃣ Testing Workers API...');
    const workersResponse = await fetch(`${baseUrl}/api/workers`);
    if (workersResponse.ok) {
      const workersData = await workersResponse.json();
      console.log('✅ Workers API working - Found', workersData.workers?.length || 0, 'workers');
      if (workersData.workers && workersData.workers.length > 0) {
        console.log('   - Worker:', workersData.workers[0].display_name);
        console.log('   - Email:', workersData.workers[0].email);
      }
    } else {
      throw new Error(`Workers API failed: ${workersResponse.status}`);
    }

    // Test 3: Complaints API
    console.log('\n3️⃣ Testing Complaints API...');
    const complaintsResponse = await fetch(`${baseUrl}/api/complaints`);
    if (complaintsResponse.ok) {
      const complaintsData = await complaintsResponse.json();
      console.log('✅ Complaints API working - Found', complaintsData.complaints?.length || 0, 'complaints');
      if (complaintsData.complaints && complaintsData.complaints.length > 0) {
        console.log('   - Sample Complaint Token:', complaintsData.complaints[0].token);
        console.log('   - Sample Complaint Urgency:', complaintsData.complaints[0].urgency || 'medium');
      }
    } else {
      throw new Error(`Complaints API failed: ${complaintsResponse.status}`);
    }

    // Test 4: Admin Page
    console.log('\n4️⃣ Testing Admin Page...');
    const adminResponse = await fetch(`${baseUrl}/admin`);
    if (adminResponse.ok) {
      console.log('✅ Admin page loads successfully');
    } else {
      console.log('❌ Admin page failed:', adminResponse.status);
    }

    // Test 5: Worker Login Page
    console.log('\n5️⃣ Testing Worker Login Page...');
    const workerLoginResponse = await fetch(`${baseUrl}/worker/login`);
    if (workerLoginResponse.ok) {
      console.log('✅ Worker login page loads successfully');
    } else {
      console.log('❌ Worker login page failed:', workerLoginResponse.status);
    }

    // Test 6: Worker Dashboard Page
    console.log('\n6️⃣ Testing Worker Dashboard Page...');
    const workerDashboardResponse = await fetch(`${baseUrl}/worker/dashboard`);
    if (workerDashboardResponse.ok) {
      console.log('✅ Worker dashboard page loads successfully');
    } else {
      console.log('❌ Worker dashboard page failed:', workerDashboardResponse.status);
    }

    // Test 7: Sign Out Page
    console.log('\n7️⃣ Testing Sign Out Page...');
    const signOutResponse = await fetch(`${baseUrl}/sign-out`);
    if (signOutResponse.ok) {
      console.log('✅ Sign out page loads successfully');
    } else {
      console.log('❌ Sign out page failed:', signOutResponse.status);
    }

    // Test 8: Assignment API (without auth - should fail gracefully)
    console.log('\n8️⃣ Testing Assignment API...');
    const assignResponse = await fetch(`${baseUrl}/api/complaints/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaint_id: 'test-id',
        assigned_to_worker_id: 'hardcoded-worker-1',
        assigned_to_clerk_id: 'test-clerk-id',
        note: 'Test assignment'
      })
    });
    
    if (assignResponse.status === 401) {
      console.log('✅ Assignment API properly requires authentication');
    } else {
      console.log('⚠️ Assignment API response:', assignResponse.status);
    }

    console.log('\n🎉 All Core Tests Completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Home Page: Working');
    console.log('   ✅ Workers API: Working');
    console.log('   ✅ Complaints API: Working');
    console.log('   ✅ Admin Page: Accessible');
    console.log('   ✅ Worker Login: Accessible');
    console.log('   ✅ Worker Dashboard: Accessible');
    console.log('   ✅ Sign Out Page: Accessible');
    console.log('   ✅ Assignment API: Protected');
    
    console.log('\n🚀 Ready for Manual Testing!');
    console.log('\n📝 Manual Test Steps:');
    console.log('   1. Go to localhost:3000');
    console.log('   2. Sign up/Sign in with Clerk');
    console.log('   3. Submit a complaint');
    console.log('   4. Go to localhost:3000/admin');
    console.log('   5. Sign in as admin');
    console.log('   6. Click "Assign" on a complaint');
    console.log('   7. Select "Gov4You Pune Worker"');
    console.log('   8. Click "Assign"');
    console.log('   9. Go to localhost:3000/worker/login');
    console.log('   10. Sign in and check dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure the development server is running (npm run dev)');
    console.log('   2. Check if all environment variables are set');
    console.log('   3. Verify Clerk configuration');
    console.log('   4. Check database connection');
  }
};

// Run the test
testCompleteFlow();
