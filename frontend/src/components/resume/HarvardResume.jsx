import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { RESUME_GENERATOR_CONTENT } from "../../content/pages/resumeGeneratorContent";
import "./styles/HarvardResume.css";

const FIT_LEVELS = ["normal", "compact", "tight"];
const MIN_SKILL_COUNT = 3;

const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function getContactItems(contact) {
  if (!contact || typeof contact !== "object" || Array.isArray(contact)) {
    return [];
  }

  return [
    ...(Array.isArray(contact.other) ? contact.other.filter(hasText) : []),
    contact.location,
    contact.email,
    contact.linkedin,
    contact.phone,
  ]
    .filter(hasText)
    .map((item) => item.trim());
}

function getVisibleSkillEntries(skills, limit) {
  let remaining = limit;

  return Object.entries(skills)
    .map(([category, values]) => {
      if (!hasText(category) || !Array.isArray(values) || remaining <= 0) {
        return null;
      }

      const cleanValues = values.filter(hasText).map((value) => value.trim());

      if (cleanValues.length === 0) {
        return null;
      }

      const visibleValues = cleanValues.slice(0, remaining);

      remaining -= visibleValues.length;

      if (visibleValues.length === 0) {
        return null;
      }

      return [category.trim(), visibleValues];
    })
    .filter(Boolean);
}

function packBlocks(blocks, heights, availableHeight) {
  const pages = [];
  let currentPage = [];
  let usedHeight = 0;
  let hasOversizedBlock = false;

  function startNewPage() {
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

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
      startNewPage();
    }

    if (blockHeight > availableHeight) {
      hasOversizedBlock = true;
    }

    currentPage.push(block.key);
    usedHeight += blockHeight;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return {
    pages,
    hasOversizedBlock,
  };
}

