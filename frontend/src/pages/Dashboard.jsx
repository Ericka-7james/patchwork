import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, isProfileLoading, signOut } = useAuth();
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

  const username = profile?.username;

  return (
    <div className="dashboard-page">
      <Header
        variant="app"
        username={username}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="dashboard-main">
        <section className="dashboard-intro">
          <p className="eyebrow">Your workspace</p>

          <h1>
            {isProfileLoading
              ? "Welcome back."
              : `Welcome${username ? `, ${username}` : ""}.`}
          </h1>

          <p>
            Your PatchWork dashboard is ready. Resume upload and review tools
            are coming next.
          </p>
        </section>

        <section className="dashboard-card">
          <p className="eyebrow">Account</p>
          <h2>Dashboard setup complete</h2>

          <p>
            You are signed in
            {user?.email ? ` as ${user.email}` : ""}.
          </p>

          <p>
            The next stage will add your private resume upload workflow here.
          </p>
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
