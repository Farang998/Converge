import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard/dashboard'
import Profile from './pages/Dashboard/Profile'
import Settings from './pages/Dashboard/Settings'
import HelpSupport from './pages/Dashboard/HelpSupport'
import TaskDetails from './pages/Dashboard/TaskDetails'
import ForgotPassword from './pages/ForgotPassword'
import AcceptInvitation from './pages/AcceptInvitation'
import Notifications from './pages/Notifications'
import CreateProject from '../pages/Dashboard/CreateProject'
import ProjectWorkspace from '../pages/ProjectWorkspace/ProjectWorkspace'

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
        <Route path="/accept-invitation/:projectId" element={<AcceptInvitation />} />
        <Route path="/notifications" element={isAuthenticated ? <Notifications /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} />
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
  )
}

export default App


