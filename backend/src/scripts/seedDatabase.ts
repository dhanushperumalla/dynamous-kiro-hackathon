import { connectDatabase } from '@/config/database';
import { createSampleQuestionnaire } from '@/data/sampleQuestionnaire';
import { logger } from '@/utils/logger';

/**
 * Seed the database with initial data
 */
async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');
    
    // Connect to database
    await connectDatabase();
    logger.info('Connected to database');
    
    // Create sample questionnaire
    const questionnaire = await createSampleQuestionnaire();
    logger.info('Sample questionnaire seeded', {
      id: questionnaire._id,
      version: questionnaire.version,
      totalQuestions: questionnaire.totalQuestions
    });
    
    // Set questionnaire as active
    questionnaire.isActive = true;
    await questionnaire.save();
    logger.info('Questionnaire set as active');
    
    logger.info('Database seeding completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };