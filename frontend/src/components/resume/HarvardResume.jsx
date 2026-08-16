import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RESUME_GENERATOR_CONTENT } from "../../content/pages/resumeGeneratorContent";
import "./styles/HarvardResume.css";

const FIT_LEVELS = ["normal", "compact", "tight"];

const MIN_SKILL_CATEGORIES = 3;
const MIN_PROJECTS = 1;
const MIN_EXPERIENCE_BULLETS = 8;

const SECOND_PAGE_MIN_FILL_RATIO = 0.5;

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanText(value) {
  return hasText(value) ? value.trim() : "";
}

function cleanTextArray(values) {
  return Array.isArray(values)
    ? values.filter(hasText).map((value) => value.trim())
    : [];
}

function getContactItems(contact) {
  if (!contact || typeof contact !== "object" || Array.isArray(contact)) {
    return [];
  }

  return [
    ...(Array.isArray(contact.other) ? contact.other : []),
    contact.location,
    contact.email,
    contact.linkedin,
    contact.phone,
  ]
    .filter(hasText)
    .map((item) => item.trim());
}

function normalizeEducation(education) {
  if (!Array.isArray(education)) {
    return [];
  }

  return education
    .map((item) => {
      if (hasText(item)) {
        return {
          text: item.trim(),
        };
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const text =
        cleanText(item.heading) ||
        cleanText(item.name) ||
        cleanText(item.school) ||
        cleanText(item.institution) ||
        cleanText(item.degree);

      return text ? { text } : null;
    })
    .filter(Boolean);
}

function normalizeExperience(experience) {
  if (!Array.isArray(experience)) {
    return [];
  }

  return experience
    .filter(Boolean)
    .map((item) => {
      if (typeof item === "string") {
        const heading = cleanText(item);

        return heading
          ? {
              heading,
              subtitle: "",
              dates: "",
              bullets: [],
            }
          : null;
      }

      const explicitHeading = cleanText(item.heading);

      const company =
        cleanText(item.company) ||
        cleanText(item.employer) ||
        cleanText(item.organization);

      const role =
        cleanText(item.role) ||
        cleanText(item.title) ||
        cleanText(item.position);

      const dates =
        cleanText(item.dates) ||
        cleanText(item.date) ||
        cleanText(item.duration);

      const heading =
        explicitHeading || [company, role].filter(Boolean).join(" — ");

      const bullets =
        cleanTextArray(item.bullets).length > 0
          ? cleanTextArray(item.bullets)
          : cleanTextArray(item.details);

      if (!heading && !role && !dates && bullets.length === 0) {
        return null;
      }

      return {
        heading,
        subtitle: explicitHeading ? "" : role,
        dates: explicitHeading ? "" : dates,
        bullets,
      };
    })
    .filter(Boolean);
}

function normalizeProjects(projects) {
  if (!Array.isArray(projects)) {
    return [];
  }

  return projects
    .filter(Boolean)
    .map((item, index) => {
      if (typeof item === "string") {
        const heading = cleanText(item);

        return heading
          ? {
              heading,
              description: "",
              dates: "",
              bullets: [],
            }
          : null;
      }

      const heading =
        cleanText(item.name) ||
        cleanText(item.title) ||
        cleanText(item.heading) ||
        cleanText(item.project_name) ||
        cleanText(item.projectName) ||
        `Project ${index + 1}`;

      const description =
        cleanText(item.description) ||
        cleanText(item.summary) ||
        cleanText(item.subtitle);

      const dates =
        cleanText(item.dates) ||
        cleanText(item.date) ||
        cleanText(item.duration);

      const bullets =
        cleanTextArray(item.bullets).length > 0
          ? cleanTextArray(item.bullets)
          : cleanTextArray(item.details);

      if (!heading && !description && !dates && bullets.length === 0) {
        return null;
      }

      return {
        heading,
        description,
        dates,
        bullets,
      };
    })
    .filter(Boolean);
}

function normalizeSkillEntries(skills) {
  if (!skills || typeof skills !== "object" || Array.isArray(skills)) {
    return [];
  }

  return Object.entries(skills)
    .map(([category, values]) => {
      if (!hasText(category) || !Array.isArray(values)) {
        return null;
      }

      const cleanValues = cleanTextArray(values);

      if (cleanValues.length === 0) {
        return null;
      }

      return [category.trim(), cleanValues];
    })
    .filter(Boolean);
}

function getMinimumExperienceLimits(experience) {
  const originalLimits = experience.map((item) => item.bullets.length);

  const totalBullets = originalLimits.reduce(
    (total, count) => total + count,
    0
  );

  if (totalBullets <= MIN_EXPERIENCE_BULLETS) {
    return originalLimits;
  }

  const minimumLimits = originalLimits.map((count) => (count > 0 ? 1 : 0));

  let allocated = minimumLimits.reduce((total, count) => total + count, 0);

  const target = Math.min(
    totalBullets,
    Math.max(MIN_EXPERIENCE_BULLETS, allocated)
  );

  let index = 0;

  while (allocated < target && originalLimits.length > 0) {
    const currentIndex = index % originalLimits.length;

    if (minimumLimits[currentIndex] < originalLimits[currentIndex]) {
      minimumLimits[currentIndex] += 1;
      allocated += 1;
    }

    index += 1;
  }

  return minimumLimits;
}

function packBlocks(blocks, heights, availableHeight) {
  const pages = [];
  const pageUsedHeights = [];

  let currentPage = [];
  let usedHeight = 0;
  let hasOversizedBlock = false;

  function finishPage() {
    if (currentPage.length === 0) {
      return;
    }

    pages.push(currentPage);
    pageUsedHeights.push(usedHeight);

    currentPage = [];
    usedHeight = 0;
  }

  blocks.forEach((block, index) => {
    const blockHeight = heights.get(block.key) ?? 0;

    const nextBlock = blocks[index + 1];

    const nextBlockHeight = nextBlock ? (heights.get(nextBlock.key) ?? 0) : 0;

    const requiredHeight =
      block.keepWithNext && nextBlock
        ? blockHeight + nextBlockHeight
        : blockHeight;

    if (
      currentPage.length > 0 &&
      usedHeight + requiredHeight > availableHeight
    ) {
      finishPage();
    }

    if (blockHeight > availableHeight) {
      hasOversizedBlock = true;
    }

    currentPage.push(block.key);
    usedHeight += blockHeight;
  });

  finishPage();

  return {
    pages,
    pageUsedHeights,
    hasOversizedBlock,
  };
}

function createInitialFitState({
  skillCategoryCount,
  projectCount,
  experienceBulletLimits,
}) {
  return {
    fitLevelIndex: 0,
    skillCategoryLimit: skillCategoryCount,
    projectLimit: projectCount,
    experienceBulletLimits,
    pageKeys: [],
    settled: false,
  };
}

function HarvardResume({ parsedData = EMPTY_OBJECT, onFitChange }) {
  const { sections } = RESUME_GENERATOR_CONTENT.document;

  const documentRef = useRef(null);
  const lastReportRef = useRef("");

  const name = cleanText(parsedData.name);

  const contactItems = useMemo(
    () => getContactItems(parsedData.contact),
    [parsedData.contact]
  );

  const summary = cleanText(parsedData.summary);

  const education = useMemo(
    () => normalizeEducation(parsedData.education),
    [parsedData.education]
  );

  const experience = useMemo(
    () => normalizeExperience(parsedData.experience),
    [parsedData.experience]
  );

  const projects = useMemo(
    () => normalizeProjects(parsedData.projects),
    [parsedData.projects]
  );

  const certifications = useMemo(
    () => cleanTextArray(parsedData.certifications),
    [parsedData.certifications]
  );

  const skillEntries = useMemo(
    () => normalizeSkillEntries(parsedData.skills),
    [parsedData.skills]
  );

  const initialExperienceBulletLimits = useMemo(
    () => experience.map((item) => item.bullets.length),
    [experience]
  );

  const minimumExperienceBulletLimits = useMemo(
    () => getMinimumExperienceLimits(experience),
    [experience]
  );

  const [fitState, setFitState] = useState(() =>
    createInitialFitState({
      skillCategoryCount: skillEntries.length,
      projectCount: projects.length,
      experienceBulletLimits: initialExperienceBulletLimits,
    })
  );

  const sourceSignature = useMemo(
    () =>
      JSON.stringify({
        name,
        contactItems,
        summary,
        education,
        experience,
        projects,
        skillEntries,
        certifications,
      }),
    [
      certifications,
      contactItems,
      education,
      experience,
      name,
      projects,
      skillEntries,
      summary,
    ]
  );

  useEffect(() => {
    lastReportRef.current = "";

    setFitState(
      createInitialFitState({
        skillCategoryCount: skillEntries.length,
        projectCount: projects.length,
        experienceBulletLimits: initialExperienceBulletLimits,
      })
    );
  }, [
    sourceSignature,
    skillEntries.length,
    projects.length,
    initialExperienceBulletLimits,
  ]);

  const fitLevel = FIT_LEVELS[fitState.fitLevelIndex];

  const visibleSkillEntries = useMemo(
    () => skillEntries.slice(0, Math.max(0, fitState.skillCategoryLimit)),
    [fitState.skillCategoryLimit, skillEntries]
  );

  const visibleProjects = useMemo(
    () => projects.slice(0, Math.max(0, fitState.projectLimit)),
    [fitState.projectLimit, projects]
  );

  const visibleExperience = useMemo(
    () =>
      experience.map((item, index) => ({
        ...item,
        bullets: item.bullets.slice(
          0,
          fitState.experienceBulletLimits[index] ?? item.bullets.length
        ),
      })),
    [experience, fitState.experienceBulletLimits]
  );

  const blocks = useMemo(() => {
    const nextBlocks = [];

    if (name || contactItems.length > 0) {
      nextBlocks.push({
        key: "header",
        className: "harvard-resume-block harvard-resume-block-header",
        content: (
          <header className="harvard-resume-header">
            {name && <h1>{name}</h1>}

            {contactItems.length > 0 && (
              <div
                className="harvard-resume-contact"
                aria-label="Contact information"
              >
                {contactItems.map((item, index) => (
                  <span
                    className="harvard-resume-contact-item"
                    key={`${item}-${index}`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </header>
        ),
      });
    }

    if (summary) {
      nextBlocks.push({
        key: "summary",
        className: "harvard-resume-block harvard-resume-block-section",
        content: (
          <section>
            <h2>{sections.summary}</h2>
            <p className="harvard-resume-summary">{summary}</p>
          </section>
        ),
      });
    }

    if (education.length > 0) {
      nextBlocks.push({
        key: "education-heading",
        className: "harvard-resume-block harvard-resume-block-heading",
        keepWithNext: true,
        content: <h2>{sections.education}</h2>,
      });

      education.forEach((item, index) => {
        nextBlocks.push({
          key: `education-${index}`,
          className: "harvard-resume-block harvard-resume-block-education",
          content: <p>{item.text}</p>,
        });
      });
    }

    if (visibleExperience.length > 0) {
      nextBlocks.push({
        key: "experience-heading",
        className: "harvard-resume-block harvard-resume-block-heading",
        keepWithNext: true,
        content: <h2>{sections.experience}</h2>,
      });

      visibleExperience.forEach((item, index) => {
        nextBlocks.push({
          key: `experience-${index}-heading`,
          className: "harvard-resume-block harvard-resume-block-entry-heading",
          keepWithNext: item.bullets.length > 0,
          content: (
            <div className="harvard-resume-entry-heading">
              <div>
                {item.heading && <h3>{item.heading}</h3>}

                {item.subtitle && (
                  <p className="harvard-resume-entry-subtitle">
                    {item.subtitle}
                  </p>
                )}
              </div>

              {item.dates && (
                <span className="harvard-resume-entry-dates">{item.dates}</span>
              )}
            </div>
          ),
        });

        item.bullets.forEach((bullet, bulletIndex) => {
          nextBlocks.push({
            key: `experience-${index}-bullet-${bulletIndex}`,
            className: "harvard-resume-block harvard-resume-block-bullet",
            content: (
              <ul className="harvard-resume-single-bullet">
                <li>{bullet}</li>
              </ul>
            ),
          });
        });
      });
    }

    if (visibleProjects.length > 0) {
      nextBlocks.push({
        key: "projects-heading",
        className: "harvard-resume-block harvard-resume-block-heading",
        keepWithNext: true,
        content: <h2>{sections.projects}</h2>,
      });

      visibleProjects.forEach((item, index) => {
        nextBlocks.push({
          key: `project-${index}-heading`,
          className: "harvard-resume-block harvard-resume-block-entry-heading",
          keepWithNext: item.description.length > 0 || item.bullets.length > 0,
          content: (
            <div className="harvard-resume-entry-heading">
              <div>
                {item.heading && <h3>{item.heading}</h3>}

                {item.description && (
                  <p className="harvard-resume-entry-subtitle">
                    {item.description}
                  </p>
                )}
              </div>

              {item.dates && (
                <span className="harvard-resume-entry-dates">{item.dates}</span>
              )}
            </div>
          ),
        });

        item.bullets.forEach((bullet, bulletIndex) => {
          nextBlocks.push({
            key: `project-${index}-bullet-${bulletIndex}`,
            className: "harvard-resume-block harvard-resume-block-bullet",
            content: (
              <ul className="harvard-resume-single-bullet">
                <li>{bullet}</li>
              </ul>
            ),
          });
        });
      });
    }

    if (visibleSkillEntries.length > 0) {
      nextBlocks.push({
        key: "skills-heading",
        className: "harvard-resume-block harvard-resume-block-heading",
        keepWithNext: true,
        content: <h2>{sections.skills}</h2>,
      });

      visibleSkillEntries.forEach(([category, values], index) => {
        nextBlocks.push({
          key: `skills-${index}`,
          className: "harvard-resume-block harvard-resume-block-skill",
          content: (
            <p>
              <strong>{category}:</strong> {values.join(", ")}
            </p>
          ),
        });
      });
    }

    if (certifications.length > 0) {
      nextBlocks.push({
        key: "certifications-heading",
        className: "harvard-resume-block harvard-resume-block-heading",
        keepWithNext: true,
        content: <h2>{sections.certifications}</h2>,
      });

      certifications.forEach((certification, index) => {
        nextBlocks.push({
          key: `certification-${index}`,
          className: "harvard-resume-block harvard-resume-block-certification",
          content: (
            <ul className="harvard-resume-single-bullet">
              <li>{certification}</li>
            </ul>
          ),
        });
      });
    }

    return nextBlocks;
  }, [
    certifications,
    contactItems,
    education,
    name,
    sections,
    summary,
    visibleExperience,
    visibleProjects,
    visibleSkillEntries,
  ]);

  useLayoutEffect(() => {
    const documentElement = documentRef.current;

    if (!documentElement || blocks.length === 0 || fitState.settled) {
      return;
    }

    const firstPage = documentElement.querySelector(".harvard-resume-page");

    if (!firstPage) {
      return;
    }

    const pageHeight = firstPage.clientHeight;

    if (pageHeight <= 0) {
      return;
    }

    const pageStyles = window.getComputedStyle(firstPage);

    const paddingTop = Number.parseFloat(pageStyles.paddingTop);

    const paddingBottom = Number.parseFloat(pageStyles.paddingBottom);

    if (!Number.isFinite(paddingTop) || !Number.isFinite(paddingBottom)) {
      return;
    }

    const availableHeight = pageHeight - paddingTop - paddingBottom;

    if (!Number.isFinite(availableHeight) || availableHeight <= 0) {
      return;
    }

    const blockElements = documentElement.querySelectorAll(
      ".harvard-resume-measurement [data-resume-block-key]"
    );

    const heights = new Map();

    blockElements.forEach((element) => {
      const key = element.dataset.resumeBlockKey;

      if (!key || heights.has(key)) {
        return;
      }

      heights.set(key, element.getBoundingClientRect().height);
    });

    const result = packBlocks(blocks, heights, availableHeight);

    const pageCount = result.pages.length;

    const lastPageUsedHeight =
      result.pageUsedHeights[result.pageUsedHeights.length - 1] ?? 0;

    const lastPageFillRatio =
      pageCount > 0 ? lastPageUsedHeight / availableHeight : 0;

    const isOnePage = pageCount === 1 && !result.hasOversizedBlock;

    const isHealthyTwoPage =
      pageCount === 2 &&
      lastPageFillRatio >= SECOND_PAGE_MIN_FILL_RATIO &&
      !result.hasOversizedBlock;

    const removedSkills = Math.max(
      0,
      skillEntries.length - fitState.skillCategoryLimit
    );

    const removedProjects = Math.max(
      0,
      projects.length - fitState.projectLimit
    );

    const removedExperienceBullets = initialExperienceBulletLimits.reduce(
      (total, originalLimit, index) =>
        total +
        Math.max(
          0,
          originalLimit - (fitState.experienceBulletLimits[index] ?? 0)
        ),
      0
    );

    function reportFit({ fits, pages, mode }) {
      const report = {
        fits,
        pageCount: pages.length,
        lastPageFillRatio,
        removedSkills,
        removedProjects,
        removedExperienceBullets,
        fitLevel,
        layoutMode: mode,
      };

      const signature = JSON.stringify(report);

      if (lastReportRef.current !== signature) {
        lastReportRef.current = signature;
        onFitChange?.(report);
      }
    }

    if (isOnePage || isHealthyTwoPage) {
      setFitState((current) => ({
        ...current,
        pageKeys: result.pages,
        settled: true,
      }));

      reportFit({
        fits: true,
        pages: result.pages,
        mode: isOnePage ? "one-page" : "two-page",
      });

      return;
    }

    if (fitState.fitLevelIndex < FIT_LEVELS.length - 1) {
      setFitState((current) => ({
        ...current,
        fitLevelIndex: current.fitLevelIndex + 1,
        pageKeys: [],
      }));

      return;
    }

    const minimumSkillCategoryCount = Math.min(
      MIN_SKILL_CATEGORIES,
      skillEntries.length
    );

    if (fitState.skillCategoryLimit > minimumSkillCategoryCount) {
      setFitState((current) => ({
        ...current,
        skillCategoryLimit: current.skillCategoryLimit - 1,
        pageKeys: [],
      }));

      return;
    }

    const minimumProjectCount =
      projects.length > 0 ? Math.min(MIN_PROJECTS, projects.length) : 0;

    if (fitState.projectLimit > minimumProjectCount) {
      setFitState((current) => ({
        ...current,
        projectLimit: current.projectLimit - 1,
        pageKeys: [],
      }));

      return;
    }

    /*
     * If we've already reduced Skills to the preferred
     * three-category floor and Projects to the one-project
     * floor, drop Skills entirely before touching Experience.
     */
    if (fitState.skillCategoryLimit > 0) {
      setFitState((current) => ({
        ...current,
        skillCategoryLimit: 0,
        pageKeys: [],
      }));

      return;
    }

    const experienceIndexToTrim = fitState.experienceBulletLimits.findLastIndex(
      (limit, index) => limit > (minimumExperienceBulletLimits[index] ?? 0)
    );

    if (experienceIndexToTrim !== -1) {
      setFitState((current) => {
        const nextLimits = [...current.experienceBulletLimits];

        nextLimits[experienceIndexToTrim] -= 1;

        return {
          ...current,
          experienceBulletLimits: nextLimits,
          pageKeys: [],
        };
      });

      return;
    }

    if (pageCount <= 2 && !result.hasOversizedBlock) {
      setFitState((current) => ({
        ...current,
        pageKeys: result.pages,
        settled: true,
      }));

      reportFit({
        fits: true,
        pages: result.pages,
        mode: "two-page-required",
      });

      return;
    }

    const finalPages = result.pages.slice(0, 2);

    setFitState((current) => ({
      ...current,
      pageKeys: finalPages,
      settled: true,
    }));

    reportFit({
      fits: false,
      pages: finalPages,
      mode: "overflow",
    });
  }, [
    blocks,
    fitLevel,
    fitState,
    initialExperienceBulletLimits,
    minimumExperienceBulletLimits,
    onFitChange,
    projects.length,
    skillEntries.length,
  ]);

  const blockMap = useMemo(
    () => new Map(blocks.map((block) => [block.key, block])),
    [blocks]
  );

  const visiblePages =
    fitState.pageKeys.length > 0
      ? fitState.pageKeys
      : [blocks.map((block) => block.key)];

  return (
    <article
      ref={documentRef}
      className="harvard-resume-document"
      data-fit={fitLevel}
      aria-label="Harvard-style resume"
    >
      <div className="harvard-resume-measurement" aria-hidden="true">
        {blocks.map((block) => (
          <div
            className={block.className}
            data-resume-block-key={block.key}
            key={`measure-${block.key}`}
          >
            {block.content}
          </div>
        ))}
      </div>

      {visiblePages.map((page, pageIndex) => (
        <div className="harvard-resume-page-group" key={`page-${pageIndex}`}>
          {pageIndex > 0 && (
            <div className="harvard-resume-page-divider" aria-hidden="true">
              <span>Page {pageIndex + 1}</span>
            </div>
          )}

          <section
            className="harvard-resume-page"
            aria-label={`Resume page ${pageIndex + 1}`}
          >
            <div className="harvard-resume-page-content">
              {page.map((blockKey) => {
                const block = blockMap.get(blockKey);

                if (!block) {
                  return null;
                }

                return (
                  <div
                    className={block.className}
                    data-resume-block-key={block.key}
                    key={block.key}
                  >
                    {block.content}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ))}
    </article>
  );
}

export default HarvardResume;
