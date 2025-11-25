import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import Dashboard from './pages/Dashboard/dashboard'
import Profile from './pages/Dashboard/Profile'
import Settings from './pages/Dashboard/Settings'
import HelpSupport from './pages/Dashboard/HelpSupport'
import TaskDetails from './pages/Dashboard/TaskDetails'
import ForgotPassword from './pages/Auth/ForgotPassword'
import AcceptInvitation from './pages/Auth/AcceptInvitation'
import Notifications from './pages/Notifications/Notifications'
import CreateProject from './pages/Dashboard/CreateProject'
import ProjectWorkspace from './pages/ProjectWorkspace/ProjectWorkspace'
import FileSharing from './pages/FileSharing/FileSharing'
import Conversation from './pages/Chat/Conversation'
import IndividualChat from './pages/Chat/IndividualChat'
import ProjectAnalytics from "./pages/Dashboard/analytics";
import AIAgentComingSoon from './pages/ProjectWorkspace/AIAgentComingSoon'

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a proper loading component
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
        <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/projects/create" element={isAuthenticated ? <CreateProject /> : <Navigate to="/login" replace />} />
        <Route path="/projects/:projectId" element={isAuthenticated ? <ProjectWorkspace /> : <Navigate to="/login" replace />} />
        <Route path="/projects/:projectId/files" element={isAuthenticated ? <FileSharing /> : <Navigate to="/login" replace />} />
        <Route path="/accept-invitation/:projectId" element={<AcceptInvitation />} />
        <Route path="/notifications" element={isAuthenticated ? <Notifications /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} />
        <Route path="/settings" element={isAuthenticated ? <Settings /> : <Navigate to="/login" replace />} />
        <Route path="/help" element={isAuthenticated ? <HelpSupport /> : <Navigate to="/login" replace />} />
        <Route path="/chat/:projectId" element={isAuthenticated ? <Conversation /> : <Navigate to="/login" replace />} />
        <Route path="/chat/individual/:chatId" element={isAuthenticated ? <IndividualChat /> : <Navigate to="/login" replace />} />
        <Route path="/projects/:id/analytics" element={isAuthenticated ? <ProjectAnalytics /> : <Navigate to="/login" replace />} />
        <Route path="/projects/:projectId/tasks/:taskId/ai-agent" element={isAuthenticated ? <AIAgentComingSoon /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App

