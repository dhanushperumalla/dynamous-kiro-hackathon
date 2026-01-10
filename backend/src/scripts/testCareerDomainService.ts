import { CareerDomainService } from '@/services/careerDomainService';
import { DomainCategory, DifficultyLevel } from '@/types/recommendation';
import { logger } from '@/utils/logger';
import { connectDatabase } from '@/config/database';

/**
 * Test script for CareerDomainService
 * This script tests various service methods to ensure they work correctly
 */
async function testCareerDomainService(): Promise<void> {
  try {
    logger.info('Starting CareerDomainService tests');
    
    // Connect to database
    await connectDatabase();
    logger.info('Connected to database successfully');
    
    // Test 1: Get all domains
    console.log('\n=== Test 1: Get All Domains ===');
    const allDomains = await CareerDomainService.getAllDomains();
    console.log(`Found ${allDomains.length} active domains`);
    
    // Test 2: Get domains by category
    console.log('\n=== Test 2: Get Domains by Category (Technology) ===');
    const techDomains = await CareerDomainService.getDomainsByCategory(DomainCategory.TECHNOLOGY);
    console.log(`Found ${techDomains.length} technology domains:`);
    techDomains.forEach(domain => {
      console.log(`- ${domain.title} (${domain.name})`);
    });
    
    // Test 3: Get domains by difficulty
    console.log('\n=== Test 3: Get Domains by Difficulty (Intermediate) ===');
    const intermediateDomains = await CareerDomainService.getDomainsByDifficulty(DifficultyLevel.INTERMEDIATE);
    console.log(`Found ${intermediateDomains.length} intermediate domains:`);
    intermediateDomains.forEach(domain => {
      console.log(`- ${domain.title} (${domain.difficulty})`);
    });
    
    // Test 4: Get top demand domains
    console.log('\n=== Test 4: Get Top Demand Domains ===');
    const topDemandDomains = await CareerDomainService.getTopDemandDomains(3);
    console.log(`Top 3 demand domains:`);
    topDemandDomains.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain.title} - Demand Score: ${domain.marketData.demandScore}/100`);
    });
    
    // Test 5: Get high growth domains
    console.log('\n=== Test 5: Get High Growth Domains ===');
    const highGrowthDomains = await CareerDomainService.getHighGrowthDomains(3);
    console.log(`Top 3 growth domains:`);
    highGrowthDomains.forEach((domain, index) => {
      console.log(`${index + 1}. ${domain.title} - Growth Rate: ${domain.marketData.jobGrowthRate}%`);
    });
    
    // Test 6: Search domains
    console.log('\n=== Test 6: Search Domains (programming) ===');
    const searchResults = await CareerDomainService.searchDomains({
      query: 'programming',
      limit: 5
    });
    console.log(`Found ${searchResults.domains.length} domains matching 'programming':`);
    searchResults.domains.forEach(domain => {
      console.log(`- ${domain.title}`);
    });
    
    // Test 7: Get domain by name
    console.log('\n=== Test 7: Get Domain by Name (software-development) ===');
    const softwareDomain = await CareerDomainService.getDomainByName('software-development');
    if (softwareDomain) {
      console.log(`Found domain: ${softwareDomain.title}`);
      console.log(`Description: ${softwareDomain.description}`);
      console.log(`Required Skills: ${softwareDomain.requiredSkills.length}`);
      console.log(`Career Paths: ${softwareDomain.careerPaths.length}`);
    }
    
    // Test 8: Get domains in salary range
    console.log('\n=== Test 8: Get Domains in Salary Range ($80k - $120k) ===');
    const salaryRangeDomains = await CareerDomainService.getDomainsInSalaryRange(80000, 120000);
    console.log(`Found ${salaryRangeDomains.length} domains in salary range:`);
    salaryRangeDomains.forEach(domain => {
      console.log(`- ${domain.title}: $${domain.marketData.averageSalaryRange.median.toLocaleString()}`);
    });
    
    // Test 9: Get domain statistics
    console.log('\n=== Test 9: Get Domain Statistics ===');
    const stats = await CareerDomainService.getDomainStatistics();
    console.log('Domain Statistics:');
    console.log(`- Total Domains: ${stats.totalDomains}`);
    console.log(`- Average Demand Score: ${stats.averageDemandScore}`);
    console.log(`- Average Growth Rate: ${stats.averageGrowthRate}%`);
    console.log(`- Average Time to Mastery: ${stats.averageTimeToMastery} months`);
    console.log('- Category Distribution:', stats.categoryDistribution);
    console.log('- Difficulty Distribution:', stats.difficultyDistribution);
    
    // Test 10: Calculate market score
    if (softwareDomain) {
      console.log('\n=== Test 10: Calculate Market Score ===');
      const marketScore = CareerDomainService.calculateMarketScore(softwareDomain);
      console.log(`Market score for ${softwareDomain.title}: ${marketScore}/100`);
    }
    
    logger.info('All CareerDomainService tests completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during CareerDomainService tests', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('Tests failed:', error);
    process.exit(1);
  }
}

// Run the test script if called directly
if (require.main === module) {
  testCareerDomainService();
}

export { testCareerDomainService };