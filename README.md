# 💪 FitAI - AI-Powered Personal Fitness Platform

A comprehensive full-stack AI-powered fitness, nutrition, and health management platform that generates personalized workout and diet plans, tracks progress, and provides real-time health insights powered by advanced AI and wearable device integration.

## 🌟 Key Features

### 🔐 **Authentication & Security**
- JWT-based secure user authentication
- Password hashing with bcrypt
- User registration and login system

### 🤖 **AI-Powered Features**
- **Body Type Classification** - Advanced ResNet-based image classification (Skinny, Ordinary, Overweight, Very Muscular, Fat, Skinny Fat)
- **Personalized Plan Generation** - AI-driven fitness and nutrition plans using Groq API
- **Interactive AI Chat** - Context-aware chatbot for fitness guidance and Q&A
- **Health Insights** - ML-based disease risk awareness and health recommendations

### 📊 **Fitness & Nutrition Tracking**
- Comprehensive workout logging with muscle group tracking
- Detailed food and nutrition tracking with database of 1000+ foods
- Daily summary reports and analytics
- Workout streak tracking and progress monitoring

### 📱 **Wearable Integration**
- Support for health tracking devices (Fitbit, Apple Health, Garmin)
- Automatic daily sync of health metrics
- Real-time health status monitoring

### 📈 **Analytics & Progress**
- Advanced progress analytics and visualization
- Health profile management
- Nutritional analysis and recommendations
- Performance metrics and trends

### 🎨 **Modern UI/UX**
- Responsive design with TailwindCSS
- Beautiful components with Lucide React icons
- Real-time notifications with React Hot Toast
- Smooth animations and micro-interactions

## 🏗️ Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **React Router v6** - Client-side routing
- **Zustand** - Lightweight state management
- **Axios** - HTTP client with interceptors
- **React Hot Toast** - Non-blocking notifications
- **Lucide React** - Beautiful icon library

### Backend
- **FastAPI** - Modern, fast Python web framework with async support
- **Motor** - Async MongoDB driver
- **Pydantic** - Data validation and settings management
- **PyTorch** - Deep learning framework
- **Transformers (Hugging Face)** - Pre-trained ML models
- **Google Generative AI** - Gemini API for text generation
- **Python-Jose** - JWT token handling
- **Passlib** - Password hashing

### Database
- **MongoDB** - NoSQL database for flexible document storage
- **MongoDB Atlas** - Cloud-hosted option

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Uvicorn** - ASGI server

## 📁 Project Structure

