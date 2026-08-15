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
        company: "JPMorgan Chase",
        role: "Software Engineer",
        dates: "2025",
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

  function mockPageStyles(padding = 50) {
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

  it("renders the candidate name and contact information", () => {
    render(<HarvardResume parsedData={createParsedData()} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /ericka james/i,
      })
    ).toBeInTheDocument();

    const contact = screen.getByLabelText(/contact information/i);

    expect(within(contact).getByText("U.S. Citizen")).toBeInTheDocument();
    expect(within(contact).getByText("Atlanta, GA")).toBeInTheDocument();
    expect(within(contact).getByText("ericka@example.com")).toBeInTheDocument();

    expect(
      within(contact).getByText("linkedin.com/in/erickajames")
    ).toBeInTheDocument();

    expect(within(contact).getByText("555-123-4567")).toBeInTheDocument();
  });

  it("trims contact values and ignores empty contact entries", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          contact: {
            other: ["  U.S. Citizen  ", "", "   ", null],
            location: "  Huntsville, AL  ",
            email: " ",
            linkedin: "",
            phone: "  555-222-3333  ",
          },
        })}
      />
    );

    const contact = screen.getByLabelText(/contact information/i);

    expect(within(contact).getByText("U.S. Citizen")).toBeInTheDocument();
    expect(within(contact).getByText("Huntsville, AL")).toBeInTheDocument();
    expect(within(contact).getByText("555-222-3333")).toBeInTheDocument();

    expect(within(contact).queryByText(/^\s+$/)).not.toBeInTheDocument();
  });

  it("handles invalid contact data safely", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          contact: ["not", "an", "object"],
        })}
      />
    );

    expect(
      screen.queryByLabelText(/contact information/i)
    ).not.toBeInTheDocument();

    expect(screen.getByText("Ericka James")).toBeInTheDocument();
  });

  it("renders and trims the summary", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          summary: "  Builds practical software systems.  ",
        })}
      />
    );

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /summary/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Builds practical software systems.")
    ).toBeInTheDocument();
  });

  it("renders only valid education entries", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          education: [
            "  Spelman College  ",
            "",
            "   ",
            null,
            "Google Tech Exchange",
          ],
        })}
      />
    );

    expect(screen.getByText("Spelman College")).toBeInTheDocument();
    expect(screen.getByText("Google Tech Exchange")).toBeInTheDocument();
  });

  it("does not render education when education is not an array", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          education: "Spelman College",
        })}
      />
    );

    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: /education/i,
      })
    ).not.toBeInTheDocument();
  });

  it("renders cleaned work experience entries", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          experience: [
            null,
            {
              company: "  JPMorgan Chase  ",
              role: "  Software Engineer  ",
              dates: "  2025  ",
              bullets: [
                "  Built production features.  ",
                "",
                null,
                "Supported production systems.",
              ],
            },
            {
              company: "",
              role: "",
              dates: "",
              bullets: [],
            },
          ],
        })}
      />
    );

    expect(screen.getByText("JPMorgan Chase")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.getByText("Built production features.")).toBeInTheDocument();

    expect(
      screen.getByText("Supported production systems.")
    ).toBeInTheDocument();
  });

  it("renders experience entries even when only bullets contain content", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          experience: [
            {
              company: "",
              role: "",
              dates: "",
              bullets: ["Built an internal tool."],
            },
          ],
        })}
      />
    );

    expect(screen.getByText("Built an internal tool.")).toBeInTheDocument();
  });

  it("renders project details and bullets", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          projects: [
            {
              name: "  PatchWork  ",
              description: "  Resume platform  ",
              dates: "  2026  ",
              bullets: [
                "  Parsed uploaded resumes.  ",
                "",
                "Generated resume previews.",
              ],
            },
          ],
        })}
      />
    );

    expect(screen.getByText("PatchWork")).toBeInTheDocument();
    expect(screen.getByText("Resume platform")).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();

    expect(screen.getByText("Parsed uploaded resumes.")).toBeInTheDocument();

    expect(screen.getByText("Generated resume previews.")).toBeInTheDocument();
  });

  it("filters empty projects", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          projects: [
            null,
            {
              name: "",
              description: "",
              dates: "",
              bullets: [],
            },
          ],
        })}
      />
    );

    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: /projects/i,
      })
    ).not.toBeInTheDocument();
  });

  it("renders skill categories and cleaned skill values", () => {
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

    expect(screen.getByText("Languages:")).toBeInTheDocument();

    expect(
      screen.getByText((content) => content.includes("Python, Java, C++"))
    ).toBeInTheDocument();

    expect(screen.queryByText("Ignored")).not.toBeInTheDocument();
  });

  it("does not render skills when skills data is invalid", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          skills: ["Python", "React"],
        })}
      />
    );

    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: /skills/i,
      })
    ).not.toBeInTheDocument();
  });

  it("renders cleaned certification entries", () => {
    render(
      <HarvardResume
        parsedData={createParsedData({
          certifications: ["  AWS Cloud Practitioner  ", "", null, "Security+"],
        })}
      />
    );

    expect(screen.getByText("AWS Cloud Practitioner")).toBeInTheDocument();
    expect(screen.getByText("Security+")).toBeInTheDocument();
  });

  it("does not render empty sections when parsed data contains no content", () => {
    render(
      <HarvardResume
        parsedData={{
          name: "",
          contact: {},
          summary: "",
          education: [],
          experience: [],
          projects: [],
          skills: {},
          certifications: [],
        }}
      />
    );

    expect(
      screen.queryByRole("heading", {
        level: 1,
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        level: 2,
      })
    ).not.toBeInTheDocument();
  });

  it("uses the normal fit level initially", () => {
    render(<HarvardResume parsedData={createParsedData()} />);

    expect(
      screen.getByRole("article", {
        name: /harvard-style resume/i,
      })
    ).toHaveAttribute("data-fit", "normal");
  });

  it("skips physical pagination when JSDOM reports zero page height", () => {
    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={createParsedData()}
        onFitChange={onFitChange}
      />
    );

    expect(
      screen.getByRole("region", {
        name: /resume page 1/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("region", {
        name: /resume page 2/i,
      })
    ).not.toBeInTheDocument();

    expect(onFitChange).not.toHaveBeenCalled();
  });

  it("paginates content into two pages when measured content fits", async () => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        if (this.classList?.contains("harvard-resume-page")) {
          return 1000;
        }

        return 0;
      },
    });

    mockPageStyles(100);

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      if (this.dataset?.resumeBlockKey) {
        return createRect(400);
      }

      return createRect();
    });

    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={{
          name: "Ericka James",
          contact: {},
          summary: "Software engineer.",
          education: ["Spelman College"],
        }}
        onFitChange={onFitChange}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("region", {
          name: /resume page 2/i,
        })
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Page 2")).toBeInTheDocument();

    await waitFor(() => {
      expect(onFitChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fits: true,
          removedSkills: 0,
          removedProjectBullets: 0,
          fitLevel: "normal",
        })
      );
    });
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

  it("tightens the resume before removing content", async () => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        if (this.classList?.contains("harvard-resume-page")) {
          return 1000;
        }

        return 0;
      },
    });

    mockPageStyles(50);

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      if (!this.dataset?.resumeBlockKey) {
        return createRect();
      }

      const documentElement = this.closest(".harvard-resume-document");
      const fitLevel = documentElement?.dataset.fit;

      const height =
        fitLevel === "normal" ? 650 : fitLevel === "compact" ? 500 : 300;

      return createRect(height);
    });

    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={{
          name: "Ericka James",
          contact: {},
          summary: "Summary",
          education: ["Education"],
          experience: [
            {
              company: "Company",
              role: "Engineer",
              dates: "2026",
              bullets: ["One"],
            },
          ],
        }}
        onFitChange={onFitChange}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("article", {
          name: /harvard-style resume/i,
        })
      ).toHaveAttribute("data-fit", "tight");
    });

    await waitFor(() => {
      expect(onFitChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fits: true,
          fitLevel: "tight",
        })
      );
    });
  });

  it("removes lower-priority skills when tightening alone cannot fit the resume", async () => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        if (this.classList?.contains("harvard-resume-page")) {
          return 1000;
        }

        return 0;
      },
    });

    mockPageStyles(50);

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      if (this.dataset?.resumeBlockKey) {
        return createRect(300);
      }

      return createRect();
    });

    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={{
          name: "Ericka James",
          contact: {},
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
      expect(onFitChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fits: true,
          removedSkills: 1,
          fitLevel: "tight",
        })
      );
    });

    expect(screen.queryByText(/skill 5/i)).not.toBeInTheDocument();

    expect(screen.getByText(/skill 1/i)).toBeInTheDocument();
    expect(screen.getByText(/skill 2/i)).toBeInTheDocument();
    expect(screen.getByText(/skill 3/i)).toBeInTheDocument();
  });

  it("trims project bullets after fit levels and skills are exhausted", async () => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        if (this.classList?.contains("harvard-resume-page")) {
          return 1000;
        }

        return 0;
      },
    });

    mockPageStyles(50);

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      const key = this.dataset?.resumeBlockKey;

      if (key === "project-0") {
        const bulletCount = this.querySelectorAll("li").length;

        return createRect(300 + bulletCount * 200);
      }

      if (key) {
        return createRect(200);
      }

      return createRect();
    });

    const onFitChange = vi.fn();

    render(
      <HarvardResume
        parsedData={{
          name: "Ericka James",
          contact: {},
          projects: [
            {
              name: "PatchWork",
              description: "Resume platform",
              dates: "2026",
              bullets: [
                "Bullet one",
                "Bullet two",
                "Bullet three",
                "Bullet four",
              ],
            },
          ],
        }}
        onFitChange={onFitChange}
      />
    );

    await waitFor(() => {
      expect(onFitChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fits: true,
          removedProjectBullets: 2,
          fitLevel: "tight",
        })
      );
    });

    expect(screen.getByText("Bullet one")).toBeInTheDocument();
    expect(screen.getByText("Bullet two")).toBeInTheDocument();

    expect(screen.queryByText("Bullet three")).not.toBeInTheDocument();
    expect(screen.queryByText("Bullet four")).not.toBeInTheDocument();
  });

  it("reports failure when content still cannot fit after all safe reductions", async () => {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        if (this.classList?.contains("harvard-resume-page")) {
          return 800;
        }

        return 0;
      },
    });

    mockPageStyles(50);

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
          contact: {},
          summary: "This content cannot safely fit.",
        }}
        onFitChange={onFitChange}
      />
    );

    await waitFor(() => {
      expect(onFitChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fits: false,
          removedSkills: 0,
          removedProjectBullets: 0,
          fitLevel: "tight",
        })
      );
    });
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
});
