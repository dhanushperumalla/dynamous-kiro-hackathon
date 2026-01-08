import { connectDatabase } from '@/config/database';
import { User } from '@/models/User';
import { AssessmentResponse } from '@/models/Assessment';
import { Questionnaire } from '@/models/Questionnaire';
import { logger } from '@/utils/logger';

/**
 * Check database contents
 */
async function checkDatabase() {
  try {
    logger.info('Checking database contents...');
    
    // Connect to database
    await connectDatabase();
    logger.info('Connected to database');
    
    // Check users
    const users = await User.find({});
    logger.info('Users in database', {
      count: users.length,
      users: users.map(u => ({
        id: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: u.isActive,
        emailVerified: u.security.emailVerified,
        createdAt: u.createdAt
      }))
    });
    
    // Check questionnaires
    const questionnaires = await Questionnaire.find({});
    logger.info('Questionnaires in database', {
      count: questionnaires.length,
      questionnaires: questionnaires.map(q => ({
        id: q._id,
        version: q.version,
        title: q.title,
        totalQuestions: q.totalQuestions,
        isActive: q.isActive
      }))
    });
    
    // Check assessments
    const assessments = await AssessmentResponse.find({});
    logger.info('Assessments in database', {
      count: assessments.length,
      assessments: assessments.map(a => ({
        id: a._id,
        userId: a.userId,
        version: a.version,
        isComplete: a.isComplete,
        answeredQuestions: a.answeredQuestions,
        totalQuestions: a.totalQuestions
      }))
    });
    
    process.exit(0);
  } catch (error) {
    logger.error('Database check failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

checkDatabase();