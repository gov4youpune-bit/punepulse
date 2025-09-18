// Test script to check worker reports API
const testWorkerReports = async () => {
  try {
    console.log('Testing worker reports API...');
    
    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/complaints/reports', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.reports && data.reports.length > 0) {
      console.log('✅ Found', data.reports.length, 'worker reports');
      console.log('Sample report:', data.reports[0]);
    } else {
      console.log('❌ No worker reports found');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
testWorkerReports();
