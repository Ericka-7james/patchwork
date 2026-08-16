import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import HarvardResume from "../../../components/resume/HarvardResume";

vi.mock("../../../content/pages/resumeGeneratorContent", () => ({
  RESUME_GENERATOR_CONTENT: {
    document: {
      sections: {
        summary: "Summary",
        education: "Education",
        experience: "Experience",
        projects: "Projects",
        skills: "Skills",
        certifications: "Certifications",
      },
    },
  },
}));

function createParsedData(overrides = {}) {
  return {
    name: "Ericka James",

    contact: {
      other: ["U.S. Citizen"],
      location: "Atlanta, GA",
      email: "ericka@example.com",
      linkedin: "linkedin.com/in/erickajames",
      phone: "555-123-4567",
    },

    summary:
      "Software engineer focused on building reliable and practical products.",

    education: [
      "Spelman College — B.S. Computer Science",
      "Google Tech Exchange",
    ],

    experience: [
      {
        heading: "JPMorgan Chase & Co — Software Engineer Feb 2025 – Nov 2025",
        bullets: [
          "Built production software.",
          "Collaborated across engineering teams.",
        ],
      },
    ],

    projects: [
      {
        name: "PatchWork",
        description: "Resume improvement platform",
        dates: "2026",
        bullets: [
          "Built resume parsing workflows.",
          "Created responsive resume templates.",
        ],
      },
    ],

    skills: {
      Languages: ["Python", "JavaScript", "C++"],
      Frameworks: ["React", "FastAPI"],
    },

    certifications: ["AWS Cloud Practitioner"],

    ...overrides,
  };
}

function createRect(height = 0) {
  return {
    height,
    width: 0,
    top: 0,
    right: 0,
    bottom: height,
    left: 0,
    x: 0,
    y: 0,
    toJSON: () => {},
  };
}

function getVisibleResumePages() {
  return Array.from(
    document.querySelectorAll(
      ".harvard-resume-page .harvard-resume-page-content"
    )
  );
}

function getVisibleTextMatches(text) {
  return getVisibleResumePages().flatMap((page) =>
    within(page).queryAllByText(text)
  );
}

function expectVisibleText(text) {
  expect(getVisibleTextMatches(text).length).toBeGreaterThan(0);
}

function expectNoVisibleText(text) {
  expect(getVisibleTextMatches(text)).toHaveLength(0);
}

function getFinalFitReport(mock) {
  const calls = mock.mock.calls;

  return calls[calls.length - 1]?.[0];
}

