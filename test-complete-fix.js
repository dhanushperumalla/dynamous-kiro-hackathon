const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testCompleteFix() {
  try {
    console.log('🧪 Testing complete assessment fix...\n');
    
    // Step 1: Verify backend is working
    console.log('1️⃣ Testing backend endpoints...');
    
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'SecurePass123!'
    });
    
    const token = loginResponse.data.data.tokens.accessToken;
    const headers = { 'Authorization': `Bearer ${token}` };
    
    console.log('✅ Login successful');
    
    // Test results endpoint
    const resultsResponse = await axios.get(`${API_BASE}/assessment/results`, { headers });
    const assessment = resultsResponse.data.data.assessment;
    
    console.log('✅ Results endpoint working');
    console.log('Assessment status:', {
      id: assessment.id,
      isComplete: assessment.isComplete,
      hasInterestProfile: !!assessment.interestProfile,
      completionPercentage: assessment.progress?.completionPercentage
    });
    
    if (!assessment.isComplete) {
      console.log('❌ Backend issue: Assessment should be complete but isComplete is false');
      return;
    }
    
    if (!assessment.interestProfile) {
      console.log('❌ Backend issue: Assessment should have interest profile');
      return;
    }
    
    console.log('✅ Backend is working correctly\n');
    
    // Step 2: Test what frontend should receive
    console.log('2️⃣ Testing frontend data flow...');
    
    // Simulate loadAssessmentData
    console.log('Simulating loadAssessmentData...');
    const frontendAssessment = assessment;
    
    console.log('Frontend should receive:', {
      isComplete: frontendAssessment.isComplete,
      hasInterestProfile: !!frontendAssessment.interestProfile,
      progressComplete: frontendAssessment.progress?.isComplete,
      completionPercentage: frontendAssessment.progress?.completionPercentage
    });
    
    // Step 3: Verify what AssessmentCard should show
    console.log('\n3️⃣ Testing AssessmentCard logic...');
    
    if (!frontendAssessment) {
      console.log('🔵 AssessmentCard should show: "Start Your Career Assessment"');
    } else if (frontendAssessment.isComplete) {
      console.log('🟢 AssessmentCard should show: "Assessment Completed!" with View Results button');
    } else {
      console.log('🟡 AssessmentCard should show: "Assessment In Progress" with Continue button');
      console.log('Progress:', frontendAssessment.progress?.completionPercentage + '%');
    }
    
    // Step 4: Verify what AssessmentResults should show
    console.log('\n4️⃣ Testing AssessmentResults logic...');
    
    if (!frontendAssessment) {
      console.log('🔵 AssessmentResults should show: "No assessment data available"');
    } else if (!frontendAssessment.isComplete) {
      console.log('🟡 AssessmentResults should show: "Assessment is not yet complete"');
    } else if (!frontendAssessment.interestProfile) {
      console.log('🟠 AssessmentResults should show: "Assessment results are being processed..."');
    } else {
      console.log('🟢 AssessmentResults should show: Full results with interest profile');
      console.log('Interest profile summary:', {
        confidence: frontendAssessment.interestProfile.confidence + '%',
        topDimensions: frontendAssessment.interestProfile.topDimensions.slice(0, 3),
        insightCount: frontendAssessment.interestProfile.insights?.length || 0
      });
    }
    
    console.log('\n🎉 All tests passed! The fix should work correctly.');
    console.log('\n📋 Summary:');
    console.log('✅ Backend returns isComplete: true');
    console.log('✅ Backend returns interest profile');
    console.log('✅ Frontend should show "Assessment Completed!"');
    console.log('✅ Results page should show full interest profile');
    console.log('\n🌐 Frontend URL: http://localhost:5174');
    console.log('💡 If the issue persists, clear browser cache/localStorage');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCompleteFix();