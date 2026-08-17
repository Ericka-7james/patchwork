import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ExperienceModal from "../components/profile/ExperienceModal";
import { PROFILE_CONTENT } from "../content/pages/profileContent";
import { useAuth } from "../context/useAuth";
import {
  getResumeByUserId,
  updateResumeExperience,
} from "../services/resumeService";
import "./styles/Profile.css";

const MOBILE_MEDIA_QUERY = "(max-width: 600px)";
const MAX_OPEN_ITEMS = 3;

function isMobileViewport() {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }

  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function getDefaultSectionOpenState() {
  return !isMobileViewport();
}

function getDefaultSkillCategories(skills) {
  if (isMobileViewport()) {
    return [];
  }

  return Object.keys(skills).slice(0, MAX_OPEN_ITEMS);
}

function toggleLimitedItem(currentItems, itemKey) {
  if (currentItems.includes(itemKey)) {
    return currentItems.filter((key) => key !== itemKey);
  }

  if (currentItems.length < MAX_OPEN_ITEMS) {
    return [...currentItems, itemKey];
  }

  return [...currentItems.slice(1), itemKey];
}

function getProjectTitle(project, index) {
  if (typeof project === "string") {
    return project.trim() || `Project ${index + 1}`;
  }

  if (!project || typeof project !== "object") {
    return `Project ${index + 1}`;
  }

  const possibleTitle =
    project.name ??
    project.title ??
    project.heading ??
    project.project_name ??
    project.projectName;

  if (typeof possibleTitle === "string" && possibleTitle.trim()) {
    return possibleTitle.trim();
  }

  return `Project ${index + 1}`;
}

function getProjectDescription(project) {
  if (!project || typeof project === "string") {
    return "";
  }

  const description =
    project.description ?? project.summary ?? project.subtitle ?? "";

  return typeof description === "string" ? description.trim() : "";
}

function getProjectDates(project) {
  if (!project || typeof project === "string") {
    return "";
  }

  const dates = project.dates ?? project.date ?? project.duration ?? "";

  return typeof dates === "string" ? dates.trim() : "";
}

function getProjectBullets(project) {
  if (!project || typeof project === "string") {
    return [];
  }

  if (Array.isArray(project.bullets)) {
    return project.bullets;
  }

  if (Array.isArray(project.details)) {
    return project.details;
  }

  return [];
}

