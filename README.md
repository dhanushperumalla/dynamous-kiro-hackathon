# AI-Sikshak - AI-Powered Career Mentorship Platform

A comprehensive platform that helps confused students and graduates find their career direction through AI-powered recommendations, personalized learning roadmaps, and direct job placement assistance.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- MongoDB (local installation or MongoDB Atlas)

### Installation & Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd ai-sikshak
npm run install:all
```

2. **Start MongoDB:**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas connection string in .env files
```

3. **Run the application:**
```bash
# Start both backend and frontend in development mode
npm run dev
```

This will start:
- Backend API server on `http://localhost:3000`
- Frontend React app on `http://localhost:5173`

### 🎯 Test the Authentication System

1. **Open your browser** and go to `http://localhost:5173`

2. **Register a new account:**
   - Click "Sign up here" 
   - Fill in the registration form
   - Accept terms and conditions
   - Click "Create Account"

3. **Login with your credentials:**
   - Use the email and password you just created
   - Click "Sign In"

4. **Access the dashboard:**
   - You'll be redirected to a simple dashboard
   - Your authentication is working! 🎉

## 🔧 Development Configuration

The application is pre-configured with dummy credentials for development:

### Backend (.env)
- **Database**: `mongodb://localhost:27017/ai-sikshak-dev`
- **JWT Secrets**: Dummy development secrets
- **Email Service**: Development mode (emails logged, not sent)
- **OAuth**: Dummy Google OAuth credentials

### Frontend (.env)
- **API URL**: `http://localhost:3000/api`
- **Features**: All authentication features enabled

## 📁 Project Structure

```
ai-sikshak/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Authentication & validation
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helper functions
│   │   └── types/           # TypeScript types
│   └── .env                 # Backend environment variables
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API clients
│   │   ├── store/           # Redux store
│   │   ├── utils/           # Utilities
│   │   └── types/           # TypeScript types
│   └── .env                 # Frontend environment variables
└── package.json             # Root package with dev scripts
```

## 🔐 Authentication Features

### ✅ Implemented Features
- [x] User registration with validation
- [x] User login with JWT tokens
- [x] Password strength validation
- [x] Automatic token refresh
- [x] Protected routes
- [x] Role-based access control
- [x] Profile management
- [x] Email verification flow (development mode)
- [x] Password reset flow (development mode)
- [x] OAuth integration setup (Google)
- [x] Responsive UI design
- [x] Error handling & validation

### 🔒 Security Features
- bcrypt password hashing (12 salt rounds)
- JWT access tokens (15min expiry) + refresh tokens (7 days)
- Rate limiting on authentication endpoints
- CORS configuration
- Security headers (Helmet.js)
- Input validation and sanitization
- XSS and injection protection

## 🛠 Available Scripts

### Root Level
```bash
npm run dev              # Start both backend and frontend
npm run build            # Build both applications
npm run install:all      # Install all dependencies
```

### Backend Only
```bash
cd backend
npm run dev              # Start backend in development mode
npm run build            # Build backend
npm start                # Start built backend
npm run test             # Run tests (when implemented)
```

### Frontend Only
```bash
cd frontend
npm run dev              # Start frontend development server
npm run build            # Build frontend for production
npm run preview          # Preview built frontend
```

## 🧪 Testing the System

### Manual Testing Checklist
- [ ] User can register with valid email/password
- [ ] User receives appropriate validation errors for invalid input
- [ ] User can login with correct credentials
- [ ] User cannot login with incorrect credentials
- [ ] User is redirected to dashboard after successful login
- [ ] User can access protected routes when authenticated
- [ ] User is redirected to login when accessing protected routes without auth
- [ ] User can logout and lose access to protected routes
- [ ] Password strength indicator works during registration
- [ ] Form validation works on both login and signup forms

### API Testing
You can test the API endpoints directly:

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Access protected route (use token from login response)
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🔄 Next Steps

This authentication system provides the foundation for the full AI-Sikshak platform. Next implementations would include:

1. **Interest Assessment Module**
2. **AI Recommendation Engine**
3. **Learning Roadmap System**
4. **Progress Tracking**
5. **Job Integration Service**
6. **Notification System**

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Error:**
- Ensure MongoDB is running locally or check your connection string
- Verify the database URL in `backend/.env`

**Port Already in Use:**
- Backend (3000): `lsof -ti:3000 | xargs kill -9`
- Frontend (5173): `lsof -ti:5173 | xargs kill -9`

**Build Errors:**
- Clear node_modules: `npm run clean && npm run install:all`
- Check TypeScript errors: `cd backend && npx tsc --noEmit`

**Email Service:**
- In development mode, emails are logged to console instead of sent
- Check backend logs for email content

## 📝 Environment Variables

### Production Setup
When deploying to production, update these environment variables:

**Backend:**
- `JWT_ACCESS_SECRET` - Strong random secret (32+ characters)
- `JWT_REFRESH_SECRET` - Different strong random secret
- `DATABASE_URL` - Production MongoDB connection string
- `SENDGRID_API_KEY` - Real SendGrid API key
- `GOOGLE_CLIENT_ID` - Real Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Real Google OAuth client secret

**Frontend:**
- `VITE_API_BASE_URL` - Production API URL
- `VITE_GOOGLE_CLIENT_ID` - Real Google OAuth client ID

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Happy coding! 🚀**

The authentication system is fully functional and ready for development. Start building the next features of your AI-powered career mentorship platform!