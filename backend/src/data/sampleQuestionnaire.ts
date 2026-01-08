import { IQuestionnaire, QuestionType, CareerDimension } from '@/types/assessment';

/**
 * Sample questionnaire data for the AI-Sikshak interest assessment
 * This represents a comprehensive career interest assessment covering all dimensions
 */
export const sampleQuestionnaireData: Partial<IQuestionnaire> = {
  version: '1.0.0',
  title: 'AI-Sikshak Career Interest Assessment',
  description: 'A comprehensive assessment to discover your career interests and aptitudes. This questionnaire analyzes your preferences across multiple career dimensions to provide personalized domain recommendations.',
  estimatedDuration: 15,
  questions: [
    // Technology Dimension Questions
    {
      id: 'tech_01',
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
      id: 'tech_02',
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
    {
      id: 'tech_03',
      text: 'Rate your interest in learning programming languages and coding',
      type: QuestionType.RATING_SCALE,
      category: 'Technology Interests',
      dimension: CareerDimension.TECHNOLOGY,
      weight: 9,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 3
    },

    // Creative Dimension Questions
    {
      id: 'creative_01',
      text: 'How important is creative expression in your ideal career?',
      type: QuestionType.RATING_SCALE,
      category: 'Creative Expression',
      dimension: CareerDimension.CREATIVE,
      weight: 8,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 4
    },
    {
      id: 'creative_03',
      text: 'Do you prefer working on original creative projects over following established templates?',
      type: QuestionType.BOOLEAN,
      category: 'Creative Expression',
      dimension: CareerDimension.CREATIVE,
      weight: 6,
      required: true,
      order: 6
    },

    // Analytical Dimension Questions
    {
      id: 'analytical_01',
      text: 'How much do you enjoy solving complex problems through logical analysis?',
      type: QuestionType.RATING_SCALE,
      category: 'Problem Solving',
      dimension: CareerDimension.ANALYTICAL,
      weight: 9,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 7
    },

    // Social Dimension Questions
    {
      id: 'social_01',
      text: 'How important is working closely with people in your ideal job?',
      type: QuestionType.RATING_SCALE,
      category: 'Interpersonal Skills',
      dimension: CareerDimension.SOCIAL,
      weight: 8,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 10
    },
    {
      id: 'social_02',
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
      order: 11
    },

    // Entrepreneurial Dimension Questions
    {
      id: 'entrepreneurial_01',
      text: 'How interested are you in starting your own business or venture?',
      type: QuestionType.RATING_SCALE,
      category: 'Business Mindset',
      dimension: CareerDimension.ENTREPRENEURIAL,
      weight: 9,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 13
    },
    {
      id: 'entrepreneurial_03',
      text: 'Are you comfortable with taking calculated risks for potential rewards?',
      type: QuestionType.BOOLEAN,
      category: 'Business Mindset',
      dimension: CareerDimension.ENTREPRENEURIAL,
      weight: 7,
      required: true,
      order: 15
    },

    // Leadership Dimension Questions
    {
      id: 'leadership_01',
      text: 'How comfortable are you with leading and managing others?',
      type: QuestionType.RATING_SCALE,
      category: 'Leadership Skills',
      dimension: CareerDimension.LEADERSHIP,
      weight: 8,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 16
    },
    {
      id: 'leadership_02',
      text: 'What type of leadership role appeals to you most?',
      type: QuestionType.MULTIPLE_CHOICE,
      category: 'Leadership Skills',
      dimension: CareerDimension.LEADERSHIP,
      weight: 7,
      options: [
        'Project management and coordination',
        'Team leadership and development',
        'Strategic decision making',
        'Change management and transformation',
        'Mentoring and coaching others'
      ],
      required: true,
      order: 17
    },
    {
      id: 'leadership_03',
      text: 'Do you naturally take charge in group situations?',
      type: QuestionType.BOOLEAN,
      category: 'Leadership Skills',
      dimension: CareerDimension.LEADERSHIP,
      weight: 6,
      required: true,
      order: 18
    },

    // Research Dimension Questions
    {
      id: 'research_01',
      text: 'How much do you enjoy conducting in-depth research and investigation?',
      type: QuestionType.RATING_SCALE,
      category: 'Research and Analysis',
      dimension: CareerDimension.RESEARCH,
      weight: 8,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 19
    },
    {
      id: 'research_02',
      text: 'Which research area interests you most?',
      type: QuestionType.MULTIPLE_CHOICE,
      category: 'Research and Analysis',
      dimension: CareerDimension.RESEARCH,
      weight: 7,
      options: [
        'Scientific and technical research',
        'Market and consumer research',
        'Academic and theoretical research',
        'Policy and social research',
        'Historical and archival research'
      ],
      required: true,
      order: 20
    },
    {
      id: 'research_03',
      text: 'Rate your patience for long-term projects with uncertain outcomes',
      type: QuestionType.RATING_SCALE,
      category: 'Research and Analysis',
      dimension: CareerDimension.RESEARCH,
      weight: 6,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 21
    },

    // Practical Dimension Questions
    {
      id: 'practical_01',
      text: 'How much do you enjoy hands-on, practical work?',
      type: QuestionType.RATING_SCALE,
      category: 'Hands-on Work',
      dimension: CareerDimension.PRACTICAL,
      weight: 8,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 22
    },
    {
      id: 'practical_02',
      text: 'Which practical activities appeal to you most?',
      type: QuestionType.RANKING,
      category: 'Hands-on Work',
      dimension: CareerDimension.PRACTICAL,
      weight: 7,
      options: [
        'Building and construction',
        'Mechanical and technical repair',
        'Crafting and manufacturing',
        'Installation and maintenance',
        'Quality control and testing'
      ],
      required: true,
      order: 23
    },
    {
      id: 'practical_03',
      text: 'Do you prefer seeing immediate, tangible results from your work?',
      type: QuestionType.BOOLEAN,
      category: 'Hands-on Work',
      dimension: CareerDimension.PRACTICAL,
      weight: 6,
      required: true,
      order: 24
    },

    // Helping Dimension Questions
    {
      id: 'helping_01',
      text: 'How important is helping others and making a positive impact?',
      type: QuestionType.RATING_SCALE,
      category: 'Service and Impact',
      dimension: CareerDimension.HELPING,
      weight: 9,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 25
    },
    {
      id: 'helping_02',
      text: 'Which helping profession interests you most?',
      type: QuestionType.MULTIPLE_CHOICE,
      category: 'Service and Impact',
      dimension: CareerDimension.HELPING,
      weight: 8,
      options: [
        'Healthcare and medical services',
        'Education and training',
        'Social work and counseling',
        'Non-profit and community service',
        'Customer service and support'
      ],
      required: true,
      order: 26
    },
    {
      id: 'helping_03',
      text: 'What motivates you most about helping others?',
      type: QuestionType.TEXT_INPUT,
      category: 'Service and Impact',
      dimension: CareerDimension.HELPING,
      weight: 6,
      required: false,
      order: 27
    },

    // Outdoor Dimension Questions
    {
      id: 'outdoor_01',
      text: 'How important is working outdoors or in natural environments?',
      type: QuestionType.RATING_SCALE,
      category: 'Work Environment',
      dimension: CareerDimension.OUTDOOR,
      weight: 7,
      minValue: 1,
      maxValue: 5,
      required: true,
      order: 28
    },
    {
      id: 'outdoor_02',
      text: 'Which outdoor work activities appeal to you?',
      type: QuestionType.MULTIPLE_CHOICE,
      category: 'Work Environment',
      dimension: CareerDimension.OUTDOOR,
      weight: 6,
      options: [
        'Environmental conservation and research',
        'Agriculture and farming',
        'Outdoor recreation and tourism',
        'Construction and infrastructure',
        'Emergency services and rescue'
      ],
      required: true,
      order: 29
    },
    {
      id: 'outdoor_03',
      text: 'Do you feel more energized working outside than in an office?',
      type: QuestionType.BOOLEAN,
      category: 'Work Environment',
      dimension: CareerDimension.OUTDOOR,
      weight: 5,
      required: true,
      order: 30
    }
  ],
  categories: [], // Will be populated by pre-save middleware
  totalQuestions: 26, // Calculated from questions array length
  isActive: false
};

/**
 * Function to create and save the sample questionnaire
 */
export const createSampleQuestionnaire = async () => {
  const { Questionnaire } = await import('@/models/Questionnaire');
  
  try {
    // Check if questionnaire already exists
    const existing = await Questionnaire.findOne({ version: sampleQuestionnaireData.version });
    if (existing) {
      console.log('Sample questionnaire already exists');
      return existing;
    }

    // Create new questionnaire
    const questionnaire = new Questionnaire(sampleQuestionnaireData);
    await questionnaire.save();
    
    console.log('Sample questionnaire created successfully');
    return questionnaire;
  } catch (error) {
    console.error('Error creating sample questionnaire:', error);
    throw error;
  }
};