function HarvardResume({ parsedData = EMPTY_OBJECT, onFitChange }) {
  const { sections } = RESUME_GENERATOR_CONTENT.document;

  const documentRef = useRef(null);

  const name = hasText(parsedData.name) ? parsedData.name.trim() : "";

  const contactItems = useMemo(
    () => getContactItems(parsedData.contact),
    [parsedData.contact]
  );

  const summary = hasText(parsedData.summary) ? parsedData.summary.trim() : "";

  const education = useMemo(
    () =>
      Array.isArray(parsedData.education)
        ? parsedData.education.filter(hasText).map((item) => item.trim())
        : EMPTY_ARRAY,
    [parsedData.education]
  );

  const experience = useMemo(
    () =>
      Array.isArray(parsedData.experience)
        ? parsedData.experience
            .filter(Boolean)
            .map((item) => ({
              company: hasText(item?.company) ? item.company.trim() : "",
              role: hasText(item?.role) ? item.role.trim() : "",
              dates: hasText(item?.dates) ? item.dates.trim() : "",
              bullets: Array.isArray(item?.bullets)
                ? item.bullets.filter(hasText).map((bullet) => bullet.trim())
                : [],
            }))
            .filter(
              (item) =>
                item.company ||
                item.role ||
                item.dates ||
                item.bullets.length > 0
            )
        : EMPTY_ARRAY,
    [parsedData.experience]
  );

  const projects = useMemo(
    () =>
      Array.isArray(parsedData.projects)
        ? parsedData.projects
            .filter(Boolean)
            .map((item) => ({
              name: hasText(item?.name) ? item.name.trim() : "",
              description: hasText(item?.description)
                ? item.description.trim()
                : "",
              dates: hasText(item?.dates) ? item.dates.trim() : "",
              bullets: Array.isArray(item?.bullets)
                ? item.bullets.filter(hasText).map((bullet) => bullet.trim())
                : [],
            }))
            .filter(
              (item) =>
                item.name ||
                item.description ||
                item.dates ||
                item.bullets.length > 0
            )
        : EMPTY_ARRAY,
    [parsedData.projects]
  );

  const certifications = useMemo(
    () =>
      Array.isArray(parsedData.certifications)
        ? parsedData.certifications.filter(hasText).map((item) => item.trim())
        : EMPTY_ARRAY,
    [parsedData.certifications]
  );

  const skills = useMemo(() => {
    if (
      parsedData.skills &&
      typeof parsedData.skills === "object" &&
      !Array.isArray(parsedData.skills)
    ) {
      return parsedData.skills;
    }

    return EMPTY_OBJECT;
  }, [parsedData.skills]);

  const totalSkillCount = useMemo(
    () =>
      Object.entries(skills).reduce((total, [category, values]) => {
        if (!hasText(category) || !Array.isArray(values)) {
          return total;
        }

        return total + values.filter(hasText).length;
      }, 0),
    [skills]
  );

  const initialProjectBulletLimits = useMemo(
    () => projects.map((project) => project.bullets.length),
    [projects]
  );

  const [fitState, setFitState] = useState(() => ({
    fitLevelIndex: 0,
    skillLimit: totalSkillCount,
    projectBulletLimits: initialProjectBulletLimits,
    pageKeys: [],
  }));

  const fitLevel = FIT_LEVELS[fitState.fitLevelIndex];

  const visibleSkillEntries = useMemo(
    () => getVisibleSkillEntries(skills, fitState.skillLimit),
    [skills, fitState.skillLimit]
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
        key: "education",
        className: "harvard-resume-block harvard-resume-block-section",
        content: (
          <section>
            <h2>{sections.education}</h2>

            <div className="harvard-resume-education-list">
              {education.map((item, index) => (
                <p key={`${item}-${index}`}>{item}</p>
              ))}
            </div>
          </section>
        ),
      });
    }

    if (experience.length > 0) {
      nextBlocks.push({
        key: "experience-heading",
        className: "harvard-resume-block harvard-resume-block-heading",
        keepWithNext: true,
        content: <h2>{sections.experience}</h2>,
      });

      experience.forEach((item, index) => {
        nextBlocks.push({
          key: `experience-${index}`,
          className: "harvard-resume-block harvard-resume-block-entry",
          content: (
            <article className="harvard-resume-entry">
              <div className="harvard-resume-entry-heading">
                <div>
                  {item.company && <h3>{item.company}</h3>}

                  {item.role && (
                    <p className="harvard-resume-entry-subtitle">{item.role}</p>
                  )}
                </div>

                {item.dates && (
                  <span className="harvard-resume-entry-dates">
                    {item.dates}
                  </span>
                )}
              </div>

              {item.bullets.length > 0 && (
                <ul>
                  {item.bullets.map((bullet, bulletIndex) => (
                    <li key={`${index}-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              )}
            </article>
          ),
        });
      });
    }

    if (projects.length > 0) {
      nextBlocks.push({
        key: "projects-heading",
        className: "harvard-resume-block harvard-resume-block-heading",
        keepWithNext: true,
        content: <h2>{sections.projects}</h2>,
      });

      projects.forEach((item, index) => {
        const bulletLimit =
          fitState.projectBulletLimits[index] ?? item.bullets.length;

        const visibleBullets = item.bullets.slice(0, bulletLimit);

        nextBlocks.push({
          key: `project-${index}`,
          className: "harvard-resume-block harvard-resume-block-entry",
          content: (
            <article className="harvard-resume-entry">
              <div className="harvard-resume-entry-heading">
                <div>
                  {item.name && <h3>{item.name}</h3>}

                  {item.description && (
                    <p className="harvard-resume-entry-subtitle">
                      {item.description}
                    </p>
                  )}
                </div>

                {item.dates && (
                  <span className="harvard-resume-entry-dates">
                    {item.dates}
                  </span>
                )}
              </div>

              {visibleBullets.length > 0 && (
                <ul>
                  {visibleBullets.map((bullet, bulletIndex) => (
                    <li key={`${index}-${bulletIndex}`}>{bullet}</li>
                  ))}
                </ul>
              )}
            </article>
          ),
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

      visibleSkillEntries.forEach(([category, values]) => {
        nextBlocks.push({
          key: `skills-${category}`,
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
        key: "certifications",
        className: "harvard-resume-block harvard-resume-block-section",
        content: (
          <section>
            <h2>{sections.certifications}</h2>

            <ul className="harvard-resume-certifications">
              {certifications.map((certification, index) => (
                <li key={`${certification}-${index}`}>{certification}</li>
              ))}
            </ul>
          </section>
        ),
      });
    }

    return nextBlocks;
  }, [
    certifications,
    contactItems,
    education,
    experience,
    fitState.projectBulletLimits,
    name,
    projects,
    sections,
    summary,
    visibleSkillEntries,
  ]);

  useLayoutEffect(() => {
    const documentElement = documentRef.current;

    if (!documentElement || blocks.length === 0) {
      return;
    }

    const firstPage = documentElement.querySelector(".harvard-resume-page");

    if (!firstPage) {
      return;
    }

    const pageHeight = firstPage.clientHeight;

    /*
     * JSDOM does not perform physical browser layout, so clientHeight is
     * normally zero during unit tests. Pagination is therefore skipped there.
     */
    if (pageHeight <= 0) {
      return;
    }

    const pageStyles = window.getComputedStyle(firstPage);

    const availableHeight =
      pageHeight -
      Number.parseFloat(pageStyles.paddingTop || "0") -
      Number.parseFloat(pageStyles.paddingBottom || "0");

    if (!Number.isFinite(availableHeight) || availableHeight <= 0) {
      return;
    }

    const blockElements = documentElement.querySelectorAll(
      "[data-resume-block-key]"
    );

    const heights = new Map();

    blockElements.forEach((element) => {
      const key = element.dataset.resumeBlockKey;

      if (!heights.has(key)) {
        heights.set(key, element.getBoundingClientRect().height);
      }
    });

    const result = packBlocks(blocks, heights, availableHeight);

    const fitsTwoPages = result.pages.length <= 2 && !result.hasOversizedBlock;

    if (fitsTwoPages) {
      const removedSkills = Math.max(0, totalSkillCount - fitState.skillLimit);

      const removedProjectBullets = initialProjectBulletLimits.reduce(
        (total, originalLimit, index) =>
          total +
          Math.max(
            0,
            originalLimit - (fitState.projectBulletLimits[index] ?? 0)
          ),
        0
      );

      setFitState((current) => {
        const currentPageSignature = JSON.stringify(current.pageKeys);
        const nextPageSignature = JSON.stringify(result.pages);

        if (currentPageSignature === nextPageSignature) {
          return current;
        }

        return {
          ...current,
          pageKeys: result.pages,
        };
      });

      onFitChange?.({
        fits: true,
        removedSkills,
        removedProjectBullets,
        fitLevel,
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

    const minimumSkills = Math.min(MIN_SKILL_COUNT, totalSkillCount);

    if (fitState.skillLimit > minimumSkills) {
      setFitState((current) => ({
        ...current,
        skillLimit: current.skillLimit - 1,
        pageKeys: [],
      }));

      return;
    }

    const projectIndexToTrim = fitState.projectBulletLimits.findLastIndex(
      (limit) => limit > 0
    );

    if (projectIndexToTrim !== -1) {
      setFitState((current) => {
        const nextProjectBulletLimits = [...current.projectBulletLimits];

        nextProjectBulletLimits[projectIndexToTrim] -= 1;

        return {
          ...current,
          projectBulletLimits: nextProjectBulletLimits,
          pageKeys: [],
        };
      });

      return;
    }

    const finalPages = result.pages.slice(0, 2);

    setFitState((current) => {
      const currentPageSignature = JSON.stringify(current.pageKeys);
      const nextPageSignature = JSON.stringify(finalPages);

      if (currentPageSignature === nextPageSignature) {
        return current;
      }

      return {
        ...current,
        pageKeys: finalPages,
      };
    });

    onFitChange?.({
      fits: false,
      removedSkills: Math.max(0, totalSkillCount - fitState.skillLimit),
      removedProjectBullets: initialProjectBulletLimits.reduce(
        (total, originalLimit, index) =>
          total +
          Math.max(
            0,
            originalLimit - (fitState.projectBulletLimits[index] ?? 0)
          ),
        0
      ),
      fitLevel,
    });
  }, [
    blocks,
    fitLevel,
    fitState,
    initialProjectBulletLimits,
    onFitChange,
    totalSkillCount,
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
