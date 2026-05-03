# TaskFlow - Project Management App

A full-stack project management application with role-based access control, task tracking, and team collaboration features.

## 🌐 Live URL
[https://imaginative-reflection-production-ea56.up.railway.app](https://imaginative-reflection-production-ea56.up.railway.app)

## 📦 GitHub Repository
[https://github.com/Aastha-10/ProjectManagementApp](https://github.com/Aastha-10/ProjectManagementApp)

## 🚀 Features

### Authentication
- User Signup and Login with JWT tokens
- Role-based access control (Admin / Member)
- Secure password hashing with bcrypt

### Admin Features
- Create and manage projects
- Add members to projects
- Create and assign tasks
- View all tasks and team progress
- Delete projects and tasks

### Member Features
- View assigned tasks
- Update task status (Todo / In Progress / Done)
- Kanban board with drag and drop
- Personal task board

### Dashboard
- Clickable stat cards (Total, Todo, In Progress, Done, Overdue)
- Click any card to filter tasks by status
- Quick summary of team progress

### Task Management
- Create tasks with title, description, deadline
- Assign tasks to team members
- Track overdue tasks
- Filter tasks by status

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, React Router |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Authentication | JWT, bcryptjs |
| Deployment | Railway |

## ⚙️ API Endpoints

### Auth
- POST `/api/auth/signup` - Register user
- POST `/api/auth/login` - Login user
- GET `/api/auth/users` - Get all users (Admin only)

### Projects
- POST `/api/projects` - Create project (Admin only)
- GET `/api/projects` - Get all projects
- GET `/api/projects/:id` - Get single project
- POST `/api/projects/:id/members` - Add member (Admin only)
- DELETE `/api/projects/:id` - Delete project (Admin only)

### Tasks
- POST `/api/tasks` - Create task (Admin only)
- GET `/api/tasks` - Get all tasks
- GET `/api/tasks/dashboard` - Get dashboard stats
- PATCH `/api/tasks/:id/status` - Update task status
- DELETE `/api/tasks/:id` - Delete task (Admin only)

## 🗄️ Database Models

### User
- name, email, password, role (admin/member)

### Project
- name, description, createdBy, members[]

### Task
- title, description, projectId, assignedTo, status, deadline

## 🚀 Local Setup

### Prerequisites
- Node.js v20+
- MongoDB Atlas account

### Backend
```bash
cd backend
npm install
# Create .env file with MONGO_URI and JWT_SECRET
node index.js
```

### Frontend
```bash
cd frontend
npm install
npm start
```

## 👥 Roles

| Feature | Admin | Member |
|---|---|---|
| Create Project | ✅ | ❌ |
| Add Members | ✅ | ❌ |
| Create Tasks | ✅ | ❌ |
| Update Task Status | ✅ | ✅ |
| View Dashboard | ✅ | ✅ |
| Kanban Board | ✅ | ✅ |
