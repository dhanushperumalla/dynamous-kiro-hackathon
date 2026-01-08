# Feature: User Authentication System with JWT and Profile Management

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement a comprehensive user authentication system for the AI-Sikshak platform that provides secure user registration, login, profile management, and JWT-based session handling. This foundational feature enables users to create accounts, authenticate securely, manage their profiles, and maintain secure sessions across the platform. The system includes email verification, password reset functionality, OAuth integration, and role-based access control.

## User Story

As a confused student or graduate
I want to create a secure account and manage my profile
So that I can access personalized career guidance and track my learning progress

## Problem Statement

The AI-Sikshak platform requires a secure, scalable authentication system to:
- Verify user identity and maintain secure sessions
- Store user profiles and preferences for personalization
- Enable secure access to career assessment and learning features
- Support multiple authentication methods (email/password, OAuth)
- Provide foundation for role-based access control

## Solution Statement

Implement a microservices-based User Service with JWT authentication, MongoDB storage, and comprehensive security features including password hashing, email verification, refresh token rotation, and OAuth integration. The system will follow industry best practices for security and provide a solid foundation for the platform's personalized features.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: High
**Primary Systems Affected**: User Service, API Gateway, Database Layer
**Dependencies**: MongoDB, JWT libraries, bcrypt, SendGrid, OAuth providers

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `.kiro/specs/ai-sikshak-platform/design.md` (lines 50-120) - Why: Contains User Service architecture and data models
- `.kiro/specs/ai-sikshak-platform/requirements.md` (lines 1-80) - Why: Authentication requirements and acceptance criteria
- `.kiro/steering/tech.md` (lines 1-80) - Why: Technology stack and security patterns
- `.kiro/steering/structure.md` (lines 1-100) - Why: Project structure and naming conventions
- `PRD.md` (lines 200-400) - Why: Security configuration and API specifications

### New Files to Create

**Backend Structure:**
- `backend/package.json` - Node.js dependencies and scripts
- `backend/tsconfig.json` - TypeScript configuration
- `backend/src/app.ts` - Express application setup
- `backend/src/config/database.ts` - MongoDB connection configuration
- `backend/src/config/jwt.ts` - JWT configuration and utilities
- `backend/src/models/User.ts` - User model with Mongoose schema
- `backend/src/controllers/authController.ts` - Authentication route handlers
- `backend/src/controllers/userController.ts` - User profile route handlers
- `backend/src/middleware/auth.ts` - JWT authentication middleware
- `backend/src/middleware/validation.ts` - Request validation middleware
- `backend/src/routes/auth.ts` - Authentication routes
- `backend/src/routes/user.ts` - User profile routes
- `backend/src/services/authService.ts` - Authentication business logic
- `backend/src/services/emailService.ts` - Email notification service
- `backend/src/utils/validators.ts` - Input validation utilities
- `backend/src/types/auth.ts` - Authentication type definitions
- `backend/src/types/user.ts` - User type definitions
- `backend/.env.example` - Environment variables template

**Test Files:**
- `backend/tests/models/User.test.ts` - User model property tests
- `backend/tests/controllers/authController.test.ts` - Authentication endpoint tests
- `backend/tests/middleware/auth.test.ts` - Authentication middleware tests
- `backend/tests/services/authService.test.ts` - Authentication service tests

