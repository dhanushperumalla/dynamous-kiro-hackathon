import * as fc from 'fast-check';
import { RecommendationService } from '../../src/services/recommendationService';
import { CareerDomainService } from '../../src/services/careerDomainService';
import { 
  RecommendationAlgorithm
} from '../../src/types/recommendation';
import { 
  IInterestProfile, 
  CareerDimension 
} from '../../src/types/assessment';
import { connectDatabase } from '../../src/config/database';
import mongoose from 'mongoose';

/**
 * Property-Based Test for Recommendation Content Completeness
 * **Feature: ai-sikshak-platform, Property 6: Recommendation Content Completeness**
 * **Validates: Requirements 2.3, 2.4**
 * 
 * Property: For any generated recommendation, the system should include detailed descriptions, 
 * salary ranges, job growth projections, and required skills for each suggested domain.
 */

// Generators for property-based testing
const algorithmArb = fc.constantFrom(...Object.values(RecommendationAlgorithm));

// Generator for valid user IDs
const userIdArb = fc.string({ minLength: 24, maxLength: 24 })
  .filter(s => /^[a-f0-9]{24}$/.test(s));

// Generator for dimension scores (0-100)
const dimensionScoreArb = fc.integer({ min: 0, max: 100 });

// Generator for valid interest profiles
const interestProfileArb = fc.record({
  dimensions: fc.record({
    [CareerDimension.TECHNOLOGY]: dimensionScoreArb,
    [CareerDimension.CREATIVE]: dimensionScoreArb,
    [CareerDimension.ANALYTICAL]: dimensionScoreArb,
    [CareerDimension.SOCIAL]: dimensionScoreArb,
    [CareerDimension.ENTREPRENEURIAL]: dimensionScoreArb,
    [CareerDimension.LEADERSHIP]: dimensionScoreArb,
    [CareerDimension.RESEARCH]: dimensionScoreArb,
    [CareerDimension.PRACTICAL]: dimensionScoreArb,
    [CareerDimension.HELPING]: dimensionScoreArb,
    [CareerDimension.OUTDOOR]: dimensionScoreArb
  }),
  confidence: fc.integer({ min: 0, max: 100 }),
  completeness: fc.integer({ min: 0, max: 100 }),
  insights: fc.array(fc.string({ minLength: 10, maxLength: 200 }), { minLength: 1, maxLength: 3 })
}).map((profile): IInterestProfile => {
  // Calculate top dimensions based on scores
  const dimensionEntries = Object.entries(profile.dimensions) as [CareerDimension, number][];
  const sortedDimensions = dimensionEntries
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([dimension]) => dimension);
  
  return {
    ...profile,
    topDimensions: sortedDimensions
  };
});

describe('Recommendation Content Completeness Property Tests', () => {
  beforeAll(async () => {
    await connectDatabase();
    // Seed domains if not already present
    await CareerDomainService.seedDomains();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  /**
   * Property 6: Recommendation Content Completeness
   * For any generated recommendation, the system should include detailed descriptions, 
   * salary ranges, job growth projections, and required skills for each suggested domain.
   */
  
  describe('Domain Content Completeness', () => {
    it('should include all required content for recommended domains', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          interestProfileArb,
          algorithmArb,
          async (userId, interestProfile, algorithm) => {
            const recommendation = await RecommendationService.generateRecommendations(
              userId,
              interestProfile,
              algorithm,
              3
            );
            
            // Property: Each recommended domain should have complete content
            recommendation.domains.forEach((recommendedDomain) => {
              expect(recommendedDomain.domain).toBeDefined();
              expect(typeof recommendedDomain.domain).toBe('object');
              
              // Requirement 2.3: Detailed descriptions should be present
              expect(recommendedDomain.domain).toHaveProperty('description');
              expect(typeof recommendedDomain.domain.description).toBe('string');
              expect(recommendedDomain.domain.description.trim().length).toBeGreaterThan(10);
              
              expect(recommendedDomain.domain).toHaveProperty('detailedDescription');
              expect(typeof recommendedDomain.domain.detailedDescription).toBe('string');
              expect(recommendedDomain.domain.detailedDescription.trim().length).toBeGreaterThan(20);
              
              // Requirement 2.4: Salary ranges should be present
              expect(recommendedDomain.domain).toHaveProperty('marketData');
              expect(recommendedDomain.domain.marketData).toHaveProperty('averageSalaryRange');
              
              const salaryRange = recommendedDomain.domain.marketData.averageSalaryRange;
              expect(salaryRange).toHaveProperty('min');
              expect(salaryRange).toHaveProperty('max');
              expect(salaryRange).toHaveProperty('median');
              expect(typeof salaryRange.min).toBe('number');
              expect(typeof salaryRange.max).toBe('number');
              expect(typeof salaryRange.median).toBe('number');
              expect(salaryRange.min).toBeGreaterThan(0);
              expect(salaryRange.max).toBeGreaterThanOrEqual(salaryRange.min);
              expect(salaryRange.median).toBeGreaterThanOrEqual(salaryRange.min);
              expect(salaryRange.median).toBeLessThanOrEqual(salaryRange.max);
              
              // Requirement 2.4: Job growth projections should be present
              expect(recommendedDomain.domain.marketData).toHaveProperty('jobGrowthRate');
              expect(typeof recommendedDomain.domain.marketData.jobGrowthRate).toBe('number');
              expect(recommendedDomain.domain.marketData.jobGrowthRate).toBeGreaterThanOrEqual(-50);
              expect(recommendedDomain.domain.marketData.jobGrowthRate).toBeLessThanOrEqual(200);
              
              // Requirement 2.4: Required skills should be present
              expect(recommendedDomain.domain).toHaveProperty('requiredSkills');
              expect(Array.isArray(recommendedDomain.domain.requiredSkills)).toBe(true);
              expect(recommendedDomain.domain.requiredSkills.length).toBeGreaterThan(0);
              
              // Each skill should have proper structure
              recommendedDomain.domain.requiredSkills.forEach((skill: any) => {
                expect(skill).toHaveProperty('name');
                expect(skill).toHaveProperty('description');
                expect(skill).toHaveProperty('importance');
                expect(typeof skill.name).toBe('string');
                expect(typeof skill.description).toBe('string');
                expect(typeof skill.importance).toBe('number');
                expect(skill.name.trim().length).toBeGreaterThan(0);
                expect(skill.description.trim().length).toBeGreaterThan(0);
                expect(skill.importance).toBeGreaterThanOrEqual(1);
                expect(skill.importance).toBeLessThanOrEqual(10);
              });
            });
          }
        ),
        { numRuns: 3 }
      );
    });
  });
});