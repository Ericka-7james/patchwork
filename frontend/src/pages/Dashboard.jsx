import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { DASHBOARD_CONTENT } from "../content/pages/dashboardContent";
import { useAuth } from "../context/useAuth";
import { uploadResume } from "../services/resumeService";
import "./styles/Dashboard.css";

const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024;

const ACCEPTED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function Dashboard() {
  const navigate = useNavigate();

  const { user, profile, isProfileLoading, refreshResumeState, signOut } =
    useAuth();

  const fileInputRef = useRef(null);

  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [selectedResume, setSelectedResume] = useState(null);
  const [resumeError, setResumeError] = useState("");
  const [resumeSuccess, setResumeSuccess] = useState("");
  const [isUploadingResume, setIsUploadingResume] = useState(false);

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

  function handleChooseResume() {
    fileInputRef.current?.click();
  }

  function handleResumeChange(event) {
    const file = event.target.files?.[0];

    setResumeError("");
    setResumeSuccess("");

    if (!file) {
      return;
    }

    if (!ACCEPTED_RESUME_TYPES.has(file.type)) {
      setSelectedResume(null);
      setResumeError(errors.unsupportedResumeType);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      setSelectedResume(null);
      setResumeError(errors.resumeTooLarge);
      event.target.value = "";
      return;
    }

    setSelectedResume(file);
  }

  async function handleResumeUpload() {
    if (!selectedResume || !user) {
      return;
    }

    setResumeError("");
    setResumeSuccess("");
    setIsUploadingResume(true);

    try {
      await uploadResume({
        userId: user.id,
        file: selectedResume,
      });

      await refreshResumeState();

      setResumeSuccess(upload.successMessage);

      navigate(routes.profile, { replace: true });
    } catch (error) {
      setResumeError(error.message || errors.uploadFallback);
    } finally {
      setIsUploadingResume(false);
    }
  }

  const greeting = isProfileLoading
    ? intro.loadingGreeting
    : `Welcome${firstName ? `, ${firstName}!` : "!"}`;

  return (
    <div className="site-shell">
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

            <input
              ref={fileInputRef}
              className="resume-file-input"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeChange}
              aria-label="Resume file"
              disabled={isUploadingResume}
            />

            <button
              type="button"
              className="button button-primary"
              onClick={handleChooseResume}
              disabled={isUploadingResume}
            >
              {selectedResume ? upload.changeButtonLabel : upload.buttonLabel}
            </button>

            {selectedResume && (
              <div className="resume-selected-file" role="status">
                <span>{upload.selectedLabel}</span>
                <strong>{selectedResume.name}</strong>
              </div>
            )}

            {selectedResume && (
              <button
                type="button"
                className="button button-outline resume-submit-button"
                onClick={handleResumeUpload}
                disabled={isUploadingResume}
              >
                {isUploadingResume
                  ? upload.uploadingButtonLabel
                  : upload.uploadButtonLabel}
              </button>
            )}

            {resumeSuccess && (
              <div className="resume-upload-success" role="status">
                {resumeSuccess}
              </div>
            )}

            {resumeError && (
              <div className="resume-upload-error" role="alert">
                {resumeError}
              </div>
            )}
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
