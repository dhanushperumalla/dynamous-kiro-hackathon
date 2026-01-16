# Project Structure

## Directory Layout
```
AI-Sikshak/
├── frontend/                 # React web application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page-level components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API calls and external services
│   │   ├── store/           # Redux store and slices
│   │   ├── utils/           # Helper functions and utilities
│   │   ├── types/           # TypeScript type definitions
│   │   └── assets/          # Images, icons, and static files
│   ├── public/              # Static assets and index.html
│   └── package.json
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Route handlers and business logic
│   │   ├── models/          # Database models and schemas
│   │   ├── routes/          # API route definitions
│   │   ├── middleware/      # Authentication, validation, logging
│   │   ├── services/        # Business logic and external integrations
│   │   ├── utils/           # Helper functions and utilities
│   │   ├── config/          # Database and environment configuration
│   │   └── types/           # TypeScript interfaces and types
│   ├── tests/               # API tests and test utilities
│   └── package.json
├── shared/                  # Shared utilities and types
│   ├── types/               # Common TypeScript definitions
│   ├── constants/           # Shared constants and enums
│   └── utils/               # Shared utilities
├── docs/                    # Project documentation
│   ├── api/                 # API documentation
│   ├── deployment/          # Deployment guides
│   └── development/         # Development setup guides
├── scripts/                 # Build and deployment scripts
├── tests/                   # Integration and E2E tests
└── .kiro/                   # Kiro CLI configuration
    ├── steering/            # Project context and guidelines
    ├── prompts/             # Custom development prompts
    └── agents/              # Custom AI agents
```

## File Naming Conventions
**Components and Pages:**
- PascalCase for React components: `InterestAssessment.tsx`, `DomainCard.tsx`
- camelCase for hooks and utilities: `useCareerRecommendations.ts`, `apiClient.ts`
- kebab-case for CSS modules: `interest-assessment.module.css`

**API and Backend:**
- camelCase for JavaScript/TypeScript files: `userController.ts`, `careerService.ts`
- kebab-case for route files: `career-routes.ts`, `user-routes.ts`
- UPPER_SNAKE_CASE for environment variables: `DATABASE_URL`, `JWT_SECRET`

**Database and Models:**
- PascalCase for model names: `User`, `CareerPath`, `LearningModule`
- camelCase for field names: `firstName`, `completedModules`, `weeklyTargets`

## Module Organization
**Frontend Modules:**
- **Authentication**: Login, signup, profile management
- **Assessment**: Interest questionnaire and analysis
- **Recommendations**: Domain suggestions and career matching
- **Learning**: Course content, progress tracking, weekly targets
- **Notifications**: Progress reminders and motivational messages
- **Jobs**: Job listings, applications, and career opportunities

**Backend Services:**
- **User Service**: Authentication, profiles, preferences
- **Assessment Service**: Interest analysis and scoring
- **AI Service**: Career recommendations and path generation
- **Learning Service**: Course management and progress tracking
- **Notification Service**: Automated messaging and reminders
- **Job Service**: Job scraping, matching, and integration

## Configuration Files
**Root Level:**
- `package.json` - Project metadata and dependencies
- `tsconfig.json` - TypeScript configuration
- `.env.example` - Environment variable template
- `docker-compose.yml` - Local development environment
- `.gitignore` - Git ignore patterns

**Frontend:**
- `vite.config.ts` or `webpack.config.js` - Build configuration
- `tailwind.config.js` - Styling configuration
- `jest.config.js` - Testing configuration

**Backend:**
- `nodemon.json` - Development server configuration
- `jest.config.js` - Testing setup
- `swagger.json` - API documentation

## Documentation Structure
```
docs/
├── README.md                # Project overview and quick start
├── CONTRIBUTING.md          # Contribution guidelines
├── DEPLOYMENT.md            # Deployment instructions
├── API.md                   # API documentation and examples
├── ARCHITECTURE.md          # System architecture details
├── DEVELOPMENT.md           # Development setup and workflows
└── USER_GUIDE.md           # End-user documentation
```

## Asset Organization
**Frontend Assets:**
```
src/assets/
├── images/
│   ├── icons/              # UI icons and symbols
│   ├── illustrations/      # Career and learning illustrations
│   └── logos/              # Brand assets
├── fonts/                  # Custom typography
└── styles/
    ├── globals.css         # Global styles and CSS variables
    ├── components/         # Component-specific styles
    └── themes/             # Light/dark theme definitions
```

## Build Artifacts
**Frontend Build:**
- `frontend/dist/` - Production web build
- `frontend/build/` - Development build artifacts

**Backend Build:**
- `backend/dist/` - Compiled TypeScript output
- `backend/logs/` - Application logs

## Environment-Specific Files
**Development:**
- `.env.development` - Development environment variables
- `docker-compose.dev.yml` - Development containers
- `config/development.json` - Development-specific configuration

**Staging:**
- `.env.staging` - Staging environment variables
- `config/staging.json` - Staging configuration
- `deploy/staging.yml` - Staging deployment scripts

**Production:**
- `.env.production` - Production environment variables
- `config/production.json` - Production configuration
- `deploy/production.yml` - Production deployment scripts
- `monitoring/` - Production monitoring and alerting setup
