export function buildHarvardResumeBlocks({
  name,
  contactItems,
  summary,
  education,
  experience,
  projects,
  skills,
  certifications,
  sections,
}) {
  const blocks = [];

  if (name || contactItems.length > 0) {
    blocks.push({
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
    blocks.push({
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
    blocks.push({
      key: "education-heading",
      className: "harvard-resume-block harvard-resume-block-heading",
      keepWithNext: true,
      content: <h2>{sections.education}</h2>,
    });

    education.forEach((item, index) => {
      blocks.push({
        key: `education-${index}`,
        className: "harvard-resume-block harvard-resume-block-education",
        content: <p>{item.text}</p>,
      });
    });
  }

  if (experience.length > 0) {
    blocks.push({
      key: "experience-heading",
      className: "harvard-resume-block harvard-resume-block-heading",
      keepWithNext: true,
      content: <h2>{sections.experience}</h2>,
    });

    experience.forEach((item, index) => {
      const groupKey = `experience-${index}`;

      blocks.push({
        key: `experience-${index}-heading`,

        groupKey,

        className: "harvard-resume-block harvard-resume-block-entry-heading",

        keepWithNext: item.bullets.length > 0,

        content: (
          <div className="harvard-resume-entry-heading">
            <div>
              {item.heading && <h3>{item.heading}</h3>}

              {item.subtitle && (
                <p className="harvard-resume-entry-subtitle">{item.subtitle}</p>
              )}
            </div>

            {item.dates && (
              <span className="harvard-resume-entry-dates">{item.dates}</span>
            )}
          </div>
        ),
      });

      item.bullets.forEach((bullet, bulletIndex) => {
        blocks.push({
          key: `experience-${index}-bullet-${bulletIndex}`,

          groupKey,

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

  if (projects.length > 0) {
    blocks.push({
      key: "projects-heading",
      className: "harvard-resume-block harvard-resume-block-heading",
      keepWithNext: true,
      content: <h2>{sections.projects}</h2>,
    });

    projects.forEach((item, index) => {
      blocks.push({
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
        blocks.push({
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

  if (skills.length > 0) {
    blocks.push({
      key: "skills-heading",
      className: "harvard-resume-block harvard-resume-block-heading",
      keepWithNext: true,
      content: <h2>{sections.skills}</h2>,
    });

    skills.forEach(([category, values], index) => {
      blocks.push({
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
    blocks.push({
      key: "certifications-heading",

      className: "harvard-resume-block harvard-resume-block-heading",

      keepWithNext: true,

      content: <h2>{sections.certifications}</h2>,
    });

    certifications.forEach((certification, index) => {
      blocks.push({
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

  return blocks;
}