```
fit-ai/
├── client/                          # React Frontend Application
│   ├── src/
│   │   ├── components/              # Reusable React components
│   │   │   ├── AnalyticsCharts.jsx           # Chart components for data visualization
│   │   │   ├── Badge.jsx                     # Status badge component
│   │   │   ├── Card.jsx                      # Generic card wrapper
│   │   │   ├── DailySummary.jsx              # Daily stats summary
│   │   │   ├── ExerciseCard.jsx              # Exercise display card
│   │   │   ├── FoodItemCard.jsx              # Food item card
│   │   │   ├── FoodSearch.jsx                # Food search component
│   │   │   ├── HealthSyncWizard.jsx          # Wearable device sync wizard
│   │   │   ├── HumanBody3DModel.jsx          # 3D body visualization
│   │   │   ├── HumanBodyModel.jsx            # Body composition display
│   │   │   ├── Layout.jsx                    # Main app layout wrapper
│   │   │   ├── MealPlanner.jsx               # Meal planning interface
│   │   │   ├── MealSection.jsx               # Meal section display
│   │   │   ├── MicroAnimationsExamples.jsx   # Animation examples
│   │   │   ├── NutritionAnalyzer.jsx         # Nutrition analysis display
│   │   │   ├── StatCard.jsx                  # Statistics card
│   │   │   ├── UserMenu.jsx                  # User dropdown menu
│   │   │   └── WorkoutLogTable.jsx           # Workout history table
│   │   │
│   │   ├── pages/                   # Page-level components (Routes)
│   │   │   ├── Chat.jsx                      # AI chat interface page
│   │   │   ├── Dashboard.jsx                 # Main dashboard with body classification
│   │   │   ├── FoodTracker.jsx               # Food tracking page
│   │   │   ├── HealthAwareness.jsx           # Health risk awareness page
│   │   │   ├── HealthProfile.jsx             # User health profile setup
│   │   │   ├── Login.jsx                     # Login page
│   │   │   ├── Plans.jsx                     # Manage fitness plans
│   │   │   ├── ProgressAnalytics.jsx         # Progress analytics dashboard
│   │   │   ├── Signup.jsx                    # User registration page
│   │   │   └── WorkoutTracker.jsx            # Workout logging page
│   │   │
│   │   ├── services/
│   │   │   └── api.js                        # Axios API client with base configuration
│   │   │
│   │   ├── store/                   # Zustand state management stores
│   │   │   ├── authStore.js                  # Authentication state
│   │   │   ├── foodStore.js                  # Food tracker state
│   │   │   └── workoutStore.js               # Workout tracker state
│   │   │
│   │   ├── App.jsx                  # Main app routing and component
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Global styles
│   │
│   ├── package.json                 # Frontend dependencies
│   ├── vite.config.js               # Vite build configuration
│   ├── tailwind.config.js            # TailwindCSS configuration
│   ├── postcss.config.js             # PostCSS for Tailwind
│   ├── index.html                    # HTML entry point
│   └── Dockerfile                    # Docker configuration for frontend
│
├── server/                          # FastAPI Backend Application
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/              # API endpoint modules
│   │   │       ├── auth.py                   # Authentication endpoints (signup, login)
│   │   │       ├── users.py                  # User profile management
│   │   │       ├── ai.py                     # AI endpoints (classification, generation)
│   │   │       ├── plans.py                  # Fitness plan CRUD
│   │   │       ├── food.py                   # Food tracking endpoints
│   │   │       ├── workout.py                # Workout logging endpoints
│   │   │       ├── analytics.py              # Progress analytics
│   │   │       ├── health.py                 # Health profile and awareness
│   │   │       ├── health_insights.py        # Health insights generation
│   │   │       └── wearables.py              # Wearable device integration
│   │   │
│   │   ├── models/                  # Pydantic data models
│   │   │   ├── user.py                       # User model and schemas
│   │   │   ├── food.py                       # Food and nutrition models
│   │   │   ├── plan.py                       # Fitness plan models
│   │   │   ├── health_profile.py             # Health profile model
│   │   │   ├── health_insights.py            # Health insights model
│   │   │   ├── workout.py                    # Workout and exercise models
│   │   │   └── wearable.py                   # Wearable device models
│   │   │
│   │   ├── services/                # Business logic layer
│   │   │   ├── ai_service.py                 # AI model inference and generation
│   │   │   ├── food_service.py               # Food database and nutrition logic
│   │   │   ├── workout_service.py            # Workout tracking logic
│   │   │   └── wearable_service.py           # Wearable device sync logic
│   │   │
│   │   ├── core/
│   │   │   ├── config.py                     # Settings and configuration
│   │   │   └── security.py                   # JWT and password security
│   │   │
│   │   ├── db/
│   │   │   └── mongodb.py                    # MongoDB connection and lifecycle
│   │   │
│   │   └── __init__.py
│   │
│   ├── main.py                      # FastAPI app creation and middleware setup
│   ├── mongodb.py                   # MongoDB connection setup
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Docker configuration for backend
│   ├── server.env.example            # Environment variables template
│   └── README.md                     # Backend-specific documentation
│
├── docker-compose.yml               # Docker Compose for local development
├── .env.example                      # Root environment variables template
├── .env                              # Environment variables (Git-ignored)
├── app.py                            # Original Streamlit reference app
├── gym_ai.py                         # Alternative AI implementation
├── requirements.txt                  # Root-level dependencies
├── PROJECT_SUMMARY.md                # Project overview and changes
├── QUICK_REFERENCE.md                # Quick setup reference
├── SETUP.md                          # Detailed setup instructions
├── DOCKER.md                         # Docker and deployment guide
└── README.md                         # This file
```

