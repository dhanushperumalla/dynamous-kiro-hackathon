import { CareerDomain } from '@/models/CareerDomain';
import { logger } from '@/utils/logger';
import { connectDatabase } from '@/config/database';

/**
 * Create database indexes script
 * This script ensures all required indexes are created for optimal performance
 */
async function createIndexes(): Promise<void> {
  try {
    logger.info('Starting database index creation');
    
    // Connect to database
    await connectDatabase();
    logger.info('Connected to database successfully');
    
    // Create indexes for CareerDomain collection
    logger.info('Creating indexes for CareerDomain collection');
    
    // The schema already defines indexes, but we can ensure they're created
    await CareerDomain.createIndexes();
    
    // List all indexes to verify
    const indexes = await CareerDomain.collection.getIndexes();
    
    logger.info('CareerDomain indexes created successfully');
    console.log('\n=== CareerDomain Collection Indexes ===');
    Object.keys(indexes).forEach(indexName => {
      console.log(`- ${indexName}: ${JSON.stringify(indexes[indexName])}`);
    });
    
    logger.info('All database indexes created successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error creating database indexes', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('Index creation failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  createIndexes();
}

export { createIndexes };