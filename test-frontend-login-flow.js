const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testFrontendLoginFlow() {
  try {
    console.log('🔐 Testing frontend login flow...');
    
    // Step 1: Login (what happens when user logs in)
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'SecurePass123!'
    });
    
    const token = loginResponse.data.data.tokens.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    
    console.log('✅ Login successful');
    console.log('User:', loginResponse.data.data.user.firstName, loginResponse.data.data.user.lastName);
    
    // Step 2: Load assessment data (what loadAssessmentData does)
    console.log('\n📊 Step 2: Loading assessment data (simulating loadAssessmentData)...');
    
    // First try results
    console.log('Trying results endpoint first...');
    try {
      const resultsResponse = await axios.get(`${API_BASE}/assessment/results`, { headers });
      console.log('✅ Results found!');
      console.log('Assessment data:', {
        id: resultsResponse.data.data.assessment.id,
        isComplete: resultsResponse.data.data.assessment.isComplete,
        hasInterestProfile: !!resultsResponse.data.data.assessment.interestProfile,
        completedAt: resultsResponse.data.data.assessment.completedAt
      });
      
      console.log('\n🎉 Frontend should show: "Assessment Completed!" with View Results button');
      return resultsResponse.data.data.assessment;
      
    } catch (resultsError) {
      console.log('Results not found, trying progress...');
      
      if (resultsError.response?.status === 404) {
        try {
          const progressResponse = await axios.get(`${API_BASE}/assessment/progress`, { headers });
          console.log('Progress found:', {
            isComplete: progressResponse.data.data.assessment.isComplete,
            completionPercentage: progressResponse.data.data.progress.completionPercentage
          });
          
          if (progressResponse.data.data.progress.isComplete) {
            console.log('Progress shows complete, retrying results...');
            const retryResults = await axios.get(`${API_BASE}/assessment/results`, { headers });
            console.log('✅ Results found on retry!');
            return retryResults.data.data.assessment;
          } else {
            console.log('Assessment in progress');
            return {
              ...progressResponse.data.data.assessment,
              progress: progressResponse.data.data.progress,
              isComplete: progressResponse.data.data.progress.isComplete
            };
          }
        } catch (progressError) {
          console.log('No assessment found');
          return null;
        }
      } else {
        throw resultsError;
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testFrontendLoginFlow();