import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard/dashboard";
import CreateProject from "./pages/Dashboard/CreateProject";
import CreateTask from "./pages/Dashboard/CreateTask";
import AuthPage from "./pages/AuthPage";
import ForgotPassword from "./pages/ForgotPassword";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-project" element={<CreateProject />} />
        <Route path="/create-task" element={<CreateTask />} />
      </Routes>
    </Router>
  );
}
