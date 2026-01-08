import { IQuestionnaire, QuestionType, CareerDimension } from '@/types/assessment';

/**
 * Shortened questionnaire data for the AI-Sikshak interest assessment
 * Reduced to 15 questions covering all career dimensions
 */
export const shortQuestionnaireData: Partial<IQuestionnaire> = {
  version: '1.1.0',
  title: 'AI-Sikshak Career Interest Assessment',
  description: 'A focused assessment to discover your career interests and aptitudes. This questionnaire analyzes your preferences across multiple career dimensions to provide personalized domain recommendations.',
  estimatedDuration: 8,
  questions: [
    // Technology Dimension Questions
    {
      id: 'tech_s01',
      text: 'How much do you enjoy working with computers and digital technologies?',
      type: QuestionType.RATING_SCALE,
      category: 'Technology Interests',
      dimension: CareerDimension.TECHNOLOGY,
      weight: 8,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 1
    },
    {
      id: 'tech_s02',
      text: 'Which of these technology-related activities appeals to you most?',
      type: QuestionType.MULTIPLE_CHOICE,
      category: 'Technology Interests',
      dimension: CareerDimension.TECHNOLOGY,
      weight: 7,
      options: [
        'Building websites and mobile apps',
        'Analyzing data and creating insights',
        'Designing user interfaces and experiences',
        'Managing IT systems and networks',
        'Developing artificial intelligence solutions'
      ],
      required: true,
      order: 2
    },

    // Creative Dimension Questions
    {
      id: 'creative_s01',
      text: 'How important is creative expression in your ideal career?',
      type: QuestionType.RATING_SCALE,
      category: 'Creative Expression',
      dimension: CareerDimension.CREATIVE,
      weight: 8,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 3
    },
    {
      id: 'creative_s02',
      text: 'Which creative activities do you find most engaging?',
      type: QuestionType.MULTIPLE_CHOICE,
      category: 'Creative Expression',
      dimension: CareerDimension.CREATIVE,
      weight: 7,
      options: [
        'Visual design and graphics',
        'Writing and storytelling',
        'Music and audio production',
        'Video and film creation',
        'Art and illustration'
      ],
      required: true,
      order: 4
    },

    // Analytical Dimension Questions
    {
      id: 'analytical_s01',
      text: 'How much do you enjoy solving complex problems through logical analysis?',
      type: QuestionType.RATING_SCALE,
      category: 'Problem Solving',
      dimension: CareerDimension.ANALYTICAL,
      weight: 9,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 5
    },
    {
      id: 'analytical_s02',
      text: 'Which type of analytical work interests you most?',
      type: QuestionType.MULTIPLE_CHOICE,
      category: 'Problem Solving',
      dimension: CareerDimension.ANALYTICAL,
      weight: 8,
      options: [
        'Financial analysis and modeling',
        'Data science and statistics',
        'Market research and insights',
        'Process optimization and efficiency',
        'Strategic planning and forecasting'
      ],
      required: true,
      order: 6
    },

    // Social Dimension Questions
    {
      id: 'social_s01',
      text: 'How important is working closely with people in your ideal job?',
      type: QuestionType.RATING_SCALE,
      category: 'Interpersonal Skills',
      dimension: CareerDimension.SOCIAL,
      weight: 8,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 7
    },
    {
      id: 'social_s02',
      text: 'Which social work environment appeals to you most?',
      type: QuestionType.MULTIPLE_CHOICE,
      category: 'Interpersonal Skills',
      dimension: CareerDimension.SOCIAL,
      weight: 7,
      options: [
        'Large team collaborations',
        'One-on-one client interactions',
        'Community outreach and engagement',
        'Teaching and mentoring others',
        'Networking and relationship building'
      ],
      required: true,
      order: 8
    },

    // Entrepreneurial Dimension Questions
    {
      id: 'entrepreneurial_s01',
      text: 'How interested are you in starting your own business or venture?',
      type: QuestionType.RATING_SCALE,
      category: 'Business Mindset',
      dimension: CareerDimension.ENTREPRENEURIAL,
      weight: 9,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 9
    },
    {
      id: 'entrepreneurial_s02',
      text: 'Are you comfortable with taking calculated risks for potential rewards?',
      type: QuestionType.BOOLEAN,
      category: 'Business Mindset',
      dimension: CareerDimension.ENTREPRENEURIAL,
      weight: 7,
      required: true,
      order: 10
    },

    // Leadership Dimension Questions
    {
      id: 'leadership_s01',
      text: 'How comfortable are you with leading and managing others?',
      type: QuestionType.RATING_SCALE,
      category: 'Leadership Skills',
      dimension: CareerDimension.LEADERSHIP,
      weight: 8,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 11
    },

    // Research Dimension Questions
    {
      id: 'research_s01',
      text: 'How much do you enjoy conducting in-depth research and investigation?',
      type: QuestionType.RATING_SCALE,
      category: 'Research and Analysis',
      dimension: CareerDimension.RESEARCH,
      weight: 8,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 12
    },

    // Practical Dimension Questions
    {
      id: 'practical_s01',
      text: 'How much do you enjoy hands-on, practical work?',
      type: QuestionType.RATING_SCALE,
      category: 'Hands-on Work',
      dimension: CareerDimension.PRACTICAL,
      weight: 8,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 13
    },

    // Helping Dimension Questions
    {
      id: 'helping_s01',
      text: 'How important is helping others and making a positive impact?',
      type: QuestionType.RATING_SCALE,
      category: 'Service and Impact',
      dimension: CareerDimension.HELPING,
      weight: 9,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 14
    },

    // Outdoor Dimension Questions
    {
      id: 'outdoor_s01',
      text: 'How important is working outdoors or in natural environments?',
      type: QuestionType.RATING_SCALE,
      category: 'Work Environment',
      dimension: CareerDimension.OUTDOOR,
      weight: 7,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 15
    }
  ],
  categories: [], // Will be populated by pre-save middleware
  totalQuestions: 15, // Calculated from questions array length
  isActive: false
};

/**
 * Function to create and save the short questionnaire
 */
export const createShortQuestionnaire = async () => {
  const { Questionnaire } = await import('@/models/Questionnaire');
  
  try {
    // Deactivate existing questionnaires
    await Questionnaire.updateMany({}, { isActive: false });
    
    // Check if short questionnaire already exists
    const existing = await Questionnaire.findOne({ version: shortQuestionnaireData.version });
    if (existing) {
      existing.isActive = true;
      await existing.save();
      console.log('Short questionnaire activated');
      return existing;
    }

    // Create new short questionnaire
    const questionnaire = new Questionnaire({
      ...shortQuestionnaireData,
      isActive: true
    });
    await questionnaire.save();
    
    console.log('Short questionnaire created successfully');
    return questionnaire;
  } catch (error) {
    console.error('Error creating short questionnaire:', error);
    throw error;
  }
};