describe("HarvardResume", () => {
  let originalClientHeight;
  let originalGetBoundingClientRect;
  let originalGetComputedStyle;

  beforeEach(() => {
    originalClientHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "clientHeight"
    );

    originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

    originalGetComputedStyle = window.getComputedStyle;
  });

  afterEach(() => {
    if (originalClientHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "clientHeight",
        originalClientHeight
      );
    } else {
      delete HTMLElement.prototype.clientHeight;
    }

    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;

    window.getComputedStyle = originalGetComputedStyle;

    vi.restoreAllMocks();
  });

  function mockPage({ height = 1000, padding = 50 } = {}) {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,

      get() {
        if (this.classList?.contains("harvard-resume-page")) {
          return height;
        }

        return 0;
      },
    });

    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
      const styles = originalGetComputedStyle.call(window, element);

      if (element.classList?.contains("harvard-resume-page")) {
        Object.defineProperty(styles, "paddingTop", {
          configurable: true,
          value: `${padding}px`,
        });

        Object.defineProperty(styles, "paddingBottom", {
          configurable: true,
          value: `${padding}px`,
        });
      }

      return styles;
    });
  }

  it("renders the Harvard-style resume document", () => {
    render(<HarvardResume parsedData={createParsedData()} />);

    expect(
      screen.getByRole("article", {
        name: /harvard-style resume/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("region", {
        name: /resume page 1/i,
      })
    ).toBeInTheDocument();
  });

  it("renders candidate contact information", () => {
    render(<HarvardResume parsedData={createParsedData()} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /ericka james/i,
      })
    ).toBeInTheDocument();

    const pageOne = screen.getByRole("region", {
      name: /resume page 1/i,
    });

    const contact = within(pageOne).getByLabelText(/contact information/i);

    expect(within(contact).getByText("U.S. Citizen")).toBeInTheDocument();

    expect(within(contact).getByText("Atlanta, GA")).toBeInTheDocument();

    expect(within(contact).getByText("ericka@example.com")).toBeInTheDocument();

    expect(
      within(contact).getByText("linkedin.com/in/erickajames")
    ).toBeInTheDocument();

    expect(within(contact).getByText("555-123-4567")).toBeInTheDocument();
  });

  it("supports heading-based experience from parsed profile data", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          experience: [
            {
              heading:
                "The Mattress & Appliance Spot — Web Developer & Automation Engineer Part-Time Jul 2026 – Present",
              bullets: [
                "Built automated inventory workflows.",
                "Maintained production website updates.",
              ],
            },
          ],
        })}
      />
    );

    expectVisibleText(
      "The Mattress & Appliance Spot — Web Developer & Automation Engineer Part-Time Jul 2026 – Present"
    );

    expectVisibleText("Built automated inventory workflows.");

    expectVisibleText("Maintained production website updates.");
  });

  it("still supports legacy company role and dates experience fields", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          experience: [
            {
              company: "JPMorgan Chase",
              role: "Software Engineer",
              dates: "2025",
              bullets: ["Built production features."],
            },
          ],
        })}
      />
    );

    expectVisibleText("JPMorgan Chase — Software Engineer");

    expectVisibleText("2025");

    expectVisibleText("Built production features.");
  });

  it("renders each experience heading separately", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          experience: [
            {
              heading: "Company A — Engineer 2025",
              bullets: ["A1", "A2"],
            },
            {
              heading: "Company B — Developer 2024",
              bullets: ["B1", "B2"],
            },
          ],
        })}
      />
    );

    expectVisibleText("Company A — Engineer 2025");

    expectVisibleText("Company B — Developer 2024");

    expectVisibleText("A1");
    expectVisibleText("B1");
  });

  it("renders project headings separately", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          projects: [
            {
              name: "Project One",
              bullets: ["Project one bullet."],
            },
            {
              title: "Project Two",
              details: ["Project two bullet."],
            },
          ],
        })}
      />
    );

    expectVisibleText("Project One");

    expectVisibleText("Project Two");

    expectVisibleText("Project one bullet.");

    expectVisibleText("Project two bullet.");
  });

  it("renders cleaned education entries", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          education: ["  Spelman College  ", "", null, "Google Tech Exchange"],
        })}
      />
    );

    expectVisibleText("Spelman College");

    expectVisibleText("Google Tech Exchange");
  });

  it("renders cleaned skill categories", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          skills: {
            "  Languages  ": ["  Python  ", "", "Java", null, "  C++  "],
            "": ["Ignored"],
            Empty: [],
            Invalid: "React",
          },
        })}
      />
    );

    expectVisibleText("Languages:");

    expect(
      getVisibleResumePages().some((page) =>
        page.textContent.includes("Python, Java, C++")
      )
    ).toBe(true);

    expectNoVisibleText("Ignored");
  });

  it("renders certifications", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          certifications: ["  AWS Cloud Practitioner  ", "", null, "Security+"],
        })}
      />
    );

    expectVisibleText("AWS Cloud Practitioner");

    expectVisibleText("Security+");
  });

  it("handles completely missing parsed data", () => {
    render(<HarvardResume />);

    expect(
      screen.getByRole("article", {
        name: /harvard-style resume/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("region", {
        name: /resume page 1/i,
      })
    ).toBeInTheDocument();
  });

  it("uses the normal fit level initially", () => {
    render(<HarvardResume parsedData={createParsedData()} />);

    expect(
      screen.getByRole("article", {
        name: /harvard-style resume/i,
      })
    ).toHaveAttribute("data-fit", "normal");
  });

  it("skips pagination when JSDOM reports zero page height", () => {
    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={createParsedData()}
        onFitChange={onFitChange}
      />
    );

    expect(onFitChange).not.toHaveBeenCalled();
  });

  it("keeps a healthy two-page resume", async () => {
    mockPage({
      height: 1000,
      padding: 100,
    });

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      const key = this.dataset?.resumeBlockKey;

      if (!key) {
        return createRect();
      }

      if (key === "header" || key === "summary") {
        return createRect(220);
      }

      if (key.endsWith("-heading")) {
        return createRect(80);
      }

      return createRect(160);
    });

    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={{
          name: "Ericka James",
          summary: "Summary",
          education: ["Education"],
          certifications: ["Certification"],
        }}
        onFitChange={onFitChange}
      />
    );

    await waitFor(() => {
      expect(onFitChange).toHaveBeenCalled();
    });

    const finalReport = getFinalFitReport(onFitChange);

    expect(finalReport.fits).toBe(true);

    expect(finalReport.pageCount).toBeLessThanOrEqual(2);
  });

  it("removes only as many skill categories as necessary", async () => {
    mockPage({
      height: 1000,
      padding: 50,
    });

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      const key = this.dataset?.resumeBlockKey;

      if (!key) {
        return createRect();
      }

      if (key === "header") {
        return createRect(160);
      }

      if (key === "skills-heading") {
        return createRect(80);
      }

      if (key.startsWith("skills-")) {
        return createRect(200);
      }

      return createRect(120);
    });

    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={{
          name: "Ericka James",

          skills: {
            One: ["Skill 1"],
            Two: ["Skill 2"],
            Three: ["Skill 3"],
            Four: ["Skill 4"],
            Five: ["Skill 5"],
          },
        }}
        onFitChange={onFitChange}
      />
    );

    await waitFor(() => {
      expect(onFitChange).toHaveBeenCalled();
    });

    const finalReport = getFinalFitReport(onFitChange);

    expect(finalReport.removedSkills).toBeGreaterThanOrEqual(1);

    expect(finalReport.removedSkills).toBeLessThan(5);

    expectVisibleText("Skill 1");
  });

  it("preserves at least one project", async () => {
    mockPage({
      height: 1000,
      padding: 100,
    });

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      const key = this.dataset?.resumeBlockKey;

      if (!key) {
        return createRect();
      }

      if (key === "header") {
        return createRect(160);
      }

      if (key === "projects-heading") {
        return createRect(80);
      }

      if (key.includes("-heading")) {
        return createRect(100);
      }

      if (key.includes("-bullet-")) {
        return createRect(80);
      }

      return createRect(100);
    });

    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={{
          name: "Ericka James",

          projects: [
            {
              name: "Project One",
              bullets: ["One"],
            },
            {
              name: "Project Two",
              bullets: ["Two"],
            },
            {
              name: "Project Three",
              bullets: ["Three"],
            },
          ],
        }}
        onFitChange={onFitChange}
      />
    );

    await waitFor(() => {
      expect(onFitChange).toHaveBeenCalled();
    });

    const visibleProjects = [
      "Project One",
      "Project Two",
      "Project Three",
    ].filter((project) => getVisibleTextMatches(project).length > 0);

    expect(visibleProjects.length).toBeGreaterThanOrEqual(1);
  });

  it("drops skills entirely before reducing experience when necessary", async () => {
    mockPage({
      height: 900,
      padding: 50,
    });

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      const key = this.dataset?.resumeBlockKey;

      if (!key) {
        return createRect();
      }

      if (key === "header") {
        return createRect(120);
      }

      if (
        key === "education-heading" ||
        key === "projects-heading" ||
        key === "skills-heading" ||
        key === "experience-heading"
      ) {
        return createRect(70);
      }

      if (key.startsWith("education-")) {
        return createRect(80);
      }

      if (key.includes("experience") && key.includes("-heading")) {
        return createRect(85);
      }

      if (key.includes("experience") && key.includes("-bullet-")) {
        return createRect(55);
      }

      if (key.includes("project") && key.includes("-heading")) {
        return createRect(85);
      }

      if (key.includes("project") && key.includes("-bullet-")) {
        return createRect(55);
      }

      if (key.startsWith("skills-")) {
        return createRect(150);
      }

      return createRect(80);
    });

    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={{
          name: "Ericka James",

          education: ["Spelman College"],

          experience: [
            {
              heading: "Company A — Engineer",
              bullets: ["A1", "A2", "A3", "A4"],
            },
            {
              heading: "Company B — Engineer",
              bullets: ["B1", "B2", "B3", "B4"],
            },
          ],

          projects: [
            {
              name: "Project One",
              bullets: ["Project bullet"],
            },
          ],

          skills: {
            Languages: ["Python"],
            Frameworks: ["React"],
            Cloud: ["AWS"],
          },
        }}
        onFitChange={onFitChange}
      />
    );

    await waitFor(() => {
      expect(onFitChange).toHaveBeenCalled();
    });

    const finalReport = getFinalFitReport(onFitChange);

    expect(finalReport.removedExperienceBullets).toBe(0);

    expectVisibleText("Project One");

    expectVisibleText("A1");

    expectVisibleText("A4");

    expectVisibleText("B1");

    expectVisibleText("B4");

    if (finalReport.removedSkills === 3) {
      expectNoVisibleText("Languages:");
    }
  });

  it("preserves at least eight experience bullets", async () => {
    mockPage({
      height: 800,
      padding: 50,
    });

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      const key = this.dataset?.resumeBlockKey;

      if (!key) {
        return createRect();
      }

      if (key === "header") {
        return createRect(100);
      }

      if (key === "experience-heading") {
        return createRect(70);
      }

      if (key.includes("-bullet-")) {
        return createRect(55);
      }

      if (key.endsWith("-heading")) {
        return createRect(80);
      }

      return createRect(100);
    });

    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={{
          name: "Ericka James",

          experience: [
            {
              heading: "Company A",
              bullets: ["A1", "A2", "A3", "A4", "A5", "A6"],
            },
            {
              heading: "Company B",
              bullets: ["B1", "B2", "B3", "B4", "B5", "B6"],
            },
          ],
        }}
        onFitChange={onFitChange}
      />
    );

    await waitFor(() => {
      expect(onFitChange).toHaveBeenCalled();
    });

    const experienceBullets = [
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "B6",
    ];

    const visibleExperienceBullets = experienceBullets.filter(
      (bullet) => getVisibleTextMatches(bullet).length > 0
    );

    expect(visibleExperienceBullets.length).toBeGreaterThanOrEqual(8);
  });

  it("preserves education", async () => {
    mockPage({
      height: 900,
      padding: 50,
    });

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      const key = this.dataset?.resumeBlockKey;

      if (!key) {
        return createRect();
      }

      if (key.endsWith("-heading")) {
        return createRect(80);
      }

      return createRect(180);
    });

    render(
      <HarvardResume
        parsedData={{
          name: "Ericka James",
          education: ["Spelman College"],
          skills: {
            One: ["1"],
            Two: ["2"],
            Three: ["3"],
            Four: ["4"],
          },
          projects: [
            {
              name: "Project One",
            },
            {
              name: "Project Two",
            },
          ],
        }}
      />
    );

    await waitFor(() => {
      expectVisibleText("Spelman College");
    });
  });

  it("never renders page three", async () => {
    mockPage({
      height: 800,
      padding: 50,
    });

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      if (this.dataset?.resumeBlockKey) {
        return createRect(1000);
      }

      return createRect();
    });

    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={{
          name: "Ericka James",
          summary: "Content cannot safely fit.",
          education: ["Spelman College"],
        }}
        onFitChange={onFitChange}
      />
    );

    await waitFor(() => {
      expect(onFitChange).toHaveBeenCalled();
    });

    expect(
      screen.queryByRole("region", {
        name: /resume page 3/i,
      })
    ).not.toBeInTheDocument();
  });

  it("ignores invalid calculated page height", () => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,

      get() {
        return 500;
      },
    });

    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
      const styles = originalGetComputedStyle.call(window, element);

      if (element.classList?.contains("harvard-resume-page")) {
        Object.defineProperty(styles, "paddingTop", {
          configurable: true,
          value: "invalid",
        });

        Object.defineProperty(styles, "paddingBottom", {
          configurable: true,
          value: "invalid",
        });
      }

      return styles;
    });

    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={createParsedData()}
        onFitChange={onFitChange}
      />
    );

    expect(onFitChange).not.toHaveBeenCalled();
  });
});
