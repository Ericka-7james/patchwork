import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const { profile, isProfileLoading, signOut } = useAuth();

  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setLogoutError("");
    setIsLoggingOut(true);

    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(error.message || "Unable to log out. Please try again.");
      setIsLoggingOut(false);
    }
  }

  const firstName = profile?.first_name;

  return (
    <div className="dashboard-page">
      <Header
        variant="app"
        firstName={firstName}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="dashboard-main">
        <section className="dashboard-intro">
          <p className="eyebrow">Your workspace</p>

          <h1>
            {isProfileLoading
              ? "Welcome back."
              : `Welcome${firstName ? `, ${firstName}` : ""}.`}
          </h1>

          <p>
            Upload your current resume and PatchWork will help you review,
            organize, and strengthen how your experience is presented.
          </p>
        </section>

        <section className="resume-upload-card">
          <div className="resume-upload-heading">
            <p className="eyebrow">Resume upload</p>
            <h2>Start with your current resume</h2>

            <p>
              Upload the resume you want to improve. You will review everything
              PatchWork extracts before any updated resume is created.
            </p>
          </div>

          <div className="resume-upload-placeholder">
            <strong>Upload your resume</strong>

            <span>PDF or DOCX</span>

            <button type="button" className="button button-primary" disabled>
              Choose resume
            </button>

            <small>Resume uploading will be connected in the next step.</small>
          </div>
        </section>

        {logoutError && (
          <div className="dashboard-alert" role="alert">
            {logoutError}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;
