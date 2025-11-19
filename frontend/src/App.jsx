import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard/dashboard'
import ForgotPassword from './pages/ForgotPassword'
import AcceptInvitation from './pages/AcceptInvitation'
<<<<<<< HEAD
=======
import ProjectCreate from './pages/project_create'
import Conversation from './pages/Conversation'
import IndividualChat from './pages/IndividualChat'
>>>>>>> 7a11420 (Add delete option in chat, media sharing and search option, connect for this frontend and backend)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
<<<<<<< HEAD
=======
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<HelpSupport />} />
        <Route path="/tasks/:taskId" element={<TaskDetails />} />
        <Route path="/projects/create" element={<ProjectCreate />} />
        <Route path="/chat/:projectId" element={<Conversation />} />
        <Route path="/chat/individual/:chatId" element={<IndividualChat />} />
>>>>>>> 7a11420 (Add delete option in chat, media sharing and search option, connect for this frontend and backend)
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/accept-invitation/:projectId" element={<AcceptInvitation />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App


