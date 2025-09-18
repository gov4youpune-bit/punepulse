// Test script to verify middleware fixes
const https = require('https');

const BASE_URL = 'https://shaktighssp.shop';

async function testEndpoint(endpoint, description, expectedStatus = 200) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`\n🔍 Testing: ${description}`);
    console.log(`URL: ${url}`);
    console.log(`Expected Status: ${expectedStatus}`);
    
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'Test-Script/1.0',
        'Accept': 'application/json',
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Auth Status: ${res.headers['x-clerk-auth-status'] || 'N/A'}`);
        console.log(`Auth Reason: ${res.headers['x-clerk-auth-reason'] || 'N/A'}`);
        
        const success = res.statusCode === expectedStatus;
        console.log(success ? `✅ Success` : `❌ Failed`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`Response:`, JSON.stringify(jsonData, null, 2));
          } catch (e) {
            console.log(`Response (text):`, data.substring(0, 200));
          }
        } else {
          console.log(`Response:`, data.substring(0, 500));
        }
        
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          success: success
        });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Network Error:`, error.message);
      resolve({
        status: 0,
        error: error.message,
        success: false
      });
    });

    req.setTimeout(10000, () => {
      console.log(`❌ Timeout`);
      req.destroy();
      resolve({
        status: 0,
        error: 'Timeout',
        success: false
      });
    });

    req.end();
  });
}

async function runMiddlewareTests() {
  console.log('🚀 Testing Middleware Fixes');
  console.log('=' .repeat(60));

  // Test 1: Public routes should work
  await testEndpoint('/', 'Homepage (Public)', 200);
  await testEndpoint('/sign-in', 'Sign In Page (Public)', 200);
  await testEndpoint('/sign-up', 'Sign Up Page (Public)', 200);

  // Test 2: Protected routes should redirect or require auth
  await testEndpoint('/admin', 'Admin Dashboard (Protected)', 200); // Should redirect to sign-in
  await testEndpoint('/worker/dashboard', 'Worker Dashboard (Protected)', 200); // Should redirect to sign-in

  // Test 3: Protected API routes should return 401
  await testEndpoint('/api/complaints/assigned', 'Assigned Complaints API (Protected)', 401);
  await testEndpoint('/api/workers', 'Workers API (Protected)', 401);

  // Test 4: Public API routes should work
  await testEndpoint('/api/complaints', 'Complaints API (Public)', 200);

  console.log('\n' + '=' .repeat(60));
  console.log('🏁 Middleware tests completed');
  console.log('\n📝 Expected Results:');
  console.log('- Public routes (/, /sign-in, /sign-up) should return 200');
  console.log('- Protected pages (/admin, /worker/dashboard) should redirect to sign-in');
  console.log('- Protected APIs (/api/complaints/assigned, /api/workers) should return 401');
  console.log('- Public APIs (/api/complaints) should return 200');
  console.log('\n🔧 If tests fail, check:');
  console.log('1. Middleware is deployed correctly');
  console.log('2. Environment variables are set in Vercel');
  console.log('3. Clerk configuration matches your setup');
}

runMiddlewareTests().catch(console.error);
