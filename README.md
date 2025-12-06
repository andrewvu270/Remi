# MyDesk

**An intelligent productivity assistant powered by multi-agent AI**

MyDesk helps you optimize your work and study by extracting tasks from documents, predicting workload and stress levels, and generating optimized schedules using machine learning and LLM-powered agents.

## 🚀 What Makes MyDesk Unique

- **Multi-Agent Architecture**: 5 specialized AI agents working together orchestrated by an Orchestrator Agent
- **Hybrid LLM + ML Predictions**: Combines GPT-4 reasoning with calibrated machine learning for accurate workload estimates
- **Stress & Burnout Prevention**: Predicts stress levels and warns when workload is too high
- **Natural Language Interface**: Ask questions like "What's my busiest day this week?" or "Move low-effort tasks to tomorrow"
- **Multi-Domain Support**: Not just for students - works for professionals, freelancers, and anyone managing tasks
- **Smart Scheduling**: Automatically balances workload across days to avoid burnout
- **Intelligent Task Parsing**: Upload PDFs, documents, or paste text - AI extracts all tasks and deadlines

## Features

- **Syllabus Processing**: Upload PDF or image syllabi and automatically extract all assignments, exams, and deadlines
- **AI-Powered Extraction**: Uses OpenAI GPT to intelligently parse and categorize academic tasks
- **Guest Mode**: Try the app without creating an account - data stored locally in browser
- **Cloud Sync**: Logged-in users get automatic cloud storage and sync across devices
- **Seamless Migration**: Guest data automatically migrates to cloud when you create an account
- **Smart Weighting**: Automatically calculates task importance based on grade percentage, task type, and instructor emphasis
- **Workload Prediction**: ML models predict how much time each task will take based on historical data
- **Optimized Scheduling**: Generates daily and weekly study schedules optimized for productivity
- **Smart Notifications**: Timely reminders for upcoming deadlines and study sessions
- **Progress Tracking**: Monitor study habits and task completion over time
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Technology Stack

### Multi-Agent System
- **Orchestrator Agent**: Coordinates all agents and manages workflows
- **Task Parsing Agent**: LLM-powered extraction from PDFs, documents, emails
- **Workload Prediction Agent**: Hybrid LLM + ML for effort and stress estimation
- **Prioritization Agent**: Intelligent task ranking with explanations
- **Schedule Optimization Agent**: Workload balancing and burnout prevention
- **Natural Language Agent**: Process queries and commands in plain English

### Backend deployed on Google Cloud Run
- **FastAPI**: Modern, fast web framework for building APIs
- **Python**: Core programming language
- **Supabase**: Primary database (PostgreSQL backend)
- **OpenAI GPT-4**: LLM for intelligent reasoning and natural language
- **LightGBM**: Machine learning for workload prediction calibration
- **pdfplumber**: PDF text extraction
- **Tesseract**: OCR for image-based documents

### Frontend deployed on CLoudflare
- **React**: User interface library
- **TypeScript**: Type-safe JavaScript
- **Material-UI**: React component library
- **React Router**: Client-side routing
- **Axios**: HTTP client for API requests

### Infrastructure
- **Docker**: Containerization (for backend services)

## Usage Guide

### Guest Mode (No Account Required)

1. **Start Using Immediately**
   - Navigate to the application
   - Upload syllabi and manage tasks without signing up
   - All data stored locally in your browser

2. **Upload a Syllabus**
   - Go to Dashboard
   - Click "Upload Syllabus" 
   - Select a PDF file
   - Tasks are automatically extracted and stored locally

3. **View Tasks & Schedule**
   - Tasks appear in the Tasks page
   - Schedule view shows upcoming deadlines
   - All features work without an account

### Registered Users

1. **Create an Account**
   - Click "Sign Up"
   - Enter email and password
   - Your guest data automatically migrates to the cloud

2. **Benefits of Registration**
   - Data synced across all devices
   - Permanent cloud storage
   - Access from anywhere
   - Never lose your data

### Core Features

1. **Upload a Syllabus**
   - Navigate to Dashboard
   - Click "Upload Syllabus"
   - Choose a PDF file
   - AI extracts all tasks, deadlines, and weights
   - Review and edit if needed

2. **View Your Schedule**
   - Go to "Schedule" page
   - See calendar view of all tasks
   - Click on dates to see task details
   - Track upcoming deadlines

3. **Manage Tasks**
   - View all tasks in "Tasks" page
   - Sort by deadline or priority
   - Mark tasks as complete
   - Track your progress

4. **Track Progress**
   - Monitor completion rates
   - View study analytics
   - Track time spent on tasks

## Security Considerations

- All API endpoints require authentication
- JWT tokens with expiration
- Input validation and sanitization
- File upload restrictions
- CORS configuration
- Environment variable protection
- SQL injection prevention through ORM

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
