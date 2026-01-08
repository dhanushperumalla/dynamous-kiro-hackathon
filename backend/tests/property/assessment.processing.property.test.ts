import * as fc from 'fast-check';
import { 
  IQuestion, 
  IQuestionResponse,
  QuestionType, 
  CareerDimension 
} from '../../src/types/assessment';
import { InterestAnalysisService } from '../../src/services/interestAnalysisService';

/**
 * Property-Based Test for Assessment Response Processing
 * **Feature: ai-sikshak-platform, Property 2: Assessment Response Processing**
 * **Validates: Requirements 1.2, 1.3**
 * 
 * Property: For any valid set of assessment responses, the Assessment Engine should analyze them 
 * using NLP and ML algorithms and produce a properly structured interest profile with quantified scores.
 */

// Generators for property-based testing
const careerDimensionArb = fc.constantFrom(...Object.values(CareerDimension));
const questionTypeArb = fc.constantFrom(...Object.values(QuestionType));

// Generator for valid question IDs
const questionIdArb = fc.string({ minLength: 3, maxLength: 20 })
  .filter(s => /^[a-zA-Z0-9_-]+$/.test(s));

// Generator for valid questions
const questionArb = fc.record({
  id: questionIdArb,
  text: fc.string({ minLength: 10, maxLength: 500 }),
  type: questionTypeArb,
  category: fc.string({ minLength: 1, maxLength: 100 }),
  dimension: careerDimensionArb,
  weight: fc.integer({ min: 1, max: 10 }),
  required: fc.boolean(),
  order: fc.integer({ min: 1, max: 100 })
}).map((q): IQuestion => {
  // Ensure rating scale questions have min/max values
  if (q.type === QuestionType.RATING_SCALE) {
    return {
      ...q,
      minValue: 1,
      maxValue: 5
    };
  }
  
  // Ensure multiple choice and ranking questions have options
  if (q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.RANKING) {
    return {
      ...q,
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4']
    };
  }
  
  // Other question types
  return q;
});



