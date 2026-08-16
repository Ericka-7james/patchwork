import { useMemo, useRef } from "react";
import { RESUME_GENERATOR_CONTENT } from "../../content/pages/resumeGeneratorContent";
import {
  cleanText,
  cleanTextArray,
  EMPTY_OBJECT,
  getContactItems,
  getMinimumExperienceLimits,
  normalizeEducation,
  normalizeExperience,
  normalizeProjects,
  normalizeSkillEntries,
} from "./harvard/harvardResumeUtils";
import { buildHarvardResumeBlocks } from "./harvard/buildHarvardResumeBlocks";
import { useHarvardResumeLayout } from "./harvard/useHarvardResumeLayout";
import "./styles/HarvardResume.css";

function HarvardResume({ parsedData = EMPTY_OBJECT, onFitChange }) {
  const { sections } = RESUME_GENERATOR_CONTENT.document;

  const documentRef = useRef(null);

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

  /*
   * Layout state determines which optional content is
   * currently visible. We create the initial/full blocks
   * first so the hook has something measurable.
   */

  const initialBlocks = useMemo(
    () =>
      buildHarvardResumeBlocks({
        name,
        contactItems,
        summary,
        education,
        experience,
        projects,
        skills: skillEntries,
        certifications,
        sections,
      }),
    [
      certifications,
      contactItems,
      education,
      experience,
      name,
      projects,
      sections,
      skillEntries,
      summary,
    ]
  );

  const { fitState, fitLevel } = useHarvardResumeLayout({
    documentRef,
    blocks: initialBlocks,
    sourceSignature,
    skillEntries,
    projects,
    initialExperienceBulletLimits,
    minimumExperienceBulletLimits,
    onFitChange,
  });

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

  const blocks = useMemo(
    () =>
      buildHarvardResumeBlocks({
        name,
        contactItems,
        summary,
        education,
        experience: visibleExperience,
        projects: visibleProjects,
        skills: visibleSkillEntries,
        certifications,
        sections,
      }),
    [
      certifications,
      contactItems,
      education,
      name,
      sections,
      summary,
      visibleExperience,
      visibleProjects,
      visibleSkillEntries,
    ]
  );

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
      data-density={fitState.density}
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
