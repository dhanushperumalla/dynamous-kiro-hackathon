const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testFrontendData() {
  try {
    console.log('🔍 Testing what frontend receives...');
    
    // Login first
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'SecurePass123!'
    });
    
    const token = loginResponse.data.data.tokens.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    
    console.log('✅ Logged in successfully');
    
    // Test progress endpoint (what loadAssessmentData calls first)
    console.log('\n📊 Testing progress endpoint:');
    try {
      const progressResponse = await axios.get(`${API_BASE}/assessment/progress`, { headers });
      console.log('Progress response structure:', {
        success: progressResponse.data.success,
        hasData: !!progressResponse.data.data,
        hasProgress: !!progressResponse.data.data?.progress,
        hasAssessment: !!progressResponse.data.data?.assessment
      });
      
      if (progressResponse.data.data) {
        console.log('Progress data:', {
          progress: progressResponse.data.data.progress,
          assessment: progressResponse.data.data.assessment
        });
        
        console.log('Key flags:', {
          'progress.isComplete': progressResponse.data.data.progress?.isComplete,
          'assessment.isComplete': progressResponse.data.data.assessment?.isComplete,
          'progress.completionPercentage': progressResponse.data.data.progress?.completionPercentage
        });
      }
    } catch (progressError) {
      console.log('Progress error:', progressError.response?.status, progressError.response?.data?.error?.message);
    }
    
    // Test results endpoint
    console.log('\n🎯 Testing results endpoint:');
    try {
      const resultsResponse = await axios.get(`${API_BASE}/assessment/results`, { headers });
      console.log('Results response structure:', {
        success: resultsResponse.data.success,
        hasData: !!resultsResponse.data.data,
        hasAssessment: !!resultsResponse.data.data?.assessment
      });
      
      if (resultsResponse.data.data?.assessment) {
        const assessment = resultsResponse.data.data.assessment;
        console.log('Results assessment data:', {
          id: assessment.id,
          isComplete: assessment.isComplete,
          hasProgress: !!assessment.progress,
          hasInterestProfile: !!assessment.interestProfile,
          completedAt: assessment.completedAt
        });
        
        if (assessment.progress) {
          console.log('Results progress data:', {
            totalQuestions: assessment.progress.totalQuestions,
            answeredQuestions: assessment.progress.answeredQuestions,
            completionPercentage: assessment.progress.completionPercentage,
            isComplete: assessment.progress.isComplete
          });
        }
      }
    } catch (resultsError) {
      console.log('Results error:', resultsError.response?.status, resultsError.response?.data?.error?.message);
    }
    
    console.log('\n🔍 Analysis complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testFrontendData();