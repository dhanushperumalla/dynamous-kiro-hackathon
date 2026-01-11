const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test user credentials (you'll need to use an existing user or create one)
const testUser = {
  email: 'test@example.com',
  password: 'SecurePass123!'
};

async function testAssessmentFlow() {
  try {
    console.log('🔐 Logging in...');
    
    // Login to get token
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, testUser);
    const token = loginResponse.data.data.tokens.accessToken;
    
    console.log('✅ Login successful');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('📋 Getting questionnaire...');
    
    // Get questionnaire
    const questionnaireResponse = await axios.get(`${API_BASE}/assessment/questionnaire`);
    const questionnaire = questionnaireResponse.data.data.questionnaire;
    
    console.log(`✅ Got questionnaire with ${questionnaire.questions.length} questions`);
    
    console.log('🚀 Starting assessment...');
    
    // Start assessment
    const startResponse = await axios.post(`${API_BASE}/assessment/start`, {}, { headers });
    const assessment = startResponse.data.data.assessment;
    
    console.log(`✅ Assessment started: ${assessment.id}`);
    
    console.log('📝 Submitting responses...');
    
    // Create sample responses for all questions
    const responses = questionnaire.questions.map((question, index) => {
      let answer;
      
      switch (question.type) {
        case 'rating_scale':
          answer = Math.floor(Math.random() * 5) + 1; // 1-5
          break;
        case 'multiple_choice':
          answer = question.options[Math.floor(Math.random() * question.options.length)];
          break;
        case 'boolean':
          answer = Math.random() > 0.5;
          break;
        case 'text_input':
        case 'text':
          answer = `Sample text response for question ${index + 1}`;
          break;
        default:
          answer = 3; // Default rating
      }
      
      return {
        questionId: question.id,
        answer: answer,
        responseTime: Math.floor(Math.random() * 10000) + 2000, // 2-12 seconds
        confidence: Math.floor(Math.random() * 5) + 1
      };
    });
    
    console.log(`📤 Submitting ${responses.length} responses...`);
    
    // Submit all responses
    const submitResponse = await axios.post(`${API_BASE}/assessment/submit`, {
      responses: responses,
      isPartial: false
    }, { headers });
    
    const completedAssessment = submitResponse.data.data.assessment;
    
    console.log('✅ Assessment submitted successfully!');
    console.log(`📊 Assessment Status:`, {
      id: completedAssessment.id,
      isComplete: completedAssessment.isComplete,
      answeredQuestions: completedAssessment.progress.answeredQuestions,
      totalQuestions: completedAssessment.progress.totalQuestions,
      completionPercentage: completedAssessment.progress.completionPercentage,
      hasInterestProfile: !!completedAssessment.interestProfile
    });
    
    if (completedAssessment.interestProfile) {
      console.log('🎯 Interest Profile Generated:');
      console.log(`   Confidence: ${completedAssessment.interestProfile.confidence}%`);
      console.log(`   Top Dimensions: ${completedAssessment.interestProfile.topDimensions.slice(0, 3).join(', ')}`);
      console.log(`   Insights: ${completedAssessment.interestProfile.insights.length} insights`);
    }
    
    console.log('🔍 Getting results...');
    
    // Get results
    const resultsResponse = await axios.get(`${API_BASE}/assessment/results`, { headers });
    const results = resultsResponse.data.data.assessment;
    
    console.log('✅ Results retrieved successfully!');
    console.log(`📈 Results Status:`, {
      id: results.id,
      isComplete: results.isComplete,
      hasInterestProfile: !!results.interestProfile,
      completedAt: results.completedAt
    });
    
    console.log('🎉 Assessment flow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('Error details:', error.response.data.error);
    }
  }
}

// Run the test
testAssessmentFlow();