## 🚀 Getting Started

### Prerequisites

- **Python 3.9+** - Required for FastAPI backend
- **Node.js 18+** - Required for React frontend
- **MongoDB** - Local installation or MongoDB Atlas cloud (free tier available)
- **Google Gemini API Key** - Get it from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Git** - For version control
- **npm** - Node package manager (comes with Node.js)

### Quick Start with Docker

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd fit-ai

# Build and start all services (MongoDB, Backend, Frontend)
docker-compose up --build

# Frontend available at: http://localhost:5173
# Backend API available at: http://localhost:8000
# MongoDB available at: localhost:27017
```

### Manual Setup - Step by Step

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd fit-ai
```

#### 2. Setup Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=fitness_ai

# Backend Security
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI APIs
GEMINI_API_KEY=your-google-gemini-api-key-here
GROQ_API_KEY=your-groq-api-key-here

# Frontend
VITE_API_URL=http://localhost:8000/api
```

#### 3. Backend Setup

```bash
cd server

# Create and activate virtual environment
python -m venv venv

# Activate environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp server.env.example .env
# Then edit .env with your credentials
```

**Start the backend server:**

```bash
python main.py
```

The API will be available at `http://localhost:8000`
- API Docs: `http://localhost:8000/docs` (Swagger UI)
- ReDoc: `http://localhost:8000/redoc`

#### 4. Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

#### 5. MongoDB Setup

**Option 1: Local MongoDB Installation**

