import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import HarvardResume from "../components/resume/HarvardResume";
import { RESUME_GENERATOR_CONTENT } from "../content/pages/resumeGeneratorContent";
import { useAuth } from "../context/useAuth";
import { getResumeByUserId } from "../services/resumeService";
import "./styles/ResumeGenerator.css";

function ResumeGenerator() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const [resume, setResume] = useState(null);
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [resumeError, setResumeError] = useState("");

  const [fitReport, setFitReport] = useState(null);

  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const firstName = profile?.first_name;

  const { intro, template, actions, loading, errors, routes } =
    RESUME_GENERATOR_CONTENT;

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    let isActive = true;

    async function loadResume() {
      setIsLoadingResume(true);
      setResumeError("");
      setFitReport(null);

      try {
        const resumeData = await getResumeByUserId(user.id);

        if (!isActive) {
          return;
        }

        if (!resumeData?.parsed_data) {
          setResume(null);
          setResumeError(errors.missingResume);
          return;
        }

        setResume(resumeData);
      } catch (error) {
        if (isActive) {
          setResumeError(error.message || errors.loadFallback);
        }
      } finally {
        if (isActive) {
          setIsLoadingResume(false);
        }
      }
    }

    loadResume();

    return () => {
      isActive = false;
    };
  }, [user?.id, errors.loadFallback, errors.missingResume]);

  const handleFitChange = useCallback((nextReport) => {
    setFitReport(nextReport);
  }, []);

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

  const removedContent =
    fitReport &&
    (fitReport.removedSkills > 0 || fitReport.removedProjectBullets > 0);

  return (
    <div className="site-shell">
      <Header
        variant="app"
        firstName={firstName}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="resume-generator-main">
        <section className="resume-generator-intro">
          <p className="eyebrow">{intro.eyebrow}</p>
          <h1>{intro.heading}</h1>
          <p>{intro.description}</p>
        </section>

        {isLoadingResume && (
          <div className="resume-generator-status" role="status">
            {loading.message}
          </div>
        )}

        {!isLoadingResume && resumeError && (
          <div className="resume-generator-alert" role="alert">
            {resumeError}
          </div>
        )}

        {!isLoadingResume && !resumeError && resume && (
          <section className="resume-generator-workspace">
            <div className="resume-generator-toolbar">
              <div>
                <p className="resume-generator-template-label">
                  {template.name}
                </p>

                <p className="resume-generator-template-description">
                  {template.description}
                </p>
              </div>

              <Link
                to={routes.profile}
                className="button button-small button-outline"
              >
                {actions.backToProfile}
              </Link>
            </div>

            <div className="resume-generator-preview">
              <HarvardResume
                parsedData={resume.parsed_data}
                onFitChange={handleFitChange}
              />
            </div>

            {removedContent && (
              <div className="resume-generator-adjustment" role="status">
                <strong>Resume adjusted to fit within two pages.</strong>

                <ul>
                  {fitReport.removedSkills > 0 && (
                    <li>
                      {fitReport.removedSkills} lower-priority{" "}
                      {fitReport.removedSkills === 1 ? "skill" : "skills"}{" "}
                      removed from the generated resume.
                    </li>
                  )}

                  {fitReport.removedProjectBullets > 0 && (
                    <li>
                      {fitReport.removedProjectBullets}{" "}
                      {fitReport.removedProjectBullets === 1
                        ? "project bullet"
                        : "project bullets"}{" "}
                      removed from the generated resume.
                    </li>
                  )}
                </ul>

                <p>Your original uploaded resume was not changed.</p>
              </div>
            )}

            {fitReport && !fitReport.fits && (
              <div className="resume-generator-page-warning" role="alert">
                <strong>
                  This resume still cannot safely fit within two pages.
                </strong>

                <span>
                  PatchWork preserved your contact information, summary,
                  education, work experience, certifications, and project
                  details instead of cutting them off.
                </span>
              </div>
            )}
          </section>
        )}

        {logoutError && (
          <div className="resume-generator-alert" role="alert">
            {logoutError}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default ResumeGenerator;
