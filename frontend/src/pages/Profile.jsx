import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { PROFILE_CONTENT } from "../content/pages/profileContent";
import { useAuth } from "../context/useAuth";
import { getResumeByUserId } from "../services/resumeService";
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

  const [openSkillCategories, setOpenSkillCategories] = useState([]);
  const [openExperienceItems, setOpenExperienceItems] = useState([]);

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

        if (isActive) {
          setResume(resumeData);

          setOpenSkillCategories(
            getDefaultSkillCategories(resumeData?.parsed_data?.skills ?? {})
          );

          setOpenExperienceItems([]);
        }
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
      navigate(routes.login, { replace: true });
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

  const parsedData = resume?.parsed_data ?? {};
  const skills = parsedData.skills ?? {};
  const education = parsedData.education ?? [];
  const experience = parsedData.experience ?? [];

  const hasSkills = Object.keys(skills).length > 0;
  const hasEducation = education.length > 0;
  const hasExperience = experience.length > 0;

  return (
    <div className="site-shell">
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
                                  {values.map((skill) => (
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
                    <ul className="profile-education-list">
                      {education.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
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
                              <span>{item.heading}</span>
                              <span
                                className="profile-nested-icon"
                                aria-hidden="true"
                              >
                                {isOpen ? "−" : "+"}
                              </span>
                            </button>

                            {isOpen && item.bullets?.length > 0 && (
                              <div className="profile-nested-content">
                                <ul>
                                  {item.bullets.map((bullet, bulletIndex) => (
                                    <li key={`${itemKey}-${bulletIndex}`}>
                                      {bullet}
                                    </li>
                                  ))}
                                </ul>
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
    </div>
  );
}

export default Profile;
