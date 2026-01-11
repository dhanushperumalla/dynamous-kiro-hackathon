const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test user to create
const testUser = {
  email: 'test@example.com',
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!',
  firstName: 'Test',
  lastName: 'User',
  currentStatus: 'student',
  acceptedTerms: true
};

async function createTestUser() {
  try {
    console.log('👤 Creating test user...');
    
    // Register user
    const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
    
    console.log('✅ User created successfully!');
    console.log('User ID:', registerResponse.data.data.user.id);
    console.log('Email:', registerResponse.data.data.user.email);
    
    return registerResponse.data.data.user;
    
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.code === 'USER_ALREADY_EXISTS') {
      console.log('ℹ️ User already exists, that\'s fine!');
      return null;
    }
    
    console.error('❌ Failed to create user:', error.response?.data || error.message);
    throw error;
  }
}

// Run the creation
createTestUser();