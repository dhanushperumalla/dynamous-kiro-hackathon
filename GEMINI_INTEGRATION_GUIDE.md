# Gemini AI Integration Guide

## Overview

The Gemini AI service has been integrated into the AI-Sikshak backend to provide:
- AI-powered career recommendations
- Personalized learning roadmap generation
- Assessment analysis and insights
- Study tips and personalized guidance

## Configuration

### Environment Variables

Added to `backend/.env`:
```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-pro
AI_PROVIDER=gemini
```

### Package Installation

Installed the Gemini SDK:
```bash
npm install @google/generative-ai
```

## Service Location

**File:** `backend/src/services/geminiService.ts`

## Available Methods

### 1. Generate Career Recommendations

```typescript
import { geminiService } from '@/services/geminiService';

const recommendations = await geminiService.generateCareerRecommendations({
  dimensions: {
    analytical: 85,
    creative: 70,
    helping: 60,
    outdoor: 30
  },
  topInterests: ['technology', 'problem-solving', 'innovation'],
  skills: ['programming', 'data analysis'],
  experience: 'beginner'
});

// Returns:
// {
//   recommendations: [
//     {
//       domain: "Data Science",
//       matchScore: 92,
//       reasoning: ["Strong analytical skills", "Interest in technology"],
//       keySkills: ["Python", "Statistics", "Machine Learning"],
//       careerPaths: ["Data Analyst", "ML Engineer", "Data Scientist"]
//     }
//   ],
//   analysis: "Overall career analysis..."
// }
```

### 2. Generate Learning Roadmap

```typescript
const roadmap = await geminiService.generateLearningRoadmap({
  domain: 'Data Science',
  skillLevel: 'beginner',
  availableHoursPerWeek: 15,
  learningPace: 'moderate',
  focusAreas: ['Machine Learning', 'Python'],
  currentSkills: ['Basic Programming']
});

// Returns:
// {
//   modules: [
//     {
//       title: "Python Fundamentals",
//       description: "Learn Python basics...",
//       duration: "4 weeks",
//       topics: ["Variables", "Functions", "OOP"],
//       resources: [
//         { title: "Python for Beginners", type: "course", url: "..." }
//       ],
//       weeklyTargets: [
//         {
//           week: 1,
//           title: "Getting Started with Python",
//           tasks: ["Install Python", "Learn variables"],
//           estimatedHours: 10
//         }
//       ]
//     }
//   ],
//   totalDuration: "6 months",
//   milestones: ["Complete Python basics", "Build first ML model"],
//   tips: ["Practice daily", "Join coding communities"]
// }
```

### 3. Analyze Assessment

```typescript
const analysis = await geminiService.analyzeAssessment([
  {
    question: "What activities do you enjoy?",
    answer: "Solving puzzles and coding",
    category: "interests"
  },
  {
    question: "What are your strengths?",
    answer: "Logical thinking and problem-solving",
    category: "strengths"
  }
]);

// Returns:
// {
//   insights: ["Strong analytical mindset", "Enjoys technical challenges"],
//   strengths: ["Problem-solving", "Logical thinking"],
//   areasForGrowth: ["Communication skills", "Team collaboration"],
//   recommendedDomains: ["Software Engineering", "Data Science"],
//   personalityTraits: ["Analytical", "Detail-oriented"]
// }
```

### 4. Generate Study Tips

```typescript
const tips = await geminiService.generateStudyTips({
  domain: 'Web Development',
  currentProgress: 45,
  strugglingAreas: ['CSS Grid', 'Async JavaScript'],
  learningStyle: 'visual'
});

// Returns:
// {
//   tips: [
//     "Practice CSS Grid with visual tools like Grid Garden",
//     "Use browser DevTools to debug async code"
//   ],
//   resources: [
//     {
//       title: "CSS Grid Complete Guide",
//       description: "Visual guide to CSS Grid",
//       type: "article"
//     }
//   ],
//   motivationalMessage: "You're halfway there! Keep going!"
// }
```

## Integration Points

### Where to Use Gemini Service

1. **Recommendation Controller** (`backend/src/controllers/recommendationController.ts`)
   - Enhance `generateRecommendations` with AI-powered suggestions
   - Use Gemini to analyze user interests and provide better matches

