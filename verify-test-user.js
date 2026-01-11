const { MongoClient } = require('mongodb');

const DATABASE_URL = 'mongodb://localhost:27017/ai-sikshak';

async function verifyTestUser() {
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    console.log('📦 Connected to MongoDB');
    
    const db = client.db('ai-sikshak');
    const users = db.collection('users');
    
    // Find and update the test user
    const result = await users.updateOne(
      { email: 'test@example.com' },
      { 
        $set: { 
          'security.emailVerified': true,
          'security.emailVerificationToken': null,
          'security.emailVerificationExpires': null
        }
      }
    );
    
    if (result.matchedCount > 0) {
      console.log('✅ Test user email verified successfully!');
    } else {
      console.log('❌ Test user not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

verifyTestUser();