**Frontend Structure:**
- `frontend/package.json` - React dependencies and scripts
- `frontend/tsconfig.json` - TypeScript configuration for frontend
- `frontend/vite.config.ts` - Vite build configuration
- `frontend/src/main.tsx` - React application entry point
- `frontend/src/App.tsx` - Main application component
- `frontend/src/store/store.ts` - Redux store configuration
- `frontend/src/store/slices/authSlice.ts` - Authentication state management
- `frontend/src/services/authApi.ts` - Authentication API client
- `frontend/src/components/auth/LoginForm.tsx` - Login form component
- `frontend/src/components/auth/SignupForm.tsx` - Registration form component
- `frontend/src/components/auth/ProfileForm.tsx` - Profile management component
- `frontend/src/hooks/useAuth.ts` - Authentication custom hook
- `frontend/src/pages/Login.tsx` - Login page component
- `frontend/src/pages/Signup.tsx` - Registration page component
- `frontend/src/pages/Profile.tsx` - Profile management page
- `frontend/src/utils/auth.ts` - Authentication utilities
- `frontend/src/types/auth.ts` - Frontend authentication types

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Mongoose TypeScript Documentation](https://mongoosejs.com/docs/typescript.html)
  - Specific section: TypeScript schema definitions and model creation
  - Why: Required for implementing type-safe User model with proper validation

- [JWT Best Practices Guide](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
  - Specific section: Token security and refresh token patterns
  - Why: Essential for implementing secure JWT authentication with refresh tokens

- [Express.js TypeScript Middleware](https://www.ceos3c.com/typescript/typescript-express-middleware/)
  - Specific section: Type-safe middleware implementation patterns
  - Why: Shows proper TypeScript patterns for authentication middleware

- [bcrypt Security Best Practices](https://github.com/kelektiv/node.bcrypt.js#security-issues-and-concerns)
  - Specific section: Salt rounds and security considerations
  - Why: Required for secure password hashing implementation

- [React Redux Toolkit Authentication](https://redux-toolkit.js.org/tutorials/rtk-query#authentication)
  - Specific section: Authentication state management patterns
  - Why: Shows proper patterns for managing auth state in React

### Patterns to Follow

**Naming Conventions:**
- PascalCase for models: `User`, `AuthToken`
- camelCase for functions: `authenticateUser`, `validatePassword`
- kebab-case for route files: `auth-routes.ts`, `user-routes.ts`
- UPPER_SNAKE_CASE for environment variables: `JWT_SECRET`, `DATABASE_URL`

**Error Handling Pattern:**
```typescript
// Consistent error response format
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}
```

**Logging Pattern:**
```typescript
// Structured logging with context
logger.info('User authentication attempt', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString(),
  requestId: req.id
});
```

**Validation Pattern:**
```typescript
// Joi validation schemas for request validation
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).required()
});
```

**Middleware Pattern:**
```typescript
// Express middleware with proper TypeScript typing
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  // JWT validation logic
};
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation Setup

Set up the basic project structure, dependencies, and configuration files for both backend and frontend applications.

**Tasks:**
- Initialize backend Node.js project with TypeScript configuration
- Initialize frontend React project with Vite and TypeScript
- Configure MongoDB connection and database setup
- Set up environment configuration and secrets management
- Configure development tools (ESLint, Prettier, testing frameworks)

### Phase 2: Core Authentication Backend

Implement the core authentication service with user models, JWT handling, and security middleware.

**Tasks:**
- Create User model with Mongoose schema and validation
- Implement JWT utilities for token generation and verification
- Create authentication middleware for route protection
- Implement password hashing and validation utilities
- Set up request validation middleware

### Phase 3: Authentication API Endpoints

Build the REST API endpoints for user registration, login, profile management, and security operations.

**Tasks:**
- Implement user registration endpoint with email verification
- Create login endpoint with JWT token generation
- Add password reset functionality with secure token handling
- Implement profile management endpoints (get, update)
- Add OAuth integration for Google authentication

### Phase 4: Frontend Authentication System

Create the React frontend components and state management for user authentication and profile management.

**Tasks:**
- Set up Redux store with authentication slice
- Create authentication API client with token management
- Implement login and registration forms with validation
- Build profile management interface
- Add protected route handling and token refresh

### Phase 5: Integration and Security

Connect frontend and backend, implement security features, and add comprehensive testing.

**Tasks:**
- Integrate frontend with backend API endpoints
- Implement automatic token refresh mechanism
- Add comprehensive error handling and user feedback
- Create property-based tests for authentication security
- Implement rate limiting and security headers

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE backend/package.json

- **IMPLEMENT**: Node.js project with Express, TypeScript, MongoDB dependencies
- **PATTERN**: Standard Node.js project structure with dev dependencies
- **IMPORTS**: express, mongoose, jsonwebtoken, bcryptjs, joi, cors, helmet, dotenv
- **GOTCHA**: Use exact versions for security-critical dependencies
- **VALIDATE**: `cd backend && npm install && npm run build`

### CREATE backend/tsconfig.json

- **IMPLEMENT**: TypeScript configuration for Node.js with strict type checking
- **PATTERN**: Standard Node.js TypeScript configuration with ES2020 target
- **IMPORTS**: Node.js type definitions and strict compiler options
- **GOTCHA**: Enable strict mode and proper module resolution
- **VALIDATE**: `cd backend && npx tsc --noEmit`

### CREATE backend/src/config/database.ts

- **IMPLEMENT**: MongoDB connection with Mongoose and connection pooling
- **PATTERN**: Singleton connection pattern with retry logic
- **IMPORTS**: mongoose, environment configuration
- **GOTCHA**: Handle connection errors and implement reconnection logic
- **VALIDATE**: `cd backend && npm run test:unit -- --testPathPattern=database`

### CREATE backend/src/config/jwt.ts

- **IMPLEMENT**: JWT configuration utilities for token generation and verification
- **PATTERN**: Centralized JWT configuration with access and refresh tokens
- **IMPORTS**: jsonwebtoken, crypto for secure token generation
- **GOTCHA**: Use different secrets for access and refresh tokens
- **VALIDATE**: `cd backend && npm run test:unit -- --testPathPattern=jwt`

### CREATE backend/src/types/user.ts

- **IMPLEMENT**: TypeScript interfaces for User model and related types
- **PATTERN**: Comprehensive type definitions with optional fields
- **IMPORTS**: MongoDB ObjectId types, enum definitions
- **GOTCHA**: Separate database model from API response types
- **VALIDATE**: `cd backend && npx tsc --noEmit`

### CREATE backend/src/types/auth.ts

- **IMPLEMENT**: Authentication-specific TypeScript interfaces and types
- **PATTERN**: Request/response types for authentication endpoints
- **IMPORTS**: Express Request/Response types, JWT payload types
- **GOTCHA**: Extend Express Request type for authenticated requests
- **VALIDATE**: `cd backend && npx tsc --noEmit`

### CREATE backend/src/models/User.ts

- **IMPLEMENT**: Mongoose User model with comprehensive validation and methods
- **PATTERN**: Schema with pre-save hooks for password hashing
- **IMPORTS**: mongoose, bcryptjs, validator for email validation
- **GOTCHA**: Use pre-save middleware for password hashing, not in controller
- **VALIDATE**: `cd backend && npm run test:unit -- --testPathPattern=User.test`

### CREATE backend/src/utils/validators.ts

- **IMPLEMENT**: Joi validation schemas for authentication requests
- **PATTERN**: Reusable validation schemas with custom validators
- **IMPORTS**: joi, custom validation functions
- **GOTCHA**: Validate password strength and email format properly
- **VALIDATE**: `cd backend && npm run test:unit -- --testPathPattern=validators`

### CREATE backend/src/middleware/validation.ts

- **IMPLEMENT**: Express middleware for request validation using Joi schemas
- **PATTERN**: Generic validation middleware with error formatting
- **IMPORTS**: joi, express types, error response utilities
- **GOTCHA**: Return consistent error format for validation failures
- **VALIDATE**: `cd backend && npm run test:unit -- --testPathPattern=validation`

### CREATE backend/src/middleware/auth.ts

- **IMPLEMENT**: JWT authentication middleware for protected routes
- **PATTERN**: Token extraction from headers with user attachment to request
- **IMPORTS**: jsonwebtoken, User model, express types
- **GOTCHA**: Handle token expiration and invalid tokens gracefully
- **VALIDATE**: `cd backend && npm run test:unit -- --testPathPattern=auth.middleware`

### CREATE backend/src/services/authService.ts

- **IMPLEMENT**: Authentication business logic service layer
- **PATTERN**: Service layer with methods for registration, login, token refresh
- **IMPORTS**: User model, JWT utilities, bcrypt, email service
- **GOTCHA**: Separate business logic from controller logic
- **VALIDATE**: `cd backend && npm run test:unit -- --testPathPattern=authService`

### CREATE backend/src/services/emailService.ts

- **IMPLEMENT**: Email service for verification and password reset emails
- **PATTERN**: Template-based email service with SendGrid integration
- **IMPORTS**: SendGrid SDK, email templates, environment configuration
- **GOTCHA**: Use environment variables for API keys and sender addresses
- **VALIDATE**: `cd backend && npm run test:unit -- --testPathPattern=emailService`

### CREATE backend/src/controllers/authController.ts

- **IMPLEMENT**: Authentication route handlers for registration, login, password reset
- **PATTERN**: Controller methods with proper error handling and response formatting
- **IMPORTS**: authService, validation middleware, express types
- **GOTCHA**: Always validate input and handle async errors properly
- **VALIDATE**: `cd backend && npm run test:integration -- --testPathPattern=authController`

### CREATE backend/src/controllers/userController.ts

- **IMPLEMENT**: User profile management route handlers
- **PATTERN**: CRUD operations for user profile with authorization checks
- **IMPORTS**: User model, authentication middleware, validation
- **GOTCHA**: Ensure users can only access their own profile data
- **VALIDATE**: `cd backend && npm run test:integration -- --testPathPattern=userController`

### CREATE backend/src/routes/auth.ts

- **IMPLEMENT**: Authentication route definitions with middleware chain
- **PATTERN**: Express router with validation and authentication middleware
- **IMPORTS**: express Router, controllers, middleware
- **GOTCHA**: Apply validation middleware before controller methods
- **VALIDATE**: `cd backend && npm run test:integration -- --testPathPattern=auth.routes`

### CREATE backend/src/routes/user.ts

- **IMPLEMENT**: User profile route definitions with authentication
- **PATTERN**: Protected routes requiring authentication middleware
- **IMPORTS**: express Router, userController, auth middleware
- **GOTCHA**: All user routes should require authentication
- **VALIDATE**: `cd backend && npm run test:integration -- --testPathPattern=user.routes`

### CREATE backend/src/app.ts

- **IMPLEMENT**: Express application setup with middleware, routes, and error handling
- **PATTERN**: Express app configuration with security middleware and CORS
- **IMPORTS**: express, cors, helmet, routes, database connection
- **GOTCHA**: Apply security middleware before routes, error handling last
- **VALIDATE**: `cd backend && npm start`

### CREATE backend/.env.example

- **IMPLEMENT**: Environment variables template with all required configuration
- **PATTERN**: Documented environment variables with example values
- **IMPORTS**: All configuration variables used in the application
- **GOTCHA**: Never include actual secrets, only examples and documentation
- **VALIDATE**: Manual review of all environment variables

### CREATE frontend/package.json

- **IMPLEMENT**: React project with Vite, TypeScript, Redux Toolkit dependencies
- **PATTERN**: Modern React development setup with testing and build tools
- **IMPORTS**: react, vite, redux-toolkit, react-router, tailwindcss
- **GOTCHA**: Use compatible versions for React 18 and related packages
- **VALIDATE**: `cd frontend && npm install && npm run build`

### CREATE frontend/tsconfig.json

- **IMPLEMENT**: TypeScript configuration for React with strict type checking
- **PATTERN**: React-optimized TypeScript configuration with JSX support
- **IMPORTS**: React type definitions and DOM types
- **GOTCHA**: Enable JSX and proper module resolution for React
- **VALIDATE**: `cd frontend && npx tsc --noEmit`

### CREATE frontend/vite.config.ts

- **IMPLEMENT**: Vite build configuration with React plugin and development settings
- **PATTERN**: Standard Vite React configuration with proxy for API calls
- **IMPORTS**: vite, react plugin, path resolution
- **GOTCHA**: Configure proxy for backend API during development
- **VALIDATE**: `cd frontend && npm run dev`

### CREATE frontend/src/types/auth.ts

- **IMPLEMENT**: Frontend TypeScript types for authentication state and API responses
- **PATTERN**: Client-side types matching backend API contracts
- **IMPORTS**: Shared types from backend if using monorepo structure
- **GOTCHA**: Keep frontend types in sync with backend API responses
- **VALIDATE**: `cd frontend && npx tsc --noEmit`

### CREATE frontend/src/store/store.ts

- **IMPLEMENT**: Redux store configuration with RTK Query and persistence
- **PATTERN**: Redux Toolkit store with authentication slice and API slice
- **IMPORTS**: redux-toolkit, redux-persist, authentication slice
- **GOTCHA**: Configure persistence for authentication state only
- **VALIDATE**: `cd frontend && npm run test:unit -- --testPathPattern=store`

### CREATE frontend/src/store/slices/authSlice.ts

- **IMPLEMENT**: Redux authentication slice with login, logout, and token management
- **PATTERN**: RTK slice with async thunks for authentication actions
- **IMPORTS**: redux-toolkit, authentication API, local storage utilities
- **GOTCHA**: Handle token expiration and automatic logout
- **VALIDATE**: `cd frontend && npm run test:unit -- --testPathPattern=authSlice`

### CREATE frontend/src/services/authApi.ts

- **IMPLEMENT**: API client for authentication endpoints with token management
- **PATTERN**: Axios-based API client with interceptors for token handling
- **IMPORTS**: axios, authentication types, token utilities
- **GOTCHA**: Implement automatic token refresh and request retry
- **VALIDATE**: `cd frontend && npm run test:unit -- --testPathPattern=authApi`

### CREATE frontend/src/hooks/useAuth.ts

- **IMPLEMENT**: Custom React hook for authentication state and actions
- **PATTERN**: Hook providing authentication state and methods
- **IMPORTS**: react, redux hooks, authentication slice
- **GOTCHA**: Memoize authentication methods to prevent unnecessary re-renders
- **VALIDATE**: `cd frontend && npm run test:unit -- --testPathPattern=useAuth`

### CREATE frontend/src/components/auth/LoginForm.tsx

- **IMPLEMENT**: Login form component with validation and error handling
- **PATTERN**: Controlled form with React Hook Form and validation
- **IMPORTS**: react-hook-form, authentication hook, UI components
- **GOTCHA**: Handle loading states and display validation errors clearly
- **VALIDATE**: `cd frontend && npm run test:unit -- --testPathPattern=LoginForm`

### CREATE frontend/src/components/auth/SignupForm.tsx

- **IMPLEMENT**: Registration form component with comprehensive validation
- **PATTERN**: Multi-step form with email verification flow
- **IMPORTS**: react-hook-form, validation schemas, authentication hook
- **GOTCHA**: Validate password strength and confirm password matching
- **VALIDATE**: `cd frontend && npm run test:unit -- --testPathPattern=SignupForm`

### CREATE frontend/src/components/auth/ProfileForm.tsx

- **IMPLEMENT**: User profile management form with update functionality
- **PATTERN**: Editable profile form with save/cancel actions
- **IMPORTS**: react-hook-form, user types, profile API
- **GOTCHA**: Show unsaved changes warning and handle update errors
- **VALIDATE**: `cd frontend && npm run test:unit -- --testPathPattern=ProfileForm`

### CREATE frontend/src/pages/Login.tsx

- **IMPLEMENT**: Login page component with navigation and OAuth options
- **PATTERN**: Full-page layout with form and navigation links
- **IMPORTS**: LoginForm component, routing, authentication state
- **GOTCHA**: Redirect authenticated users away from login page
- **VALIDATE**: `cd frontend && npm run dev` and test login page

### CREATE frontend/src/pages/Signup.tsx

- **IMPLEMENT**: Registration page component with terms and conditions
- **PATTERN**: Full-page layout with registration form and legal links
- **IMPORTS**: SignupForm component, routing, terms component
- **GOTCHA**: Require terms acceptance before allowing registration
- **VALIDATE**: `cd frontend && npm run dev` and test signup page

### CREATE frontend/src/pages/Profile.tsx

- **IMPLEMENT**: User profile page with profile management and settings
- **PATTERN**: Protected page layout with profile form and navigation
- **IMPORTS**: ProfileForm component, authentication guard, layout
- **GOTCHA**: Require authentication and handle unauthorized access
- **VALIDATE**: `cd frontend && npm run dev` and test profile page

### CREATE frontend/src/utils/auth.ts

- **IMPLEMENT**: Authentication utility functions for token management
- **PATTERN**: Utility functions for token storage, validation, and refresh
- **IMPORTS**: JWT decode, local storage, authentication types
- **GOTCHA**: Handle token expiration and secure storage properly
- **VALIDATE**: `cd frontend && npm run test:unit -- --testPathPattern=auth.utils`

### CREATE frontend/src/App.tsx

- **IMPLEMENT**: Main application component with routing and authentication
- **PATTERN**: App shell with protected routes and authentication provider
- **IMPORTS**: react-router, authentication components, layout components
- **GOTCHA**: Set up protected routes and handle authentication state changes
- **VALIDATE**: `cd frontend && npm run dev` and test full application

### CREATE frontend/src/main.tsx

- **IMPLEMENT**: React application entry point with providers and global styles
- **PATTERN**: Standard React 18 entry point with Redux and router providers
- **IMPORTS**: react, react-dom, App component, store, styles
- **GOTCHA**: Use React 18 createRoot API and proper provider nesting
- **VALIDATE**: `cd frontend && npm run dev` and verify application starts

---

## TESTING STRATEGY

### Property-Based Testing

Use `fast-check` for TypeScript property-based testing with minimum 100 iterations per test.

**Property Test Configuration:**
```typescript
import fc from 'fast-check';

// Test configuration
const testConfig = {
  numRuns: 100,
  timeout: 5000,
  verbose: true
};
```

### Unit Tests

**Backend Unit Tests (Jest + Supertest):**
- User model validation and methods
- Authentication service business logic
- JWT utilities and token handling
- Middleware functionality
- Validation schemas and error handling

**Frontend Unit Tests (Jest + React Testing Library):**
- Authentication components rendering and interaction
- Redux slice state management
- Custom hooks behavior
- API client functionality
- Utility functions

### Integration Tests

**API Integration Tests:**
- Authentication endpoints with database
- User profile management workflows
- Token refresh and expiration handling
- OAuth integration flows
- Error handling and edge cases

**Frontend Integration Tests:**
- Authentication flow from login to protected routes
- Form submission and API integration
- Token management and automatic refresh
- Error handling and user feedback

### Edge Cases

**Authentication Security:**
- Invalid token handling
- Expired token refresh
- Concurrent login attempts
- Password reset token security
- Rate limiting effectiveness

**Data Validation:**
- Malformed input handling
- SQL injection prevention
- XSS protection in user inputs
- Email format validation
- Password strength requirements

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# Backend linting and formatting
cd backend && npm run lint
cd backend && npm run format:check

# Frontend linting and formatting
cd frontend && npm run lint
cd frontend && npm run format:check

# TypeScript compilation check
cd backend && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

### Level 2: Unit Tests

```bash
# Backend unit tests
cd backend && npm run test:unit

# Frontend unit tests
cd frontend && npm run test:unit

# Property-based tests
cd backend && npm run test:property
```

### Level 3: Integration Tests

```bash
# Backend integration tests
cd backend && npm run test:integration

# Frontend integration tests
cd frontend && npm run test:integration

# End-to-end authentication flow
cd backend && npm run test:e2e
```

### Level 4: Manual Validation

**Authentication Flow Testing:**
```bash
# Start backend server
cd backend && npm run dev

# Start frontend development server
cd frontend && npm run dev

# Test user registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!","firstName":"Test","lastName":"User"}'

# Test user login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Test protected route access
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer <access_token>"
```

### Level 5: Security Validation

```bash
# Security audit
cd backend && npm audit
cd frontend && npm audit

# Dependency vulnerability check
cd backend && npm run security:check
cd frontend && npm run security:check
```

---

## ACCEPTANCE CRITERIA

- [ ] **Property 16: Authentication Security** - User registration and login enforce secure authentication with email verification, password strength requirements, and optional OAuth integration
- [ ] User can register with email and password, receiving email verification
- [ ] User can login with valid credentials and receive JWT access and refresh tokens
- [ ] User can update profile information with proper validation
- [ ] User can reset password using secure token-based flow
- [ ] Protected routes require valid JWT token and reject invalid/expired tokens
- [ ] Token refresh mechanism works automatically for expired access tokens
- [ ] OAuth integration allows login with Google account
- [ ] All validation commands pass with zero errors
- [ ] Unit test coverage exceeds 85% for backend authentication code
- [ ] Integration tests verify complete authentication workflows
- [ ] Property-based tests validate authentication security properties
- [ ] No security vulnerabilities in authentication implementation
- [ ] Rate limiting prevents brute force attacks on authentication endpoints
- [ ] Password hashing uses bcrypt with appropriate salt rounds (12+)
- [ ] JWT tokens use secure secrets and appropriate expiration times
- [ ] User data validation prevents injection attacks and malformed input

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in dependency order
- [ ] Each task validation passed immediately after implementation
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration + property tests)
- [ ] No linting or TypeScript compilation errors
- [ ] Manual authentication flow testing completed successfully
- [ ] Security audit shows no critical vulnerabilities
- [ ] Acceptance criteria all verified and met
- [ ] Code follows project conventions and patterns
- [ ] Documentation updated for authentication system
- [ ] Environment configuration properly set up
- [ ] Database models and migrations ready for production

---

## NOTES

**Security Considerations:**
- JWT access tokens expire in 15 minutes, refresh tokens in 7 days
- Password hashing uses bcrypt with 12 salt rounds for security
- Email verification required for account activation
- Rate limiting applied to prevent brute force attacks
- CORS configured for frontend domain only
- Helmet middleware adds security headers

**Performance Considerations:**
- MongoDB indexes on email and user ID fields for fast lookups
- Redis caching for session data and rate limiting
- Connection pooling for database efficiency
- Token validation optimized with caching

**Scalability Considerations:**
- Stateless JWT design supports horizontal scaling
- Database per service pattern for microservices architecture
- Event-driven architecture for service communication
- Load balancer ready with session-independent design

**Development Workflow:**
- Environment-specific configuration files
- Comprehensive testing at all levels
- Automated CI/CD pipeline integration
- Development and production environment separation