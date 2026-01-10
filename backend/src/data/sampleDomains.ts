import {
  ICareerDomain,
  DomainCategory,
  DifficultyLevel,
  SkillCategory,
  ExperienceLevel,
  CompetitionLevel,
  ResourceType
} from '@/types/recommendation';

export const sampleCareerDomains: Omit<ICareerDomain, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'software-development',
    title: 'Software Development',
    description: 'Design, develop, and maintain software applications and systems using various programming languages and frameworks.',
    detailedDescription: 'Software development involves the complete process of creating software applications, from initial concept and design through coding, testing, deployment, and maintenance. Developers work with various programming languages, frameworks, and tools to build web applications, mobile apps, desktop software, and enterprise systems. This field requires strong problem-solving skills, logical thinking, and continuous learning to keep up with evolving technologies.',
    category: DomainCategory.TECHNOLOGY,
    requiredSkills: [
      {
        name: 'Programming Languages',
        category: SkillCategory.TECHNICAL,
        importance: 10,
        description: 'Proficiency in at least one programming language (JavaScript, Python, Java, C#, etc.)',
        learningResources: ['Codecademy', 'freeCodeCamp', 'LeetCode'],
        assessmentCriteria: ['Code quality', 'Problem-solving ability', 'Syntax knowledge']
      },
      {
        name: 'Problem Solving',
        category: SkillCategory.SOFT_SKILLS,
        importance: 9,
        description: 'Ability to break down complex problems into manageable components',
        learningResources: ['Algorithm courses', 'Coding challenges', 'Project-based learning'],
        assessmentCriteria: ['Logical thinking', 'Debugging skills', 'Algorithm design']
      },
      {
        name: 'Version Control',
        category: SkillCategory.TOOLS,
        importance: 8,
        description: 'Git and GitHub for code management and collaboration',
        learningResources: ['Git documentation', 'GitHub Learning Lab', 'Atlassian Git tutorials'],
        assessmentCriteria: ['Git commands', 'Branching strategies', 'Collaboration workflows']
      }
    ],
    optionalSkills: [
      {
        name: 'Cloud Platforms',
        category: SkillCategory.TECHNICAL,
        importance: 7,
        description: 'AWS, Azure, or Google Cloud Platform knowledge',
        learningResources: ['AWS Training', 'Azure Learning Path', 'Google Cloud Skills Boost'],
        assessmentCriteria: ['Cloud architecture', 'Deployment skills', 'Service integration']
      },
      {
        name: 'DevOps',
        category: SkillCategory.TOOLS,
        importance: 6,
        description: 'CI/CD pipelines, containerization, and infrastructure automation',
        learningResources: ['Docker documentation', 'Kubernetes tutorials', 'Jenkins guides'],
        assessmentCriteria: ['Pipeline setup', 'Container management', 'Automation scripts']
      }
    ],
    careerPaths: [
      {
        title: 'Junior Software Developer',
        description: 'Entry-level position focusing on coding and learning development practices',
        experienceLevel: ExperienceLevel.ENTRY_LEVEL,
        averageSalary: {
          currency: 'USD',
          min: 50000,
          max: 75000,
          median: 62500,
          location: 'United States',
          lastUpdated: new Date('2024-01-01')
        },
        growthProjection: 15,
        responsibilities: [
          'Write clean, maintainable code',
          'Participate in code reviews',
          'Debug and fix software issues',
          'Learn new technologies and frameworks'
        ],
        requiredSkills: ['Programming Languages', 'Version Control', 'Problem Solving'],
        careerProgression: ['Mid-Level Developer', 'Senior Developer', 'Tech Lead']
      },
      {
        title: 'Senior Software Engineer',
        description: 'Experienced developer leading technical decisions and mentoring junior developers',
        experienceLevel: ExperienceLevel.SENIOR_LEVEL,
        averageSalary: {
          currency: 'USD',
          min: 120000,
          max: 180000,
          median: 150000,
          location: 'United States',
          lastUpdated: new Date('2024-01-01')
        },
        growthProjection: 12,
        responsibilities: [
          'Design software architecture',
          'Lead technical projects',
          'Mentor junior developers',
          'Make technology decisions'
        ],
        requiredSkills: ['Programming Languages', 'System Design', 'Leadership'],
        careerProgression: ['Staff Engineer', 'Principal Engineer', 'Engineering Manager']
      }
    ],
    marketData: {
      demandScore: 95,
      competitionLevel: CompetitionLevel.HIGH,
      jobGrowthRate: 22,
      averageSalaryRange: {
        currency: 'USD',
        min: 50000,
        max: 200000,
        median: 105000,
        location: 'United States',
        lastUpdated: new Date('2024-01-01')
      },
      topEmployers: ['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple'],
      geographicHotspots: ['San Francisco Bay Area', 'Seattle', 'New York', 'Austin', 'Boston'],
      industryTrends: [
        'AI/ML integration in applications',
        'Cloud-native development',
        'Microservices architecture',
        'Low-code/no-code platforms'
      ],
      futureOutlook: 'Software development continues to be one of the fastest-growing fields with excellent job security and high demand across all industries.',
      lastUpdated: new Date('2024-01-01')
    },
    learningResources: [
      {
        title: 'The Complete Web Developer Course',
        type: ResourceType.COURSE,
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/the-complete-web-development-bootcamp/',
        description: 'Comprehensive course covering HTML, CSS, JavaScript, Node.js, and more',
        duration: 65,
        difficulty: DifficultyLevel.BEGINNER,
        cost: 89.99,
        rating: 4.7,
        skills: ['HTML', 'CSS', 'JavaScript', 'Node.js'],
        isRecommended: true
      },
      {
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        type: ResourceType.BOOK,
        provider: 'Robert C. Martin',
        url: 'https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882',
        description: 'Essential book on writing clean, maintainable code',
        duration: 20,
        difficulty: DifficultyLevel.INTERMEDIATE,
        cost: 35.99,
        rating: 4.6,
        skills: ['Code Quality', 'Best Practices'],
        isRecommended: true
      }
    ],
    prerequisites: ['Basic computer literacy', 'Logical thinking', 'Mathematics fundamentals'],
    difficulty: DifficultyLevel.INTERMEDIATE,
    timeToMastery: 24,
    isActive: true,
    tags: ['programming', 'web-development', 'mobile-development', 'software-engineering'],
    relatedDomains: []
  },
  {
    name: 'data-science',
    title: 'Data Science',
    description: 'Extract insights from data using statistical analysis, machine learning, and data visualization techniques.',
    detailedDescription: 'Data science combines statistics, programming, and domain expertise to extract meaningful insights from large datasets. Data scientists collect, clean, analyze, and interpret data to help organizations make data-driven decisions. This field involves working with various tools and technologies including Python, R, SQL, machine learning algorithms, and data visualization platforms.',
    category: DomainCategory.TECHNOLOGY,
    requiredSkills: [
      {
        name: 'Statistics and Mathematics',
        category: SkillCategory.TECHNICAL,
        importance: 10,
        description: 'Strong foundation in statistics, probability, and linear algebra',
        learningResources: ['Khan Academy Statistics', 'MIT OpenCourseWare', 'Coursera Statistics'],
        assessmentCriteria: ['Statistical concepts', 'Hypothesis testing', 'Mathematical modeling']
      },
      {
        name: 'Programming (Python/R)',
        category: SkillCategory.TECHNICAL,
        importance: 9,
        description: 'Proficiency in Python or R for data analysis and machine learning',
        learningResources: ['Python.org tutorials', 'R for Data Science', 'DataCamp'],
        assessmentCriteria: ['Code efficiency', 'Library usage', 'Data manipulation']
      },
      {
        name: 'Data Visualization',
        category: SkillCategory.TECHNICAL,
        importance: 8,
        description: 'Create compelling visualizations using tools like Matplotlib, Seaborn, or Tableau',
        learningResources: ['Tableau Public', 'Matplotlib tutorials', 'D3.js documentation'],
        assessmentCriteria: ['Chart selection', 'Design principles', 'Storytelling with data']
      }
    ],
    optionalSkills: [
      {
        name: 'Machine Learning',
        category: SkillCategory.TECHNICAL,
        importance: 8,
        description: 'Understanding of ML algorithms and frameworks like scikit-learn, TensorFlow',
        learningResources: ['Coursera ML Course', 'Fast.ai', 'Kaggle Learn'],
        assessmentCriteria: ['Algorithm selection', 'Model evaluation', 'Feature engineering']
      },
      {
        name: 'Big Data Technologies',
        category: SkillCategory.TOOLS,
        importance: 6,
        description: 'Experience with Spark, Hadoop, or cloud-based big data solutions',
        learningResources: ['Apache Spark documentation', 'Hadoop tutorials', 'AWS Big Data'],
        assessmentCriteria: ['Distributed computing', 'Data pipeline design', 'Performance optimization']
      }
    ],
    careerPaths: [
      {
        title: 'Junior Data Analyst',
        description: 'Entry-level position focusing on data cleaning, basic analysis, and reporting',
        experienceLevel: ExperienceLevel.ENTRY_LEVEL,
        averageSalary: {
          currency: 'USD',
          min: 45000,
          max: 65000,
          median: 55000,
          location: 'United States',
          lastUpdated: new Date('2024-01-01')
        },
        growthProjection: 18,
        responsibilities: [
          'Clean and prepare data for analysis',
          'Create basic reports and dashboards',
          'Perform exploratory data analysis',
          'Support senior analysts with projects'
        ],
        requiredSkills: ['Statistics', 'SQL', 'Data Visualization'],
        careerProgression: ['Data Analyst', 'Senior Data Analyst', 'Data Scientist']
      },
      {
        title: 'Senior Data Scientist',
        description: 'Lead complex analytics projects and develop machine learning models',
        experienceLevel: ExperienceLevel.SENIOR_LEVEL,
        averageSalary: {
          currency: 'USD',
          min: 130000,
          max: 200000,
          median: 165000,
          location: 'United States',
          lastUpdated: new Date('2024-01-01')
        },
        growthProjection: 20,
        responsibilities: [
          'Design and implement ML models',
          'Lead data science projects',
          'Collaborate with stakeholders',
          'Mentor junior team members'
        ],
        requiredSkills: ['Machine Learning', 'Statistics', 'Programming', 'Business Acumen'],
        careerProgression: ['Principal Data Scientist', 'Data Science Manager', 'Chief Data Officer']
      }
    ],
    marketData: {
      demandScore: 92,
      competitionLevel: CompetitionLevel.HIGH,
      jobGrowthRate: 35,
      averageSalaryRange: {
        currency: 'USD',
        min: 45000,
        max: 250000,
        median: 125000,
        location: 'United States',
        lastUpdated: new Date('2024-01-01')
      },
      topEmployers: ['Netflix', 'Uber', 'Airbnb', 'LinkedIn', 'Spotify'],
      geographicHotspots: ['San Francisco', 'New York', 'Boston', 'Seattle', 'Chicago'],
      industryTrends: [
        'AI and machine learning adoption',
        'Real-time analytics',
        'Edge computing for data processing',
        'Automated machine learning (AutoML)'
      ],
      futureOutlook: 'Data science is experiencing explosive growth as organizations increasingly rely on data-driven decision making.',
      lastUpdated: new Date('2024-01-01')
    },
    learningResources: [
      {
        title: 'Python for Data Science Handbook',
        type: ResourceType.BOOK,
        provider: 'Jake VanderPlas',
        url: 'https://jakevdp.github.io/PythonDataScienceHandbook/',
        description: 'Comprehensive guide to data science tools in Python',
        duration: 25,
        difficulty: DifficultyLevel.INTERMEDIATE,
        cost: 0,
        rating: 4.8,
        skills: ['Python', 'Pandas', 'NumPy', 'Matplotlib'],
        isRecommended: true
      },
      {
        title: 'Machine Learning Course',
        type: ResourceType.COURSE,
        provider: 'Coursera (Andrew Ng)',
        url: 'https://www.coursera.org/learn/machine-learning',
        description: 'Foundational course in machine learning algorithms and applications',
        duration: 60,
        difficulty: DifficultyLevel.INTERMEDIATE,
        cost: 49,
        rating: 4.9,
        skills: ['Machine Learning', 'Statistics', 'MATLAB/Octave'],
        isRecommended: true
      }
    ],
    prerequisites: ['Mathematics (calculus, statistics)', 'Basic programming knowledge', 'Analytical thinking'],
    difficulty: DifficultyLevel.ADVANCED,
    timeToMastery: 18,
    isActive: true,
    tags: ['data-analysis', 'machine-learning', 'statistics', 'python', 'analytics'],
    relatedDomains: []
  },
  {
    name: 'digital-marketing',
    title: 'Digital Marketing',
    description: 'Promote products and services through digital channels including social media, search engines, and online advertising.',
    detailedDescription: 'Digital marketing encompasses all marketing efforts that use electronic devices or the internet. It includes various channels such as search engines, social media, email, and websites to connect with current and prospective customers. Digital marketers analyze consumer behavior, create engaging content, manage advertising campaigns, and measure performance using analytics tools.',
    category: DomainCategory.MARKETING,
    requiredSkills: [
      {
        name: 'Content Creation',
        category: SkillCategory.SOFT_SKILLS,
        importance: 9,
        description: 'Ability to create engaging content for various digital platforms',
        learningResources: ['HubSpot Content Marketing', 'Copyblogger', 'Content Marketing Institute'],
        assessmentCriteria: ['Content quality', 'Engagement metrics', 'Brand consistency']
      },
      {
        name: 'Analytics and Data Interpretation',
        category: SkillCategory.TECHNICAL,
        importance: 8,
        description: 'Use tools like Google Analytics to measure and optimize campaign performance',
        learningResources: ['Google Analytics Academy', 'Google Ads Certification', 'Facebook Blueprint'],
        assessmentCriteria: ['Data analysis', 'ROI calculation', 'Performance optimization']
      },
      {
        name: 'Social Media Management',
        category: SkillCategory.DOMAIN_SPECIFIC,
        importance: 8,
        description: 'Manage brand presence across social media platforms',
        learningResources: ['Hootsuite Academy', 'Buffer Blog', 'Social Media Examiner'],
        assessmentCriteria: ['Platform knowledge', 'Community engagement', 'Content strategy']
      }
    ],
    optionalSkills: [
      {
        name: 'SEO/SEM',
        category: SkillCategory.TECHNICAL,
        importance: 7,
        description: 'Search engine optimization and search engine marketing expertise',
        learningResources: ['Moz SEO Guide', 'SEMrush Academy', 'Ahrefs Blog'],
        assessmentCriteria: ['Keyword research', 'On-page optimization', 'Link building']
      },
      {
        name: 'Email Marketing',
        category: SkillCategory.DOMAIN_SPECIFIC,
        importance: 6,
        description: 'Design and execute effective email marketing campaigns',
        learningResources: ['Mailchimp Resources', 'Campaign Monitor', 'Litmus Blog'],
        assessmentCriteria: ['Campaign design', 'Segmentation', 'Automation setup']
      }
    ],
    careerPaths: [
      {
        title: 'Digital Marketing Coordinator',
        description: 'Support marketing campaigns and manage day-to-day digital marketing activities',
        experienceLevel: ExperienceLevel.ENTRY_LEVEL,
        averageSalary: {
          currency: 'USD',
          min: 35000,
          max: 50000,
          median: 42500,
          location: 'United States',
          lastUpdated: new Date('2024-01-01')
        },
        growthProjection: 10,
        responsibilities: [
          'Execute social media campaigns',
          'Create content for digital channels',
          'Monitor campaign performance',
          'Assist with email marketing'
        ],
        requiredSkills: ['Content Creation', 'Social Media', 'Basic Analytics'],
        careerProgression: ['Digital Marketing Specialist', 'Digital Marketing Manager', 'Marketing Director']
      },
      {
        title: 'Digital Marketing Manager',
        description: 'Lead digital marketing strategy and manage marketing teams',
        experienceLevel: ExperienceLevel.MID_LEVEL,
        averageSalary: {
          currency: 'USD',
          min: 65000,
          max: 95000,
          median: 80000,
          location: 'United States',
          lastUpdated: new Date('2024-01-01')
        },
        growthProjection: 8,
        responsibilities: [
          'Develop digital marketing strategies',
          'Manage marketing budgets',
          'Lead cross-functional teams',
          'Analyze market trends'
        ],
        requiredSkills: ['Strategy Development', 'Team Leadership', 'Budget Management', 'Analytics'],
        careerProgression: ['Senior Marketing Manager', 'Marketing Director', 'VP of Marketing']
      }
    ],
    marketData: {
      demandScore: 85,
      competitionLevel: CompetitionLevel.MODERATE,
      jobGrowthRate: 8,
      averageSalaryRange: {
        currency: 'USD',
        min: 35000,
        max: 120000,
        median: 65000,
        location: 'United States',
        lastUpdated: new Date('2024-01-01')
      },
      topEmployers: ['Google', 'Facebook', 'Amazon', 'HubSpot', 'Salesforce'],
      geographicHotspots: ['New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Austin'],
      industryTrends: [
        'AI-powered marketing automation',
        'Personalization at scale',
        'Voice search optimization',
        'Video-first content strategies'
      ],
      futureOutlook: 'Digital marketing continues to evolve with new technologies and platforms, offering steady growth opportunities.',
      lastUpdated: new Date('2024-01-01')
    },
    learningResources: [
      {
        title: 'Google Digital Marketing Course',
        type: ResourceType.COURSE,
        provider: 'Google',
        url: 'https://learndigital.withgoogle.com/digitalgarage',
        description: 'Free comprehensive course covering all aspects of digital marketing',
        duration: 40,
        difficulty: DifficultyLevel.BEGINNER,
        cost: 0,
        rating: 4.5,
        skills: ['SEO', 'SEM', 'Social Media', 'Analytics'],
        isRecommended: true
      },
      {
        title: 'Digital Marketing Specialization',
        type: ResourceType.CERTIFICATION,
        provider: 'Coursera (University of Illinois)',
        url: 'https://www.coursera.org/specializations/digital-marketing',
        description: 'University-level specialization in digital marketing',
        duration: 80,
        difficulty: DifficultyLevel.INTERMEDIATE,
        cost: 49,
        rating: 4.6,
        skills: ['Marketing Strategy', 'Analytics', 'Social Media', 'Content Marketing'],
        isRecommended: true
      }
    ],
    prerequisites: ['Basic computer skills', 'Communication skills', 'Creative thinking'],
    difficulty: DifficultyLevel.BEGINNER,
    timeToMastery: 12,
    isActive: true,
    tags: ['marketing', 'social-media', 'seo', 'content-marketing', 'advertising'],
    relatedDomains: []
  },
  {
    name: 'ux-ui-design',
    title: 'UX/UI Design',
    description: 'Design user-centered digital experiences that are both functional and aesthetically pleasing.',
    detailedDescription: 'UX/UI design focuses on creating intuitive and engaging user experiences for digital products. UX designers research user needs, create wireframes and prototypes, and test usability, while UI designers focus on the visual elements, typography, and interactive components. This field combines psychology, design principles, and technology to solve user problems and create delightful digital experiences.',
    category: DomainCategory.DESIGN,
    requiredSkills: [
      {
        name: 'Design Thinking',
        category: SkillCategory.SOFT_SKILLS,
        importance: 10,
        description: 'Human-centered approach to innovation and problem-solving',
        learningResources: ['IDEO Design Kit', 'Stanford d.school', 'Design Thinking courses'],
        assessmentCriteria: ['Problem identification', 'User empathy', 'Solution ideation']
      },
      {
        name: 'Prototyping Tools',
        category: SkillCategory.TOOLS,
        importance: 9,
        description: 'Proficiency in tools like Figma, Sketch, Adobe XD, or InVision',
        learningResources: ['Figma Academy', 'Sketch documentation', 'Adobe XD tutorials'],
        assessmentCriteria: ['Tool proficiency', 'Prototype fidelity', 'Interaction design']
      },
      {
        name: 'User Research',
        category: SkillCategory.DOMAIN_SPECIFIC,
        importance: 8,
        description: 'Conduct user interviews, surveys, and usability testing',
        learningResources: ['Nielsen Norman Group', 'UX Research courses', 'UserTesting resources'],
        assessmentCriteria: ['Research methodology', 'Data collection', 'Insight generation']
      }
    ],
    optionalSkills: [
      {
        name: 'Front-end Development',
        category: SkillCategory.TECHNICAL,
        importance: 6,
        description: 'Basic HTML, CSS, and JavaScript knowledge',
        learningResources: ['freeCodeCamp', 'MDN Web Docs', 'CSS-Tricks'],
        assessmentCriteria: ['Code understanding', 'Implementation feasibility', 'Technical communication']
      },
      {
        name: 'Visual Design',
        category: SkillCategory.DOMAIN_SPECIFIC,
        importance: 7,
        description: 'Typography, color theory, and visual hierarchy principles',
        learningResources: ['Dribbble', 'Behance', 'Design courses on Coursera'],
        assessmentCriteria: ['Visual aesthetics', 'Brand consistency', 'Design principles']
      }
    ],
    careerPaths: [
      {
        title: 'Junior UX Designer',
        description: 'Entry-level position focusing on user research and basic design tasks',
        experienceLevel: ExperienceLevel.ENTRY_LEVEL,
        averageSalary: {
          currency: 'USD',
          min: 50000,
          max: 70000,
          median: 60000,
          location: 'United States',
          lastUpdated: new Date('2024-01-01')
        },
        growthProjection: 12,
        responsibilities: [
          'Conduct user research',
          'Create wireframes and prototypes',
          'Assist with usability testing',
          'Support senior designers'
        ],
        requiredSkills: ['Design Thinking', 'Prototyping Tools', 'User Research'],
        careerProgression: ['UX Designer', 'Senior UX Designer', 'UX Design Lead']
      },
      {
        title: 'Senior UX/UI Designer',
        description: 'Lead design projects and mentor junior designers',
        experienceLevel: ExperienceLevel.SENIOR_LEVEL,
        averageSalary: {
          currency: 'USD',
          min: 90000,
          max: 140000,
          median: 115000,
          location: 'United States',
          lastUpdated: new Date('2024-01-01')
        },
        growthProjection: 10,
        responsibilities: [
          'Lead design strategy',
          'Manage design projects',
          'Mentor junior designers',
          'Collaborate with stakeholders'
        ],
        requiredSkills: ['Advanced Design Skills', 'Leadership', 'Strategy', 'Stakeholder Management'],
        careerProgression: ['Design Manager', 'Design Director', 'VP of Design']
      }
    ],
    marketData: {
      demandScore: 88,
      competitionLevel: CompetitionLevel.MODERATE,
      jobGrowthRate: 13,
      averageSalaryRange: {
        currency: 'USD',
        min: 50000,
        max: 160000,
        median: 95000,
        location: 'United States',
        lastUpdated: new Date('2024-01-01')
      },
      topEmployers: ['Apple', 'Google', 'Microsoft', 'Airbnb', 'Uber'],
      geographicHotspots: ['San Francisco', 'New York', 'Seattle', 'Los Angeles', 'Austin'],
      industryTrends: [
        'Voice user interface design',
        'AR/VR experience design',
        'Inclusive and accessible design',
        'Design systems and component libraries'
      ],
      futureOutlook: 'UX/UI design demand continues to grow as companies prioritize user experience in digital transformation.',
      lastUpdated: new Date('2024-01-01')
    },
    learningResources: [
      {
        title: 'Google UX Design Certificate',
        type: ResourceType.CERTIFICATION,
        provider: 'Coursera (Google)',
        url: 'https://www.coursera.org/professional-certificates/google-ux-design',
        description: 'Comprehensive UX design program with hands-on projects',
        duration: 120,
        difficulty: DifficultyLevel.BEGINNER,
        cost: 49,
        rating: 4.7,
        skills: ['UX Research', 'Prototyping', 'Usability Testing', 'Design Thinking'],
        isRecommended: true
      },
      {
        title: 'The Design of Everyday Things',
        type: ResourceType.BOOK,
        provider: 'Don Norman',
        url: 'https://www.amazon.com/Design-Everyday-Things-Revised-Expanded/dp/0465050654',
        description: 'Classic book on design principles and user psychology',
        duration: 15,
        difficulty: DifficultyLevel.BEGINNER,
        cost: 16.99,
        rating: 4.5,
        skills: ['Design Principles', 'User Psychology', 'Usability'],
        isRecommended: true
      }
    ],
    prerequisites: ['Creative thinking', 'Attention to detail', 'Empathy for users'],
    difficulty: DifficultyLevel.INTERMEDIATE,
    timeToMastery: 15,
    isActive: true,
    tags: ['design', 'user-experience', 'user-interface', 'prototyping', 'usability'],
    relatedDomains: []
  }
]; 