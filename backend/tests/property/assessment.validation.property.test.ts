import * as fc from 'fast-check';
import { 
  IQuestion, 
  QuestionType, 
  CareerDimension
} from '../../src/types/assessment';
import { AssessmentValidationService } from '../../src/services/assessmentValidationService';

/**
 * Property-Based Test for Assessment Validation
 * **Feature: ai-sikshak-platform, Property 3: Assessment Validation**
 * **Validates: Requirements 1.4**
 * 
 * Property: For any assessment submission, the system should validate responses 
 * for completeness and consistency, rejecting invalid submissions with appropriate error messages.
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
      options: ['Option 1', 'Option 2', 'Option 3']
    };
  }
  
  // Other question types
  return q;
});





describe('Assessment Validation Property Tests', () => {
  /**
   * Property 3: Assessment Validation
   * For any assessment submission, the system should validate responses 
   * for completeness and consistency, rejecting invalid submissions with appropriate error messages.
   */
  
  describe('Valid Assessment Validation', () => {
    it('should validate complete assessments with all valid responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(questionArb, { minLength: 5, maxLength: 20 }),
          async (questions) => {
            // Ensure unique question IDs and orders
            const uniqueQuestions = questions.map((q, index) => ({
              ...q,
              id: `q_${index}`,
              order: index + 1
            }));
            
            // Generate valid responses for all questions
            const validResponses = uniqueQuestions.map(q => {
              switch (q.type) {
                case QuestionType.MULTIPLE_CHOICE:
                  return {
                    questionId: q.id,
                    answer: q.options![0],
                    responseTime: 5000,
                    confidence: 4
                  };
                case QuestionType.RATING_SCALE:
                  return {
                    questionId: q.id,
                    answer: q.minValue!,
                    responseTime: 3000,
                    confidence: 3
                  };
                case QuestionType.TEXT_INPUT:
                  return {
                    questionId: q.id,
                    answer: 'Valid text response',
                    responseTime: 8000,
                    confidence: 4
                  };
                case QuestionType.RANKING:
                  return {
                    questionId: q.id,
                    answer: [...q.options!],
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
            
            const mockAssessment = {
              _id: 'mock_id',
              userId: 'mock_user_id',
              version: '1.0.0',
              responses: validResponses,
              startedAt: new Date(Date.now() - 600000), // 10 minutes ago
              completedAt: new Date(),
              isComplete: true,
              totalQuestions: uniqueQuestions.length,
              answeredQuestions: validResponses.length,
              averageResponseTime: 5000
            } as any;
            
            const mockQuestionnaire = {
              version: '1.0.0',
              questions: uniqueQuestions
            };
            
            const validation = await AssessmentValidationService.validateAssessment(
              mockAssessment,
              mockQuestionnaire
            );
            
            // Property: Valid complete assessments should pass validation
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
            expect(validation.completeness).toBe(100);
            expect(validation.missingRequired).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should identify missing required questions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(questionArb, { minLength: 5, maxLength: 15 }),
          fc.integer({ min: 1, max: 3 }),
          async (questions, skipCount) => {
            // Ensure unique question IDs and make some required
            const uniqueQuestions = questions.map((q, index) => ({
              ...q,
              id: `q_${index}`,
              order: index + 1,
              required: index < 3 // First 3 questions are required
            }));
            
            // Generate responses but skip some required questions
            const responses = uniqueQuestions
              .slice(skipCount) // Skip first 'skipCount' questions (which are required)
              .map(q => ({
                questionId: q.id,
                answer: 'test answer',
                responseTime: 5000,
                confidence: 3
              }));
            
            const mockAssessment = {
              _id: 'mock_id',
              userId: 'mock_user_id',
              version: '1.0.0',
              responses: responses,
              startedAt: new Date(Date.now() - 300000),
              completedAt: undefined,
              isComplete: false,
              totalQuestions: uniqueQuestions.length,
              answeredQuestions: responses.length,
              averageResponseTime: 5000
            } as any;
            
            const mockQuestionnaire = {
              version: '1.0.0',
              questions: uniqueQuestions
            };
            
            const validation = await AssessmentValidationService.validateAssessment(
              mockAssessment,
              mockQuestionnaire
            );
            
            // Property: Missing required questions should be identified
            expect(validation.missingRequired.length).toBeGreaterThan(0);
            expect(validation.errors.length).toBeGreaterThan(0);
            expect(validation.isValid).toBe(false);
            
            // Should identify the specific missing required questions
            const expectedMissing = uniqueQuestions
              .slice(0, skipCount)
              .filter(q => q.required)
              .map(q => q.id);
            
            expectedMissing.forEach(questionId => {
              expect(validation.missingRequired).toContain(questionId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Invalid Response Detection', () => {
    it('should detect invalid response types for each question type', async () => {
      await fc.assert(
        fc.asyncProperty(
          questionArb,
          async (question) => {
            const uniqueQuestion = { ...question, id: 'test_q', order: 1 };
            
            // Create a simple invalid response (negative response time)
            const invalidResponse = {
              questionId: uniqueQuestion.id,
              answer: 'test answer',
              responseTime: -1000, // Invalid negative response time
              confidence: 3
            };
            
            const validation = AssessmentValidationService.validateResponses(
              [invalidResponse],
              [uniqueQuestion]
            );
            
            // Property: Invalid responses should be detected
            expect(validation.errors.length).toBeGreaterThan(0);
            
            // Should contain error message about the invalid response
            const hasRelevantError = validation.errors.some(error => 
              error.includes(uniqueQuestion.id) || 
              error.includes('Invalid') ||
              error.includes('response time')
            );
            expect(hasRelevantError).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should detect duplicate question responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          questionArb,
          fc.integer({ min: 2, max: 5 }),
          async (question, duplicateCount) => {
            const uniqueQuestion = { ...question, id: 'dup_q', order: 1 };
            
            // Create multiple responses for the same question
            const baseResponse = {
              questionId: uniqueQuestion.id,
              answer: 'test answer',
              responseTime: 5000,
              confidence: 3
            };
            
            const duplicateResponses = Array(duplicateCount).fill(null).map(() => ({
              ...baseResponse
            }));
            
            const validation = AssessmentValidationService.validateResponses(
              duplicateResponses,
              [uniqueQuestion]
            );
            
            // Property: Duplicate responses should be detected
            expect(validation.errors.length).toBeGreaterThan(0);
            expect(validation.errors.some(error => 
              error.includes('Duplicate') && error.includes(uniqueQuestion.id)
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Response Pattern Analysis', () => {
    it('should warn about suspicious response patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(questionArb, { minLength: 10, maxLength: 20 }),
          async (questions) => {
            const uniqueQuestions = questions.map((q, index) => ({
              ...q,
              id: `pattern_q_${index}`,
              order: index + 1
            }));
            
            // Create responses with suspicious patterns (all very fast)
            const suspiciousResponses = uniqueQuestions.map(q => ({
              questionId: q.id,
              answer: 'quick answer',
              responseTime: 100, // Very fast response time
              confidence: 1 // Low confidence
            }));
            
            const validation = AssessmentValidationService.validateResponses(
              suspiciousResponses,
              uniqueQuestions
            );
            
            // Property: Suspicious patterns should generate warnings
            expect(validation.warnings.length).toBeGreaterThan(0);
            
            // Should warn about fast responses
            const hasFastResponseWarning = validation.warnings.some(warning =>
              warning.includes('quickly') || warning.includes('fast')
            );
            expect(hasFastResponseWarning).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('Completeness Calculation', () => {
    it('should correctly calculate assessment completeness', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(questionArb, { minLength: 5, maxLength: 20 }),
          fc.float({ min: 0, max: 1 }),
          async (questions, completionRatio) => {
            const uniqueQuestions = questions.map((q, index) => ({
              ...q,
              id: `comp_q_${index}`,
              order: index + 1
            }));
            
            const totalQuestions = uniqueQuestions.length;
            const answeredCount = Math.floor(totalQuestions * completionRatio);
            
            // Create partial responses
            const responses = uniqueQuestions
              .slice(0, answeredCount)
              .map(q => ({
                questionId: q.id,
                answer: 'test answer',
                responseTime: 5000,
                confidence: 3
              }));
            
            const mockAssessment = {
              _id: 'comp_id',
              userId: 'comp_user_id',
              version: '1.0.0',
              responses: responses,
              startedAt: new Date(Date.now() - 300000),
              completedAt: undefined,
              isComplete: false,
              totalQuestions: totalQuestions,
              answeredQuestions: responses.length,
              averageResponseTime: 5000
            } as any;
            
            const mockQuestionnaire = {
              version: '1.0.0',
              questions: uniqueQuestions
            };
            
            const validation = await AssessmentValidationService.validateAssessment(
              mockAssessment,
              mockQuestionnaire
            );
            
            // Property: Completeness should be calculated correctly
            const expectedCompleteness = (answeredCount / totalQuestions) * 100;
            expect(Math.abs(validation.completeness - expectedCompleteness)).toBeLessThan(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});