describe('Assessment Processing Property Tests', () => {
  /**
   * Property 2: Assessment Response Processing
   * For any valid set of assessment responses, the Assessment Engine should analyze them 
   * using NLP and ML algorithms and produce a properly structured interest profile with quantified scores.
   */
  
  describe('Interest Profile Generation', () => {
    it('should generate valid interest profiles for any set of valid responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(questionArb, { minLength: 5, maxLength: 30 }),
          async (questions) => {
            // Ensure unique question IDs and orders
            const uniqueQuestions = questions.map((q, index) => ({
              ...q,
              id: `q_${index}`,
              order: index + 1
            }));
            
            // Generate valid responses for all questions
            const responses: IQuestionResponse[] = uniqueQuestions.map(q => {
              switch (q.type) {
                case QuestionType.MULTIPLE_CHOICE:
                  return {
                    questionId: q.id,
                    answer: q.options?.[0] || 'Option 1',
                    responseTime: 5000,
                    confidence: 4
                  };
                case QuestionType.RATING_SCALE:
                  return {
                    questionId: q.id,
                    answer: q.minValue || 3,
                    responseTime: 3000,
                    confidence: 3
                  };
                case QuestionType.TEXT_INPUT:
                  return {
                    questionId: q.id,
                    answer: 'I enjoy working with technology and solving problems',
                    responseTime: 8000,
                    confidence: 4
                  };
                case QuestionType.RANKING:
                  return {
                    questionId: q.id,
                    answer: q.options || ['Option 1', 'Option 2'],
                    responseTime: 15000,
                    confidence: 3
                  };
                case QuestionType.BOOLEAN:
                  return {
                    questionId: q.id,
                    answer: true,
                    responseTime: 2000,
                    confidence: 5
                  };
                default:
                  return {
                    questionId: q.id,
                    answer: 'default',
                    responseTime: 5000,
                    confidence: 3
                  };
              }
            });
            
            const profile = await InterestAnalysisService.analyzeResponses(responses, uniqueQuestions);
            
            // Property: Generated profile should have valid structure
            expect(profile).toBeDefined();
            expect(typeof profile).toBe('object');
            
            // Validate dimensions
            expect(profile.dimensions).toBeDefined();
            expect(typeof profile.dimensions).toBe('object');
            
            // All career dimensions should be present
            Object.values(CareerDimension).forEach(dimension => {
              expect(profile.dimensions).toHaveProperty(dimension);
              expect(typeof profile.dimensions[dimension]).toBe('number');
              expect(profile.dimensions[dimension]).toBeGreaterThanOrEqual(0);
              expect(profile.dimensions[dimension]).toBeLessThanOrEqual(100);
            });
            
            // Validate confidence score
            expect(typeof profile.confidence).toBe('number');
            expect(profile.confidence).toBeGreaterThanOrEqual(0);
            expect(profile.confidence).toBeLessThanOrEqual(100);
            
            // Validate completeness score
            expect(typeof profile.completeness).toBe('number');
            expect(profile.completeness).toBeGreaterThanOrEqual(0);
            expect(profile.completeness).toBeLessThanOrEqual(100);
            
            // Validate top dimensions
            expect(Array.isArray(profile.topDimensions)).toBe(true);
            expect(profile.topDimensions.length).toBeGreaterThan(0);
            expect(profile.topDimensions.length).toBeLessThanOrEqual(5);
            
            // Top dimensions should be valid career dimensions
            profile.topDimensions.forEach(dimension => {
              expect(Object.values(CareerDimension)).toContain(dimension);
            });
            
            // Validate insights
            expect(Array.isArray(profile.insights)).toBe(true);
            expect(profile.insights.length).toBeLessThanOrEqual(5);
            
            // All insights should be non-empty strings
            profile.insights.forEach(insight => {
              expect(typeof insight).toBe('string');
              expect(insight.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should calculate completeness correctly based on response count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(questionArb, { minLength: 10, maxLength: 20 }),
          fc.float({ min: 0.1, max: 1.0 }),
          async (questions, completionRatio) => {
            // Ensure unique question IDs
            const uniqueQuestions = questions.map((q, index) => ({
              ...q,
              id: `q_${index}`,
              order: index + 1
            }));
            
            const totalQuestions = uniqueQuestions.length;
            const responseCount = Math.floor(totalQuestions * completionRatio);
            
            // Generate responses for subset of questions
            const responses: IQuestionResponse[] = uniqueQuestions
              .slice(0, responseCount)
              .map(q => ({
                questionId: q.id,
                answer: 'test answer',
                responseTime: 5000,
                confidence: 3
              }));
            
            const profile = await InterestAnalysisService.analyzeResponses(responses, uniqueQuestions);
            
            // Property: Completeness should match actual completion ratio
            const expectedCompleteness = Math.round((responseCount / totalQuestions) * 100);
            expect(Math.abs(profile.completeness - expectedCompleteness)).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Dimension Score Calculation', () => {
    it('should calculate dimension scores based on question weights and responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          careerDimensionArb,
          fc.integer({ min: 3, max: 8 }),
          async (targetDimension, questionCount) => {
            // Create questions all targeting the same dimension
            const questions: IQuestion[] = Array.from({ length: questionCount }, (_, index) => ({
              id: `q_${index}`,
              text: `Question ${index + 1}`,
              type: QuestionType.RATING_SCALE,
              category: 'Test Category',
              dimension: targetDimension,
              weight: 5, // Fixed weight
              minValue: 1,
              maxValue: 5,
              required: true,
              order: index + 1
            }));
            
            // Create responses with maximum scores
            const responses: IQuestionResponse[] = questions.map(q => ({
              questionId: q.id,
              answer: 5, // Maximum rating
              responseTime: 5000,
              confidence: 5
            }));
            
            const profile = await InterestAnalysisService.analyzeResponses(responses, questions);
            
            // Property: Target dimension should have high score when all responses are maximum
            expect(profile.dimensions[targetDimension]).toBeGreaterThan(80);
            
            // Property: Target dimension should be in top dimensions
            expect(profile.topDimensions).toContain(targetDimension);
            expect(profile.topDimensions[0]).toBe(targetDimension);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should produce different scores for different response patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(questionArb, { minLength: 10, maxLength: 15 }),
          async (questions) => {
            // Ensure unique question IDs
            const uniqueQuestions = questions.map((q, index) => ({
              ...q,
              id: `q_${index}`,
              order: index + 1,
              type: QuestionType.RATING_SCALE,
              minValue: 1,
              maxValue: 5
            }));
            
            // Create two different response patterns
            const highResponses: IQuestionResponse[] = uniqueQuestions.map(q => ({
              questionId: q.id,
              answer: 5, // High scores
              responseTime: 5000,
              confidence: 4
            }));
            
            const lowResponses: IQuestionResponse[] = uniqueQuestions.map(q => ({
              questionId: q.id,
              answer: 1, // Low scores
              responseTime: 5000,
              confidence: 4
            }));
            
            const highProfile = await InterestAnalysisService.analyzeResponses(highResponses, uniqueQuestions);
            const lowProfile = await InterestAnalysisService.analyzeResponses(lowResponses, uniqueQuestions);
            
            // Property: Different response patterns should produce different dimension scores
            let hasDifference = false;
            Object.values(CareerDimension).forEach(dimension => {
              if (Math.abs(highProfile.dimensions[dimension] - lowProfile.dimensions[dimension]) > 10) {
                hasDifference = true;
              }
            });
            
            expect(hasDifference).toBe(true);
            
            // Property: High responses should generally produce higher average scores
            const highAvg = Object.values(highProfile.dimensions).reduce((sum, score) => sum + score, 0) / Object.values(CareerDimension).length;
            const lowAvg = Object.values(lowProfile.dimensions).reduce((sum, score) => sum + score, 0) / Object.values(CareerDimension).length;
            
            expect(highAvg).toBeGreaterThan(lowAvg);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Confidence Score Calculation', () => {
    it('should calculate higher confidence for consistent response patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(questionArb, { minLength: 8, maxLength: 12 }),
          async (questions) => {
            // Ensure unique question IDs and same dimension
            const uniqueQuestions = questions.map((q, index) => ({
              ...q,
              id: `q_${index}`,
              order: index + 1,
              type: QuestionType.RATING_SCALE,
              dimension: CareerDimension.TECHNOLOGY, // Same dimension for consistency
              minValue: 1,
              maxValue: 5
            }));
            
            // Create consistent responses (all high confidence, similar response times)
            const consistentResponses: IQuestionResponse[] = uniqueQuestions.map(q => ({
              questionId: q.id,
              answer: 4, // Consistent rating
              responseTime: 5000, // Consistent timing
              confidence: 5 // High confidence
            }));
            
            // Create inconsistent responses (varying confidence, erratic timing)
            const inconsistentResponses: IQuestionResponse[] = uniqueQuestions.map((q, index) => ({
              questionId: q.id,
              answer: index % 2 === 0 ? 5 : 1, // Alternating ratings
              responseTime: index % 2 === 0 ? 1000 : 30000, // Erratic timing
              confidence: index % 2 === 0 ? 5 : 1 // Varying confidence
            }));
            
            const consistentProfile = await InterestAnalysisService.analyzeResponses(consistentResponses, uniqueQuestions);
            const inconsistentProfile = await InterestAnalysisService.analyzeResponses(inconsistentResponses, uniqueQuestions);
            
            // Property: Consistent responses should produce higher confidence scores
            expect(consistentProfile.confidence).toBeGreaterThan(inconsistentProfile.confidence);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Text Response Analysis', () => {
    it('should analyze text sentiment and incorporate into scoring', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 6 }),
          async (questionCount) => {
            // Create text input questions
            const questions: IQuestion[] = Array.from({ length: questionCount }, (_, index) => ({
              id: `text_q_${index}`,
              text: `Describe your interest in ${CareerDimension.TECHNOLOGY}`,
              type: QuestionType.TEXT_INPUT,
              category: 'Text Analysis',
              dimension: CareerDimension.TECHNOLOGY,
              weight: 5,
              required: true,
              order: index + 1
            }));
            
            // Create positive text responses
            const positiveResponses: IQuestionResponse[] = questions.map(q => ({
              questionId: q.id,
              answer: 'I love working with technology and enjoy solving complex problems. It is amazing and exciting.',
              responseTime: 10000,
              confidence: 4
            }));
            
            // Create negative text responses
            const negativeResponses: IQuestionResponse[] = questions.map(q => ({
              questionId: q.id,
              answer: 'I hate technology and find it boring. I never want to work with computers.',
              responseTime: 10000,
              confidence: 4
            }));
            
            const positiveProfile = await InterestAnalysisService.analyzeResponses(positiveResponses, questions);
            const negativeProfile = await InterestAnalysisService.analyzeResponses(negativeResponses, questions);
            
            // Property: Positive text should result in higher technology dimension scores
            expect(positiveProfile.dimensions[CareerDimension.TECHNOLOGY])
              .toBeGreaterThan(negativeProfile.dimensions[CareerDimension.TECHNOLOGY]);
            
            // Property: Both profiles should have valid structure
            expect(positiveProfile.insights.length).toBeGreaterThan(0);
            expect(negativeProfile.insights.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Top Dimensions Identification', () => {
    it('should correctly identify top dimensions based on scores', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.shuffledSubarray(Object.values(CareerDimension), { minLength: 3, maxLength: 5 }),
          async (targetDimensions) => {
            // Create questions targeting specific dimensions with high weights
            const questions: IQuestion[] = [];
            let questionId = 0;
            
            // Add high-weight questions for target dimensions
            targetDimensions.forEach(dimension => {
              for (let i = 0; i < 3; i++) {
                questions.push({
                  id: `q_${questionId++}`,
                  text: `Question for ${dimension}`,
                  type: QuestionType.RATING_SCALE,
                  category: 'Target Category',
                  dimension,
                  weight: 10, // High weight
                  minValue: 1,
                  maxValue: 5,
                  required: true,
                  order: questionId
                });
              }
            });
            
            // Add low-weight questions for other dimensions
            Object.values(CareerDimension)
              .filter(d => !targetDimensions.includes(d))
              .forEach(dimension => {
                questions.push({
                  id: `q_${questionId++}`,
                  text: `Question for ${dimension}`,
                  type: QuestionType.RATING_SCALE,
                  category: 'Other Category',
                  dimension,
                  weight: 1, // Low weight
                  minValue: 1,
                  maxValue: 5,
                  required: true,
                  order: questionId
                });
              });
            
            // Create responses with high scores for target dimensions
            const responses: IQuestionResponse[] = questions.map(q => ({
              questionId: q.id,
              answer: targetDimensions.includes(q.dimension) ? 5 : 1,
              responseTime: 5000,
              confidence: 4
            }));
            
            const profile = await InterestAnalysisService.analyzeResponses(responses, questions);
            
            // Property: Target dimensions should appear in top dimensions
            const topDimensionsSet = new Set(profile.topDimensions);
            targetDimensions.forEach(dimension => {
              expect(topDimensionsSet.has(dimension)).toBe(true);
            });
            
            // Property: Top dimensions should be sorted by score (descending)
            for (let i = 0; i < profile.topDimensions.length - 1; i++) {
              const currentDimension = profile.topDimensions[i];
              const nextDimension = profile.topDimensions[i + 1];
              if (currentDimension && nextDimension) {
                const currentScore = profile.dimensions[currentDimension];
                const nextScore = profile.dimensions[nextDimension];
                expect(currentScore).toBeGreaterThanOrEqual(nextScore);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});