2. **Learning Controller** (`backend/src/controllers/learningController.ts`)
   - Use `generateLearningRoadmap` when creating new learning paths
   - Generate personalized weekly targets based on user progress

3. **Assessment Controller** (`backend/src/controllers/assessmentController.ts`)
   - Use `analyzeAssessment` to provide deeper insights
   - Generate personalized feedback based on responses

4. **Progress Tracking**
   - Use `generateStudyTips` to provide personalized guidance
   - Offer AI-powered recommendations when users struggle

## Example Integration

### In Recommendation Service

```typescript
// backend/src/services/recommendationService.ts

import { geminiService } from './geminiService';

export class RecommendationService {
  static async generateRecommendations(userId: string, algorithm: string) {
    // Get user's interest profile
    const user = await User.findById(userId);
    const assessment = await Assessment.findOne({ userId });
    
    // Use Gemini for AI-powered recommendations
    if (geminiService.isAvailable()) {
      try {
        const aiRecommendations = await geminiService.generateCareerRecommendations({
          dimensions: assessment.interestProfile.dimensions,
          topInterests: assessment.interestProfile.topInterests,
          skills: user.profile.skills,
          experience: user.profile.currentStatus
        });
        
        // Merge AI recommendations with existing algorithm
        // ... combine and return
      } catch (error) {
        logger.warn('Gemini AI unavailable, falling back to traditional algorithm');
        // Fall back to existing algorithm
      }
    }
    
    // Existing recommendation logic...
  }
}
```

### In Learning Path Generation

```typescript
// backend/src/services/learningService.ts

import { geminiService } from './geminiService';

export class LearningService {
  static async generateLearningPath(domainId: string, preferences: any) {
    const domain = await CareerDomain.findById(domainId);
    
    // Use Gemini to generate personalized roadmap
    if (geminiService.isAvailable()) {
      try {
        const aiRoadmap = await geminiService.generateLearningRoadmap({
          domain: domain.title,
          skillLevel: preferences.skillLevel || 'beginner',
          availableHoursPerWeek: preferences.availableHoursPerWeek || 10,
          learningPace: preferences.learningPace || 'moderate',
          focusAreas: preferences.focusAreas,
          currentSkills: preferences.currentSkills
        });
        
        // Convert AI roadmap to database format
        // ... save and return
      } catch (error) {
        logger.warn('Gemini AI unavailable, using template-based roadmap');
        // Fall back to template-based generation
      }
    }
    
    // Existing learning path logic...
  }
}
```

## Error Handling

The Gemini service includes built-in error handling:
- Returns `false` from `isAvailable()` if API key is missing or invalid
- Logs errors for debugging
- Allows graceful fallback to existing algorithms

## Testing

To test the Gemini integration:

1. **Check if service is available:**
   ```typescript
   console.log('Gemini available:', geminiService.isAvailable());
   ```

2. **Test career recommendations:**
   ```bash
   # Create a test script in backend/src/scripts/testGemini.ts
   npm run test-gemini
   ```

3. **Monitor logs:**
   ```bash
   # Check backend logs for Gemini initialization
   tail -f backend/logs/combined.log | grep -i gemini
   ```

## Best Practices

1. **Always check availability** before using Gemini methods
2. **Implement fallbacks** for when AI is unavailable
3. **Cache AI responses** to reduce API calls and costs
4. **Monitor API usage** to stay within quota limits
5. **Validate AI responses** before using them in production
6. **Log AI interactions** for debugging and improvement

## Cost Optimization

- Cache frequently requested recommendations
- Use AI selectively for high-value operations
- Implement rate limiting for AI calls
- Consider batch processing for multiple users
- Monitor API usage through Google Cloud Console

## Security

- ✅ API key stored in environment variables
- ✅ Not exposed to frontend
- ✅ Logged securely (key not logged)
- ⚠️ Remember to rotate API key periodically
- ⚠️ Set up API key restrictions in Google Cloud Console

## Next Steps

1. Integrate Gemini into recommendation controller
2. Integrate Gemini into learning path generation
3. Add caching layer for AI responses
4. Implement usage monitoring and alerts
5. Create admin dashboard for AI insights
6. A/B test AI vs traditional algorithms

## Support

For issues or questions:
- Check logs: `backend/logs/combined.log`
- Verify API key is valid
- Check Google Cloud Console for quota limits
- Review Gemini API documentation: https://ai.google.dev/docs
