const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testFrontendAPI() {
  try {
    console.log('🔗 Testing frontend API connection...');
    
    // Test health endpoint
    const healthResponse = await axios.get(`${API_BASE}/../health`);
    console.log('✅ Health check:', healthResponse.data.message);
    
    // Test questionnaire endpoint (public)
    const questionnaireResponse = await axios.get(`${API_BASE}/assessment/questionnaire`);
    console.log('✅ Questionnaire endpoint working');
    console.log(`   Questions: ${questionnaireResponse.data.data.questionnaire.questions.length}`);
    
    // Test login with our test user
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'SecurePass123!'
    });
    
    console.log('✅ Login working');
    console.log(`   User: ${loginResponse.data.data.user.firstName} ${loginResponse.data.data.user.lastName}`);
    
    const token = loginResponse.data.data.tokens.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    
    // Test progress endpoint
    try {
      const progressResponse = await axios.get(`${API_BASE}/assessment/progress`, { headers });
      console.log('✅ Progress endpoint working');
      console.log(`   Assessment complete: ${progressResponse.data.data.assessment.isComplete}`);
    } catch (progressError) {
      if (progressError.response?.status === 404) {
        console.log('ℹ️ No assessment found (expected for new users)');
      } else {
        throw progressError;
      }
    }
    
    // Test results endpoint
    try {
      const resultsResponse = await axios.get(`${API_BASE}/assessment/results`, { headers });
      console.log('✅ Results endpoint working');
      console.log(`   Has interest profile: ${!!resultsResponse.data.data.assessment.interestProfile}`);
    } catch (resultsError) {
      if (resultsError.response?.status === 404) {
        console.log('ℹ️ No completed assessment found');
      } else {
        throw resultsError;
      }
    }
    
    console.log('🎉 All frontend API endpoints are working correctly!');
    console.log('🌐 Frontend should be able to connect at: http://localhost:5174');
    
  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

testFrontendAPI();