function Profile() {
  const navigate = useNavigate();

  const { user, profile, signOut } = useAuth();

  const [resume, setResume] = useState(null);
  const [isLoadingResume, setIsLoadingResume] = useState(true);
  const [resumeError, setResumeError] = useState("");

  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [isSkillsOpen, setIsSkillsOpen] = useState(getDefaultSectionOpenState);

  const [isEducationOpen, setIsEducationOpen] = useState(
    getDefaultSectionOpenState
  );

  const [isExperienceOpen, setIsExperienceOpen] = useState(
    getDefaultSectionOpenState
  );

  const [isProjectsOpen, setIsProjectsOpen] = useState(
    getDefaultSectionOpenState
  );

  const [isCertificationsOpen, setIsCertificationsOpen] = useState(
    getDefaultSectionOpenState
  );

  const [openSkillCategories, setOpenSkillCategories] = useState([]);
  const [openExperienceItems, setOpenExperienceItems] = useState([]);
  const [openProjectItems, setOpenProjectItems] = useState([]);

  const [selectedExperienceIndex, setSelectedExperienceIndex] = useState(null);

  const firstName = profile?.first_name;

  const { intro, filename, sections, loading, errors, routes } =
    PROFILE_CONTENT;

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    let isActive = true;

    async function loadResume() {
      setIsLoadingResume(true);
      setResumeError("");

      try {
        const resumeData = await getResumeByUserId(user.id);

        if (!isActive) {
          return;
        }

        setResume(resumeData);

        setOpenSkillCategories(
          getDefaultSkillCategories(resumeData?.parsed_data?.skills ?? {})
        );

        setOpenExperienceItems([]);
        setOpenProjectItems([]);
        setSelectedExperienceIndex(null);
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
  }, [user?.id, errors.loadFallback]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

    function handleViewportChange(event) {
      const shouldOpen = !event.matches;

      setIsSkillsOpen(shouldOpen);
      setIsEducationOpen(shouldOpen);
      setIsExperienceOpen(shouldOpen);
      setIsProjectsOpen(shouldOpen);
      setIsCertificationsOpen(shouldOpen);

      if (event.matches) {
        setOpenSkillCategories([]);
      } else {
        setOpenSkillCategories(
          Object.keys(resume?.parsed_data?.skills ?? {}).slice(
            0,
            MAX_OPEN_ITEMS
          )
        );
      }

      setOpenExperienceItems([]);
      setOpenProjectItems([]);
    }

    mediaQuery.addEventListener("change", handleViewportChange);

    return () => {
      mediaQuery.removeEventListener("change", handleViewportChange);
    };
  }, [resume]);

  async function handleLogout() {
    setLogoutError("");
    setIsLoggingOut(true);

    try {
      await signOut();

      navigate(routes.login, {
        replace: true,
      });
    } catch (error) {
      setLogoutError(error.message || errors.logoutFallback);

      setIsLoggingOut(false);
    }
  }

  function handleSkillCategoryToggle(category) {
    setOpenSkillCategories((currentItems) =>
      toggleLimitedItem(currentItems, category)
    );
  }

  function handleExperienceToggle(itemKey) {
    setOpenExperienceItems((currentItems) =>
      toggleLimitedItem(currentItems, itemKey)
    );
  }

  function handleProjectToggle(itemKey) {
    setOpenProjectItems((currentItems) =>
      toggleLimitedItem(currentItems, itemKey)
    );
  }

  function handleExperienceModalOpen(index) {
    setSelectedExperienceIndex(index);
  }

  function handleExperienceModalClose() {
    setSelectedExperienceIndex(null);
  }

  async function handleExperienceApply(nextExperience) {
    if (selectedExperienceIndex === null || !resume?.id) {
      return;
    }

    setResumeError("");

    try {
      const result = await updateResumeExperience({
        resumeId: resume.id,
        experienceIndex: selectedExperienceIndex,
        experience: nextExperience,
      });

      setResume((currentResume) => {
        if (!currentResume) {
          return currentResume;
        }

        return {
          ...currentResume,
          parsed_data: result.parsed_data,
        };
      });

      setSelectedExperienceIndex(null);
    } catch (error) {
      setResumeError(error.message || "Unable to save experience changes.");
    }
  }

  const parsedData = resume?.parsed_data ?? {};

  const skills = parsedData.skills ?? {};

  const education = parsedData.education ?? [];

  const experience = parsedData.experience ?? [];

  const projects = parsedData.projects ?? [];

  const certifications = parsedData.certifications ?? [];

  const selectedExperience =
    selectedExperienceIndex !== null
      ? (experience[selectedExperienceIndex] ?? null)
      : null;

  const hasSkills =
    skills &&
    typeof skills === "object" &&
    !Array.isArray(skills) &&
    Object.keys(skills).length > 0;

  const hasEducation = Array.isArray(education) && education.length > 0;

  const hasExperience = Array.isArray(experience) && experience.length > 0;

  const hasProjects = Array.isArray(projects) && projects.length > 0;

  const hasCertifications =
    Array.isArray(certifications) && certifications.length > 0;

  return (
    <div className="site-shell profile-page-shell">
      <Header
        variant="app"
        firstName={firstName}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className="profile-main">
        <section className="profile-intro">
          <p className="eyebrow">{intro.eyebrow}</p>

          <h1>{intro.heading}</h1>

          <p>{intro.description}</p>
        </section>

        {isLoadingResume && (
          <div className="profile-status" role="status">
            {loading.message}
          </div>
        )}

        {!isLoadingResume && resumeError && (
          <div className="profile-alert" role="alert">
            {resumeError}
          </div>
        )}

        {!isLoadingResume && !resumeError && resume && (
          <div className="profile-grid">
            <div className="profile-column">
              <section className="profile-resume-file">
                <span>{filename.label}</span>

                <strong>{resume.original_filename}</strong>
              </section>

              <details
                className="profile-section"
                open={isSkillsOpen}
                onToggle={(event) => {
                  setIsSkillsOpen(event.currentTarget.open);
                }}
              >
                <summary>
                  <span>{sections.skills.heading}</span>
                </summary>

                <div className="profile-section-content">
                  {hasSkills ? (
                    <div className="profile-skills">
                      {Object.entries(skills).map(([category, values]) => {
                        const isOpen = openSkillCategories.includes(category);

                        return (
                          <div
                            className="profile-nested-section"
                            key={category}
                          >
                            <button
                              type="button"
                              className="profile-nested-trigger"
                              aria-expanded={isOpen}
                              onClick={() =>
                                handleSkillCategoryToggle(category)
                              }
                            >
                              <span>{category}</span>

                              <span
                                className="profile-nested-icon"
                                aria-hidden="true"
                              >
                                {isOpen ? "−" : "+"}
                              </span>
                            </button>

                            {isOpen && (
                              <div className="profile-nested-content">
                                <div className="profile-skill-list">
                                  {Array.isArray(values) &&
                                    values.map((skill) => (
                                      <span
                                        className="profile-skill"
                                        key={`${category}-${skill}`}
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="profile-empty">
                      {sections.skills.emptyMessage}
                    </p>
                  )}
                </div>
              </details>

              <details
                className="profile-section"
                open={isCertificationsOpen}
                onToggle={(event) => {
                  setIsCertificationsOpen(event.currentTarget.open);
                }}
              >
                <summary>
                  <span>Certifications</span>
                </summary>

                <div className="profile-section-content">
                  {hasCertifications ? (
                    <div className="profile-certification-list">
                      {certifications.map((certification, index) => (
                        <div
                          className="profile-certification"
                          key={`${certification}-${index}`}
                        >
                          <span
                            className="profile-certification-mark"
                            aria-hidden="true"
                          >
                            ✓
                          </span>

                          <span>{certification}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="profile-empty">
                      No certifications were found in your uploaded resume.
                    </p>
                  )}
                </div>
              </details>

              <section className="profile-password-card">
                <div className="profile-password-copy">
                  <span className="profile-password-label">
                    Account security
                  </span>

                  <h2>Reset your password</h2>

                  <p>
                    Create a new password for your PatchWork account whenever
                    you need to.
                  </p>
                </div>

                <Link
                  to="/reset-password"
                  className="button button-small profile-password-button"
                >
                  Reset password
                </Link>
              </section>
            </div>

            <div className="profile-column">
              <details
                className="profile-section"
                open={isEducationOpen}
                onToggle={(event) => {
                  setIsEducationOpen(event.currentTarget.open);
                }}
              >
                <summary>
                  <span>{sections.education.heading}</span>
                </summary>

                <div className="profile-section-content">
                  {hasEducation ? (
                    <div className="profile-education-grid">
                      {education.map((item, index) => (
                        <article
                          className="profile-education-card"
                          key={`${item}-${index}`}
                        >
                          <div
                            className="profile-education-marker"
                            aria-hidden="true"
                          >
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <p>{item}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="profile-empty">
                      {sections.education.emptyMessage}
                    </p>
                  )}
                </div>
              </details>

              <details
                className="profile-section"
                open={isExperienceOpen}
                onToggle={(event) => {
                  setIsExperienceOpen(event.currentTarget.open);
                }}
              >
                <summary>
                  <span>{sections.experience.heading}</span>
                </summary>

                <div className="profile-section-content">
                  {hasExperience ? (
                    <div className="profile-experience-list">
                      {experience.map((item, index) => {
                        const itemKey = `${item.heading}-${index}`;

                        const isOpen = openExperienceItems.includes(itemKey);

                        const isHidden = item?.hidden === true;

                        return (
                          <article
                            className="profile-experience-item"
                            key={itemKey}
                          >
                            <button
                              type="button"
                              className="profile-nested-trigger profile-experience-trigger"
                              aria-expanded={isOpen}
                              onClick={() => handleExperienceToggle(itemKey)}
                            >
                              <span className="profile-experience-trigger-copy">
                                <span>{item.heading}</span>

                                {isHidden && (
                                  <small className="profile-experience-status">
                                    Hidden from resume
                                  </small>
                                )}
                              </span>

                              <span
                                className="profile-nested-icon"
                                aria-hidden="true"
                              >
                                {isOpen ? "−" : "+"}
                              </span>
                            </button>

                            {isOpen && (
                              <div className="profile-nested-content">
                                {item.bullets?.length > 0 && (
                                  <ul>
                                    {item.bullets.map((bullet, bulletIndex) => (
                                      <li key={`${itemKey}-${bulletIndex}`}>
                                        {bullet}
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                <div className="profile-experience-actions">
                                  <button
                                    type="button"
                                    className="button button-small button-outline"
                                    aria-label={`More options for ${item.heading}`}
                                    onClick={() =>
                                      handleExperienceModalOpen(index)
                                    }
                                  >
                                    More
                                  </button>
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="profile-empty">
                      {sections.experience.emptyMessage}
                    </p>
                  )}
                </div>
              </details>

              <details
                className="profile-section"
                open={isProjectsOpen}
                onToggle={(event) => {
                  setIsProjectsOpen(event.currentTarget.open);
                }}
              >
                <summary>
                  <span>Projects</span>
                </summary>

                <div className="profile-section-content">
                  {hasProjects ? (
                    <div className="profile-project-list">
                      {projects.map((project, index) => {
                        const title = getProjectTitle(project, index);

                        const description = getProjectDescription(project);

                        const dates = getProjectDates(project);

                        const bullets = getProjectBullets(project);

                        const itemKey = `${title}-${index}`;

                        const isOpen = openProjectItems.includes(itemKey);

                        return (
                          <article
                            className="profile-project-item"
                            key={itemKey}
                          >
                            <button
                              type="button"
                              className="profile-project-trigger"
                              aria-expanded={isOpen}
                              onClick={() => handleProjectToggle(itemKey)}
                            >
                              <div className="profile-project-heading">
                                <span>{title}</span>

                                {dates && (
                                  <small className="profile-project-dates">
                                    {dates}
                                  </small>
                                )}
                              </div>

                              <span
                                className="profile-nested-icon"
                                aria-hidden="true"
                              >
                                {isOpen ? "−" : "+"}
                              </span>
                            </button>

                            {isOpen && (
                              <div className="profile-project-content">
                                {description && <p>{description}</p>}

                                {bullets.length > 0 && (
                                  <ul>
                                    {bullets.map((bullet, bulletIndex) => (
                                      <li key={`${itemKey}-${bulletIndex}`}>
                                        {bullet}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="profile-empty">
                      No projects were found in your uploaded resume.
                    </p>
                  )}
                </div>
              </details>
            </div>
          </div>
        )}

        {logoutError && (
          <div className="profile-alert" role="alert">
            {logoutError}
          </div>
        )}
      </main>

      <Footer />

      {selectedExperienceIndex !== null && selectedExperience && (
        <ExperienceModal
          key={selectedExperienceIndex}
          experience={selectedExperience}
          onClose={handleExperienceModalClose}
          onApply={handleExperienceApply}
        />
      )}
    </div>
  );
}

export default Profile;
