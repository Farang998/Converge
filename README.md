# Converge - Remote Work Collaboration Platform

A comprehensive web-based platform designed to streamline team productivity and communication for distributed teams. Converge provides an all-in-one solution for project management, real-time communication, task tracking, and collaborative workflow management.

## Features

### Project Management
- Create and manage projects with team hierarchies
- Role-based access control (Team Leader, Members, Collaborators)
- Project invitation workflow with acceptance/decline
- Project analytics and team activity dashboard
- GitHub repository integration for version control

### Task Management
- Comprehensive task creation and assignment
- Directed Acyclic Graph (DAG) based task dependencies
- Visual dependency workflow management
- Task status tracking (pending, in-progress, completed)
- Team member task assignments and due dates
- Task analytics and workflow reporting

### Real-Time Communication
- Multi-channel group chat for projects
- Individual direct messaging between team members
- Threaded conversations for organized discussions
- Message search functionality with full-text support
- Read receipts and message status tracking
- Media file sharing in messages and chats
- AI-powered chat summarization using Gemini API

### File Sharing
- Secure file upload and storage (AWS S3)
- Project-level file repository
- File download and preview capabilities
- Automatic AI context ingestion for document analysis
- Support for multiple file types (images, videos, documents, code)

### Calendar Integration
- Google Calendar synchronization
- Event creation and scheduling within projects
- Meeting coordination features
- Automatic timezone handling

### Notifications
- Real-time notification system
- Project invitation notifications
- Message and activity alerts
- Read/unread status tracking
- Persistent notification history

### AI Features
- AI-powered chat summarization using Google Gemini
- Context-aware project insights
- Intelligent document analysis for uploaded files

## Technology Stack

### Backend
- Framework: Django 5.x with Django REST Framework
- Async Support: Django Channels with Daphne ASGI server
- WebSocket: Real-time bidirectional communication
- Databases:
  - MongoDB (via MongoEngine) - Chat data, messages, threads
  - PostgreSQL - User authentication, projects, tasks, team management
- Authentication: JWT (JSON Web Tokens)
- File Storage: AWS S3
- AI Integration: Google Generative AI (Gemini)
- Email: Django's email backend with background task support

### Frontend
- Framework: React with modern JavaScript/ES6+
- Build Tool: Vite
- HTTP Client: Custom API service with axios
- State Management: React Context API
- UI Components: Custom React components with CSS
- Real-time Updates: WebSocket client

### DevOps
- Web Server: Daphne (ASGI server)
- Development Server: Django development server
- Container Support: Docker compatible
- Environment Management: python-dotenv

## Project Structure

```
Converge1.2/
├── backend/
│   └── remote-work/
│       ├── manage.py
│       ├── mysite/
│       │   ├── settings.py
│       │   ├── urls.py
│       │   ├── asgi.py
│       │   ├── wsgi.py
│       │   └── routers.py
│       └── api/
│           ├── auth/
│           ├── projects/
│           ├── tasks/
│           ├── file_sharing/
│           ├── notifications/
│           ├── calendar/
│           └── Chat/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── contexts/
└── documentation/
```

## Prerequisites

- Python 3.11 or higher
- Node.js 16.0 or higher
- npm 8.0 or higher
- MongoDB 5.0 or higher
- PostgreSQL 12.0 or higher
- AWS Account (for S3 file storage)
- Google Cloud Account (for Gemini AI and Calendar integration)
- Git

## Installation

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/Farang998/Converge.git
cd Converge1.2/backend/remote-work
```

2. Create and activate virtual environment:
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create .env file with required configuration

5. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

6. Create superuser:
```bash
python manage.py createsuperuser
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd ../../../frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file with API endpoints

## Configuration

### Environment Variables

Backend (.env in backend/remote-work):
```
DATABASE_URL=postgresql://user:password@localhost:5432/converge_db
MONGODB_URI=mongodb://localhost:27017/converge_chat
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GEMINI_API_KEY=your-gemini-api-key
JWT_SECRET_KEY=your-jwt-secret-key
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Frontend (.env in frontend):
```
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
FIREBASE_API_KEY=your-firebase-api-key
```

## Running the Application

### Development

1. Start backend:
```bash
cd backend/remote-work
python manage.py runserver
```

2. Start Daphne (WebSocket support):
```bash
daphne -b 0.0.0.0 -p 8001 mysite.asgi:application
```

3. Start frontend:
```bash
cd frontend
npm run dev
```

4. Access application:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Admin: http://localhost:8000/admin

### Authentication
```
POST /api/auth/register/
POST /api/auth/login/
POST /api/auth/logout/
GET  /api/auth/identify-user/
```

### Projects
```
GET    /api/projects/
POST   /api/projects/
GET    /api/projects/{id}/
PATCH  /api/projects/{id}/
DELETE /api/projects/{id}/
POST   /api/projects/accept-invitation/{id}/
```

### Chat
```
GET    /api/chats/
GET    /api/chats/{chat_id}/messages/
POST   /api/chats/{chat_id}/messages/
GET    /api/chats/project/{project_id}/
POST   /api/chats/project/{project_id}/send/
GET    /api/chats/{chat_id}/search/
POST   /api/chats/{project_id}/threads/
```

### Tasks
```
GET    /api/tasks/
POST   /api/tasks/
GET    /api/tasks/{id}/
PATCH  /api/tasks/{id}/
DELETE /api/tasks/{id}/
```

### Files
```
GET    /api/file_sharing/{project_id}/
POST   /api/file_sharing/{project_id}/upload/
GET    /api/file_sharing/download/{file_id}/
DELETE /api/file_sharing/{file_id}/
```
