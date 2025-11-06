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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/accept-invitation/:projectId" element={<AcceptInvitation />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App


