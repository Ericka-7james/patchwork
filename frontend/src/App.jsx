import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "./pages/Home";

import Signup from "./pages/Signup";

import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";

import Profile from "./pages/Profile";

import ResumeGenerator from "./pages/ResumeGenerator";

import ProtectedRoute from "./components/ProtectedRoute";

import { AuthProvider } from "./context/AuthContext";

import ForgotPassword from "./pages/ForgotPassword";

import ResetPassword from "./pages/ResetPassword";

// import JobReview from "./pages/JobReview";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/signup" element={<Signup />} />

          <Route path="/login" element={<Login />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/profile" element={<Profile />} />

            <Route path="/resume-generator" element={<ResumeGenerator />} />

            {/* Job Review is temporarily disabled until Gmail sync is production-ready.

            <Route path="/job-review" element={<JobReview />} />

            */}
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
