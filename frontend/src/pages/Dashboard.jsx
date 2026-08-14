import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { DASHBOARD_CONTENT } from "../content/pages/dashboardContent";
import { useAuth } from "../context/useAuth";
import "./styles/Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const { profile, isProfileLoading, signOut } = useAuth();

  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const firstName = profile?.first_name;
  const { intro, upload, errors, routes } = DASHBOARD_CONTENT;

  async function handleLogout() {
    setLogoutError("");
    setIsLoggingOut(true);

    try {
      await signOut();
      navigate(routes.login, { replace: true });
    } catch (error) {
      setLogoutError(error.message || errors.logoutFallback);
      setIsLoggingOut(false);
    }
  }

  const greeting = isProfileLoading
    ? intro.loadingGreeting
    : `Welcome${firstName ? `, ${firstName}` : ""}`;

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
          <p className="eyebrow">{intro.eyebrow}</p>
          <h1>{greeting}</h1>
          <p>{intro.description}</p>
        </section>

        <section className="resume-upload-card">
          <div className="resume-upload-heading">
            <p className="eyebrow">{upload.eyebrow}</p>
            <h2>{upload.heading}</h2>
            <p>{upload.description}</p>
          </div>

          <div className="resume-upload-placeholder">
            <strong>{upload.placeholderTitle}</strong>
            <span>{upload.acceptedFormats}</span>

            <button type="button" className="button button-primary" disabled>
              {upload.buttonLabel}
            </button>

            <small>{upload.placeholderMessage}</small>
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