- **Windows**: Download from [mongodb.com/try/download](https://www.mongodb.com/try/download/community)
- **macOS**: `brew install mongodb-community && brew services start mongodb-community`
- **Linux**: Follow instructions at [mongodb.com/docs/manual/installation/](https://www.mongodb.com/docs/manual/installation/)

Start MongoDB:
```bash
mongod
```

**Option 2: MongoDB Atlas (Cloud)**

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/`
4. Update `MONGODB_URL` in your `.env` file

### Verify Installation

Check if everything is running:

```bash
# Backend health check
curl http://localhost:8000/

# MongoDB connection
mongosh mongodb://localhost:27017

# Frontend
Open http://localhost:5173 in your browser
```

## � API Endpoints Reference

### Base URL
```
http://localhost:8000/api
```

### Authentication Endpoints (`/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/signup` | Register new user account |
| `POST` | `/login` | Login and receive access token |

**Signup Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepass123"
}
```

**Login Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

### User Endpoints (`/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/me` | Get current user profile |
| `PUT` | `/me` | Update user profile |

**Headers Required:**
```
Authorization: Bearer <access_token>
```

### AI Endpoints (`/ai`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/classify-image` | Classify body type from image |
| `POST` | `/generate-plan` | Generate personalized fitness plan |
| `POST` | `/chat` | Chat with AI assistant |

**Image Classification:**
```json
{
  "image": "<base64_encoded_image>"
}
```

**Generate Plan Request:**
```json
{
  "age": 28,
  "weight": 75,
  "height": 180,
  "goal": "weight_loss",
  "body_type": "overweight",
  "fitness_level": "beginner"
}
```

### Plan Endpoints (`/plans`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Get all user plans |
| `POST` | `/` | Create new plan |
| `GET` | `/{id}` | Get specific plan |
| `DELETE` | `/{id}` | Delete plan |

### Food Tracking Endpoints (`/food`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search` | Search food database |
| `POST` | `/log` | Log food intake |
| `GET` | `/daily` | Get daily food log |
| `DELETE` | `/log/{id}` | Delete food entry |

### Workout Endpoints (`/workout`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/muscle-groups` | Get list of muscle groups |
| `GET` | `/exercises/{muscle_group}` | Get exercises for muscle group |
| `GET` | `/search` | Search exercises |
| `POST` | `/log` | Log workout session |
| `GET` | `/daily` | Get daily workout log |
| `GET` | `/streak` | Get current workout streak |
| `GET` | `/history` | Get workout history |
| `DELETE` | `/log/{id}` | Delete workout entry |

### Health Profile Endpoints (`/health`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/health-profile` | Create/update health profile |
| `GET` | `/health-awareness` | Get disease risk awareness |
| `POST` | `/sync` | Sync wearable device data |
| `GET` | `/sync/status` | Get sync status |

### Analytics Endpoints (`/analytics`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/progress` | Get progress metrics |
| `GET` | `/nutrition` | Get nutrition analytics |
| `GET` | `/workout-stats` | Get workout statistics |

### Wearable Endpoints (`/wearables`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/connect` | Connect wearable device |
| `GET` | `/callback` | OAuth callback endpoint |
| `GET` | `/status` | Get connection status |
| `GET` | `/summary` | Get wearable data summary |

## 🎯 Features Walkthrough

### 1️⃣ Authentication
- **Sign Up**: Create a new account with email and password
- **Login**: Access your account with credentials
- **JWT Tokens**: Secure token-based authentication
- **Session Management**: Automatic token refresh

### 2️⃣ Dashboard
- **Photo Upload**: Upload body image for classification
- **Body Type Analysis**: AI-powered body type classification
- **Personal Info**: Enter age, weight, height, fitness level
- **Goal Selection**: Choose from various fitness goals
- **Plan Generation**: Generate personalized 6-12 week plans

### 3️⃣ Fitness Plans
- **View Plans**: Browse all saved fitness plans
- **Plan Details**: Detailed workout schedule and nutrition info
- **Plan Comparison**: Compare multiple plans
- **Export**: Download plan as PDF or image
- **Share**: Share plans with friends

### 4️⃣ Workout Tracking
- **Log Workouts**: Record exercises, sets, reps, and weight
- **Exercise Database**: 1000+ exercises with descriptions
- **Muscle Group Tracking**: Monitor each muscle group
- **Workout Streak**: Track consecutive workout days
- **History**: View past workout sessions

### 5️⃣ Food Tracking
- **Search Foods**: Database of nutrition information
- **Log Meals**: Record daily food intake
- **Nutrition Analysis**: Track macros and calories
- **Daily Summary**: View nutritional breakdown
- **Meal Suggestions**: AI-powered meal recommendations

### 6️⃣ Health Profile
- **Personal Health Info**: Enter medical history
- **Health Conditions**: Track existing conditions
- **Medications**: List current medications
- **Health Risks**: AI-generated health risk assessment
- **Recommendations**: Personalized health recommendations

### 7️⃣ Wearable Integration
- **Device Connection**: Connect Fitbit, Apple Watch, Garmin
- **Auto Sync**: Automatic daily data synchronization
- **Health Metrics**: Steps, heart rate, sleep, calories
- **Real-time Updates**: Live health data display
- **Data Trending**: Historical health metrics

### 8️⃣ AI Chat Assistant
- **Ask Questions**: Get personalized fitness advice
- **Context Aware**: Assistant remembers your profile
- **Instant Answers**: Real-time AI responses
- **Plan Guidance**: Detailed explanation of your plans
- **Diet Tips**: Nutrition and diet advice

### 9️⃣ Analytics Dashboard
- **Progress Metrics**: Weight, measurements, calories burned
- **Charts & Graphs**: Visual representation of progress
- **Goal Tracking**: Progress toward fitness goals
- **Weekly Reports**: Comprehensive weekly summaries
- **Trend Analysis**: Long-term progress trends

### 🔟 Health Awareness
- **Disease Risk**: AI assessment of health risks
- **Prevention Tips**: Evidence-based health prevention
- **Lifestyle:** Suggestions: Personalized lifestyle changes
- **Medical Resources**: Links to medical articles
- **Health Education**: Health articles and information

## 🔧 Configuration & Environment Variables

### Backend Configuration (server/.env)

```env
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=fitness_ai

# Server Configuration
HOST=0.0.0.0
PORT=8000
PROJECT_NAME=FitAI API
VERSION=1.0.0

# JWT/Security
SECRET_KEY=your-super-secret-key-min-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Settings
ALLOWED_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# AI APIs
GEMINI_API_KEY=your-google-gemini-api-key
GROQ_API_KEY=your-groq-api-key-optional

# Wearable Integration
FITBIT_CLIENT_ID=your-fitbit-client-id
FITBIT_CLIENT_SECRET=your-fitbit-client-secret
```

### Frontend Configuration (client/.env)

```env
# API Configuration
VITE_API_URL=http://localhost:8000/api

# Optional Features
VITE_ENABLE_3D_BODY=true
VITE_ANALYTICS_ENABLED=true
```

### Configuration Files

| File | Purpose |
|------|---------|
| `server/app/core/config.py` | Backend settings and validation |
| `client/vite.config.js` | Vite build configuration |
| `client/tailwind.config.js` | TailwindCSS customization |
| `docker-compose.yml` | Docker services configuration |

## 📦 Build for Production

### Build Frontend

```bash
cd client

# Install dependencies
npm install

# Build optimized production bundle
npm run build

# Output: client/dist/
```

### Build Backend

```bash
cd server

# Install dependencies  
pip install -r requirements.txt

# Using Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker Build

```bash
# Build and push to Docker registry
docker build -t yourregistry/fitai-server:latest ./server
docker build -t yourregistry/fitai-client:latest ./client

# Or use Docker Compose
docker-compose build
docker-compose up -d
```

### Deploy to Cloud

**Recommended Platform:** Vercel (Frontend) + Railway/Render (Backend)

```bash
# Frontend: Deploy with Vercel
npm install -g vercel
vercel --prod

# Backend: Use Railway/Render with Docker
# Just push to Git and platform will auto-deploy
```

## 🧪 Development & Testing

### Development Workflow

1. **Frontend Development**
```bash
cd client
npm run dev          # Hot reload server on port 5173
npm run lint         # Check code style
npm run build        # Production build
```

2. **Backend Development**
```bash
cd server
python main.py      # Run development server
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

3. **Database Management**
```bash
# MongoDB Shell
mongosh mongodb://localhost:27017

# View databases
show dbs

# Use fitness_ai database
use fitness_ai

# View collections
show collections

# Query users
db.users.find()
```

### Code Quality

**Backend Code Style**
```bash
cd server

# Install linting tools
pip install flake8 black pylint

# Format code
black app/

# Check code style
flake8 app/ --max-line-length=100
```

**Frontend Code Style**
```bash
cd client

# Run linter
npm run lint

# Fix lint issues
npx eslint . --fix
```

### Testing

**Backend Testing**
```bash
cd server

# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest
pytest -v          # Verbose
pytest --cov       # With coverage
```

**Frontend Testing (Setup)**
```bash
cd client

# Install testing libraries
npm install --save-dev vitest @testing-library/react

# Run tests
npm run test
```

### Database Migrations

For updating MongoDB schemas:

```bash
# Create backup
mongodump --uri="mongodb://localhost:27017" --out=./backup

# Run migration script
python server/app/db/migrations.py
```

### API Documentation

Once server is running:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

## 🐛 Troubleshooting

### MongoDB Connection Issues

**Problem**: "Connection refused"
```
Solution:
1. Verify MongoDB is running: 
   mongosh --eval "db.version()"
2. Check connection string in .env
3. For Atlas, whitelist your IP at mongodb.com/atlas
4. Ensure network connectivity
```

**Problem**: "Authentication failed"
```
Solution:
1. Double-check username and password
2. Ensure user is created in MongoDB
3. Check if network access is enabled in Atlas
```

### Model Download Issues

**Problem**: "Transformers model download fails"
```
Solution:
1. Ensure stable internet connection
2. Check Hugging Face connectivity:
   curl https://huggingface.co/models
3. Allow more time for first run (~5 minutes)
4. Set cache directory:
   export HF_HOME=$(pwd)/hf_cache
```

**Problem**: "Out of memory when loading models"
```
Solution:
1. Ensure 8GB+ RAM available
2. Close other applications
3. Use CPU inference (slower but works):
   Set device='cpu' in ai_service.py
```

### CORS Issues

**Problem**: "CORS error: No 'Access-Control-Allow-Origin' header"
```
Solution:
1. Verify ALLOWED_ORIGINS in server/app/core/config.py
2. Should include "http://localhost:5173"
3. Restart backend server after changes
4. Clear browser cache (Ctrl+Shift+Delete)
```

### Frontend Build Issues

**Problem**: "npm install fails"
```
Solution:
1. Delete node_modules and package-lock.json
   rm -rf node_modules package-lock.json
2. Clear npm cache: npm cache clean --force
3. Reinstall: npm install
4. Check Node version: node --version (should be 18+)
```

**Problem**: "Vite port already in use"
```
Solution:
1. Use different port: npm run dev -- --port 3000
2. Or kill process on port 5173:
   # Windows
   netstat -ano | findstr :5173
   taskkill /PID <PID> /F
   
   # Mac/Linux
   lsof -ti:5173 | xargs kill -9
```

### Backend Issues

**Problem**: "FastAPI not responding"
```
Solution:
1. Check if server is running: 
   curl http://localhost:8000/
2. Check console for error messages
3. Verify all dependencies: pip list | grep fastapi
4. Restart server
```

**Problem**: "Image classification crashes"
```
Solution:
1. Verify image format (JPG, PNG only)
2. Image file size < 10MB
3. Check GPU/CUDA installation if using GPU
4. Try with CPU: Set device='cpu'
```

### Authentication Issues

**Problem**: "Invalid token or token expired"
```
Solution:
1. Clear browser localStorage: 
   localStorage.clear()
2. Log out and log back in
3. Check JWT_SECRET_KEY is consistent
4. Verify ACCESS_TOKEN_EXPIRE_MINUTES setting
```

**Problem**: "Login fails with valid credentials"
```
Solution:
1. Verify user exists in MongoDB
2. Check password hashing implementation
3. Ensure bcrypt is installed:
   pip install passlib[bcrypt]
4. Check backend logs for specific error
```

### Docker Issues

**Problem**: "Container exits immediately"
```
Solution:
1. Check logs: docker-compose logs -f
2. Verify .env file parameters
3. Ensure MongoDB is accessible
4. Check port conflicts:
   docker ps -a
```

**Problem**: "Volume mount not working"
```
Solution:
1. Verify volume path in docker-compose.yml
2. Use absolute paths for volumes
3. Check file permissions: chmod 755
4. Restart Docker daemon
```

### Performance Issues

**Problem**: "API slow response times"
```
Solution:
1. Check MongoDB indexing
2. Enable query caching
3. Reduce pagination size
4. Verify backend resources:
   Monitor CPU/RAM usage
5. Scale to multiple workers
```

## 📞 Getting Help

### Resources
- **Documentation**: See [SETUP.md](SETUP.md) and [DOCKER.md](DOCKER.md)
- **API Docs**: `http://localhost:8000/docs` (when running)
- **GitHub Issues**: Report bugs and request features
- **FastAPI Docs**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- **React Docs**: [react.dev](https://react.dev)

### Debugging Tips

1. **Enable verbose logging**
```python
# In main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

2. **Check exact error messages**
```bash
# Backend errors
tail -f server.log

# Browser console errors
Press F12 -> Console tab
```

3. **Use API testing tools**
- **Postman**: Import OpenAPI schema from `/openapi.json`
- **curl**: Test endpoints directly
- **Thunder Client**: VS Code extension

4. **Database inspection**
```bash
# View all documents
db.users.find().pretty()

# Check indexes
db.users.getIndexes()

# Monitor operations
db.currentOp()
```

## � File Structure Details

### Client Components Breakdown

| Component | Purpose |
|-----------|---------|
| `AnalyticsCharts` | Display progress charts and graphs |
| `HealthSyncWizard` | Guide for connecting wearable devices |
| `HumanBody3DModel` | 3D body visualization (Three.js integration) |
| `MealPlanner` | Interactive meal planning interface |
| `NutritionAnalyzer` | Nutrition information display |
| `WorkoutLogTable` | History table of workouts |

### Server Services Breakdown

| Service | Responsibility |
|---------|--------------|
| `ai_service.py` | Image classification, plan generation using Gemini |
| `food_service.py` | Food database queries, nutrition calculations |
| `workout_service.py` | Exercise logging, streak tracking |
| `wearable_service.py` | Device OAuth, health data sync |

### Database Collections (MongoDB)

```javascript
// Users
db.users.insertOne({
  _id: ObjectId,
  email: "user@example.com",
  name: "John Doe",
  hashed_password: string,
  created_at: Date,
  updated_at: Date
})

// Health Profiles
db.health_profiles.insertOne({
  _id: ObjectId,
  user_id: ObjectId,
  age: int,
  weight: float,
  height: float,
  goal: string,
  fitness_level: string,
  created_at: Date
})

// Fitness Plans
db.plans.insertOne({
  _id: ObjectId,
  user_id: ObjectId,
  title: string,
  duration_weeks: int,
  goal: string,
  workouts: array,
  nutrition: object,
  created_at: Date
})

// Workout Logs
db.workout_logs.insertOne({
  _id: ObjectId,
  user_id: ObjectId,
  exercise: string,
  sets: int,
  reps: int,
  weight: float,
  date: Date
})

// Food Logs
db.food_logs.insertOne({
  _id: ObjectId,
  user_id: ObjectId,
  food_name: string,
  quantity: float,
  calories: float,
  protein: float,
  carbs: float,
  fat: float,
  date: Date
})
```

## 🚀 Advanced Usage

### Custom AI Models

To use different classification models:

```python
# In server/app/services/ai_service.py
from transformers import AutoImageProcessor, AutoModelForImageClassification

# Replace model
processor = AutoImageProcessor.from_pretrained('your-model-id')
model = AutoModelForImageClassification.from_pretrained('your-model-id')
```

### Extending the API

```python
# Add new endpoint in server/app/api/routes/custom.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/custom-endpoint")
async def custom_endpoint():
    return {"message": "Custom endpoint"}
```

### Custom Frontend Pages

```jsx
// Create new page in client/src/pages/CustomPage.jsx
import { useAuthStore } from '../store/authStore'

export default function CustomPage() {
  const { user } = useAuthStore()
  return <div>Custom content for {user.name}</div>
}

// Add route in client/src/App.jsx
<Route path="/custom" element={<CustomPage />} />
```

### Database Optimization

```javascript
// Create indexes for faster queries
db.users.createIndex({ email: 1 }, { unique: true })
db.workout_logs.createIndex({ user_id: 1, date: -1 })
db.food_logs.createIndex({ user_id: 1, date: -1 })
db.plans.createIndex({ user_id: 1, created_at: -1 })
```

## 🔐 Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong random `SECRET_KEY`
   - Rotate `GEMINI_API_KEY` regularly

2. **API Security**
   - Always use HTTPS in production
   - Implement rate limiting
   - Validate all user inputs
   - Use CORS carefully

3. **Database Security**
   - Use strong MongoDB password
   - Enable network encryption
   - Backup database regularly
   - Monitor access logs

4. **Frontend Security**
   - Sanitize user inputs
   - Implement CSRF protection
   - Use secure cookies
   - Keep dependencies updated

5. **Deployment Security**
   - Use environment-specific configs
   - Enable HTTPS/TLS
   - Implement logging and monitoring
   - Regular security updates

## 🤝 Contributing

We welcome contributions! Here's how to get involved:

1. **Fork the repository**
```bash
git clone https://github.com/yourusername/fit-ai.git
cd fit-ai
```

2. **Create a feature branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**
- Follow code style guidelines
- Write tests for new features
- Update documentation

4. **Commit and push**
```bash
git add .
git commit -m "Add amazing feature"
git push origin feature/amazing-feature
```

5. **Submit a Pull Request**
- Describe changes clearly
- Reference related issues
- Wait for review and feedback

### Development Guidelines

- **Code Style**: Follow PEP 8 (Python), ESLint config (JavaScript)
- **Commits**: Use descriptive messages
- **Testing**: Add tests for new features
- **Documentation**: Update README for significant changes

## 📊 Project Statistics

- **Frontend**: ~10 React components, ~250 lines per component avg
- **Backend**: ~12 API route files, RESTful architecture
- **Database**: 6+ MongoDB collections
- **Lines of Code**: ~5000+ across frontend and backend
- **API Endpoints**: 40+ available endpoints

## 📈 Roadmap

### Planned Features
- [ ] Native mobile app (React Native)
- [ ] Advanced ML for personalized recommendations
- [ ] Social features (friend challenges, sharing)
- [ ] Integration with more wearable devices
- [ ] Meal plan generation AI
- [ ] Virtual personal trainer (video guidance)
- [ ] Offline mode for mobile
- [ ] Real-time workout form detection (pose estimation)

### Technology Upgrades
- [ ] Migrate to TypeScript (frontend & backend)
- [ ] Implement GraphQL for API
- [ ] Add WebSocket for real-time updates
- [ ] Performance optimization with caching
- [ ] Kubernetes deployment support

## 📝 License

MIT License - Feel free to use this project for personal or commercial purposes.

```
Copyright (c) 2024 FitAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software.
```

## 🙏 Acknowledgments

### Technology & Libraries
- **Hugging Face** - Body classification model ([glazzova/body_complexion](https://huggingface.co/glazzova/body_complexion))
- **Google Gemini** - AI text generation and capabilities
- **FastAPI** - Modern, fast Python web framework with async support
- **React** - UI library with hooks and modern patterns
- **TailwindCSS** - Utility-first CSS framework
- **MongoDB** - Flexible NoSQL database
- **PyTorch** - Deep learning framework
- **Transformers** - Pre-trained model hub

### Services & APIs
- **MongoDB Atlas** - Cloud database hosting
- **Google AI Studio** - Gemini API access
- **Fitbit/Apple Health/Garmin** - Wearable device APIs

### Community
- FastAPI community for excellent documentation
- React community for best practices and examples
- Open-source contributors

## 📧 Contact & Support

### Getting Help
- **Issues**: Found a bug? Open a GitHub Issue
- **Discussions**: Have questions? Start a Discussion
- **Email**: support@fit-ai.example.com

### Connect With Us
- **Twitter**: [@FitAI](https://twitter.com/fitai)
- **Discord**: [Join Community Server](https://discord.gg/fitai)

## 🎯 Quick Links

| Link | Purpose |
|------|---------|
| [Setup Guide](SETUP.md) | Detailed setup instructions |
| [Docker Guide](DOCKER.md) | Docker and deployment guide |
| [Quick Reference](QUICK_REFERENCE.md) | Quick command cheatsheet |

---

<div align="center">

### Built with ❤️ using React, FastAPI, and AI

**[⬆ back to top](#-fitai---ai-powered-personal-fitness-platform)**

</div>

