import mongoose from 'mongoose';
import { CareerDomainService } from '@/services/careerDomainService';
import { logger } from '@/utils/logger';
import { connectDatabase } from '@/config/database';

/**
 * Seed career domains script
 * This script populates the database with sample career domain data
 */
async function seedCareerDomains(): Promise<void> {
  try {
    logger.info('Starting career domains seeding process');
    
    // Connect to database
    await connectDatabase();
    logger.info('Connected to database successfully');
    
    // Seed career domains
    await CareerDomainService.seedDomains();
    
    // Get statistics after seeding
    const stats = await CareerDomainService.getDomainStatistics();
    logger.info('Career domains seeding completed successfully', {
      totalDomains: stats.totalDomains,
      categoryDistribution: stats.categoryDistribution,
      difficultyDistribution: stats.difficultyDistribution
    });
    
    // Display seeded domains summary
    const allDomains = await CareerDomainService.getAllDomains();
    console.log('\n=== Seeded Career Domains ===');
    allDomains.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain.title} (${domain.category})`);
      console.log(`   - Difficulty: ${domain.difficulty}`);
      console.log(`   - Time to Mastery: ${domain.timeToMastery} months`);
      console.log(`   - Market Demand Score: ${domain.marketData.demandScore}/100`);
      console.log(`   - Average Salary: $${domain.marketData.averageSalaryRange.median.toLocaleString()}`);
      console.log(`   - Job Growth Rate: ${domain.marketData.jobGrowthRate}%`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during career domains seeding', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding script if called directly
if (require.main === module) {
  seedCareerDomains();
}

export { seedCareerDomains };