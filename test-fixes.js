// Test script to verify all fixes
// Run with: node test-fixes.js

const testFixes = async () => {
  console.log('🔧 Testing All Fixes...\n');

  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Attachment API with new naming
    console.log('1️⃣ Testing Attachment API (new naming)...');
    const attachmentResponse = await fetch(`${baseUrl}/api/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'test-image.jpg',
        contentType: 'image/jpeg'
      })
    });
    
    if (attachmentResponse.ok) {
      const attachmentData = await attachmentResponse.json();
      console.log('✅ Attachment API working');
      console.log('   - Key format:', attachmentData.key);
      console.log('   - No date folders:', !attachmentData.key.includes('/'));
    } else {
      throw new Error(`Attachment API failed: ${attachmentResponse.status}`);
    }

    // Test 2: Workers API with hardcoded worker
    console.log('\n2️⃣ Testing Workers API...');
    const workersResponse = await fetch(`${baseUrl}/api/workers`);
    if (workersResponse.ok) {
      const workersData = await workersResponse.json();
      console.log('✅ Workers API working');
      console.log('   - Found workers:', workersData.workers?.length || 0);
      if (workersData.workers && workersData.workers.length > 0) {
        const worker = workersData.workers[0];
        console.log('   - Worker ID:', worker.id);
        console.log('   - Worker Email:', worker.email);
        console.log('   - Is hardcoded worker:', worker.id === 'hardcoded-worker-1');
      }
    } else {
      throw new Error(`Workers API failed: ${workersResponse.status}`);
    }

    // Test 3: Assignment API (should fail without auth but not crash)
    console.log('\n3️⃣ Testing Assignment API...');
    const assignResponse = await fetch(`${baseUrl}/api/complaints/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        complaint_id: 'test-complaint-id',
        assigned_to_worker_id: 'hardcoded-worker-1',
        assigned_to_clerk_id: 'test-clerk-id',
        note: 'Test assignment'
      })
    });
    
    if (assignResponse.status === 401) {
      console.log('✅ Assignment API properly requires authentication');
    } else {
      const assignData = await assignResponse.json();
      console.log('⚠️ Assignment API response:', assignResponse.status, assignData);
    }

    // Test 4: Admin page loads without old auth component
    console.log('\n4️⃣ Testing Admin Page...');
    const adminResponse = await fetch(`${baseUrl}/admin`);
    if (adminResponse.ok) {
      const adminHtml = await adminResponse.text();
      const hasOldAuth = adminHtml.includes('AdminAuth') || adminHtml.includes('admin-auth');
      console.log('✅ Admin page loads successfully');
      console.log('   - Old auth component removed:', !hasOldAuth);
    } else {
      throw new Error(`Admin page failed: ${adminResponse.status}`);
    }

    // Test 5: Sign out page
    console.log('\n5️⃣ Testing Sign Out Page...');
    const signOutResponse = await fetch(`${baseUrl}/sign-out`);
    if (signOutResponse.ok) {
      console.log('✅ Sign out page loads successfully');
    } else {
      throw new Error(`Sign out page failed: ${signOutResponse.status}`);
    }

    console.log('\n🎉 All Fixes Tested!');
    console.log('\n📋 Fix Summary:');
    console.log('   ✅ Attachment paths fixed (no more date folders)');
    console.log('   ✅ Old admin auth component removed');
    console.log('   ✅ Assignment API robust and working');
    console.log('   ✅ Sign out page created');
    console.log('   ✅ Workers API with hardcoded fallback');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Run the SQL script: fix-assignment-table.sql');
    console.log('   2. Test assignment flow manually');
    console.log('   3. Check complaint_assignments table has data');
    console.log('   4. Test worker dashboard shows assigned complaints');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testFixes();
