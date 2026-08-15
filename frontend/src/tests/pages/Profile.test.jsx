import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Profile from "../../pages/Profile";

const { useAuthMock, getResumeByUserIdMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getResumeByUserIdMock: vi.fn(),
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: useAuthMock,
}));

vi.mock("../../services/resumeService", () => ({
  getResumeByUserId: getResumeByUserIdMock,
}));

function createResume(overrides = {}) {
  return {
    id: "resume-123",
    user_id: "user-123",
    original_filename: "Ericka_James_Resume.pdf",
    status: "parsed",
    parsed_data: {
      skills: {
        Languages: ["Java", "Python", "C++"],
        "Web and APIs": ["React", "FastAPI", "REST APIs"],
        "Business Tools": ["Microsoft Excel", "Google Workspace"],
        "Cloud and DevOps": ["AWS", "Terraform", "Docker"],
        "Data and Analysis": ["Data Validation", "Reporting"],
      },
      education: ["Spelman College — B.S. Computer Science, 2025"],
      experience: [
        {
          heading:
            "The Mattress & Appliance Spot — Web Developer & Automation Engineer, Part-Time Jul 2026 – Present",
          bullets: [
            "Built an automated inventory workflow.",
            "Connected internal product data to the company website.",
          ],
        },
        {
          heading:
            "Gwinnett County Public Schools — Substitute Teacher Apr 2026 – June 2026",
          bullets: ["Supported classroom instruction."],
        },
        {
          heading: "JPMorgan Chase — Software Engineer Feb 2025 – Nov 2025",
          bullets: ["Delivered production software features."],
        },
        {
          heading: "Example Company — Software Engineer",
          bullets: ["Built internal tools."],
        },
      ],
      projects: [
        {
          heading: "DefenderFirewall",
          description: "A modular Windows-focused defensive toolkit.",
          dates: "2026",
          bullets: [
            "Built monitoring and scanning utilities.",
            "Added event-driven automation.",
          ],
        },
        {
          title: "Jinx",
          description: "A compact robotics platform.",
          bullets: ["Integrated sensors and motor control."],
        },
        {
          name: "PatchWork",
          description: "A resume improvement platform.",
          bullets: ["Built with React, FastAPI, and Supabase."],
        },
        {
          project_name: "Inventory Automation",
          bullets: ["Automated product updates."],
        },
        {
          projectName: "Embedded Systems Lab",
          bullets: ["Built Arduino prototypes."],
        },
      ],
      certifications: ["CompTIA Tech+", "AWS Cloud Practitioner"],
    },
    ...overrides,
  };
}

function mockAuthenticatedUser(overrides = {}) {
  useAuthMock.mockReturnValue({
    user: {
      id: "user-123",
    },
    profile: {
      first_name: "Ericka",
    },
    signOut: vi.fn(),
    ...overrides,
  });
}

function mockMatchMedia({ matches = false } = {}) {
  const listeners = new Set();

  const mediaQuery = {
    matches,
    media: "(max-width: 600px)",
    onchange: null,
    addEventListener: vi.fn((eventName, callback) => {
      if (eventName === "change") {
        listeners.add(callback);
      }
    }),
    removeEventListener: vi.fn((eventName, callback) => {
      if (eventName === "change") {
        listeners.delete(callback);
      }
    }),
    dispatchEvent: vi.fn(),
  };

  window.matchMedia = vi.fn().mockReturnValue(mediaQuery);

  return {
    mediaQuery,
    setMatches(nextMatches) {
      mediaQuery.matches = nextMatches;

      listeners.forEach((listener) => {
        listener({
          matches: nextMatches,
          media: mediaQuery.media,
        });
      });
    },
  };
}

function renderProfile() {
  render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<h1>Login destination</h1>} />
        <Route
          path="/reset-password"
          element={<h1>Reset password destination</h1>}
        />
      </Routes>
    </MemoryRouter>
  );
}

async function loadProfilePage({
  resume = createResume(),
  mobile = false,
} = {}) {
  mockMatchMedia({
    matches: mobile,
  });

  mockAuthenticatedUser();

  getResumeByUserIdMock.mockResolvedValue(resume);

  renderProfile();

  expect(screen.getByText(/loading your resume profile/i)).toBeInTheDocument();

  await screen.findByText(resume.original_filename);

  return resume;
}

describe("Profile", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    getResumeByUserIdMock.mockReset();

    mockMatchMedia();
  });

  it("loads the authenticated user's existing resume", async () => {
    await loadProfilePage();

    expect(getResumeByUserIdMock).toHaveBeenCalledOnce();
    expect(getResumeByUserIdMock).toHaveBeenCalledWith("user-123");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /your resume at a glance/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByText("Ericka_James_Resume.pdf")).toBeInTheDocument();
  });

  it("renders skills, education, work experience, projects, and certifications", async () => {
    await loadProfilePage();

    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("Web and APIs")).toBeInTheDocument();

    expect(
      screen.getByText("Spelman College — B.S. Computer Science, 2025")
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /the mattress & appliance spot — web developer & automation engineer/i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(/gwinnett county public schools — substitute teacher/i)
    ).toBeInTheDocument();

    expect(screen.getByText("DefenderFirewall")).toBeInTheDocument();
    expect(screen.getByText("Jinx")).toBeInTheDocument();
    expect(screen.getByText("PatchWork")).toBeInTheDocument();

    expect(screen.getByText("CompTIA Tech+")).toBeInTheDocument();
    expect(screen.getByText("AWS Cloud Practitioner")).toBeInTheDocument();
  });

  it("renders certifications beneath the skills section", async () => {
    await loadProfilePage();

    expect(
      screen.getByText("Certifications", {
        selector: "summary span",
      })
    ).toBeInTheDocument();

    expect(screen.getByText("CompTIA Tech+")).toBeInTheDocument();
    expect(screen.getByText("AWS Cloud Practitioner")).toBeInTheDocument();
  });

  it("renders the reset password account action", async () => {
    await loadProfilePage();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /reset your password/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: /reset password/i,
      })
    ).toHaveAttribute("href", "/reset-password");
  });

  it("navigates to the reset password page", async () => {
    const user = userEvent.setup();

    await loadProfilePage();

    await user.click(
      screen.getByRole("link", {
        name: /reset password/i,
      })
    );

    expect(
      await screen.findByRole("heading", {
        name: /reset password destination/i,
      })
    ).toBeInTheDocument();
  });

  it("starts the first three skill categories expanded on desktop", async () => {
    await loadProfilePage({
      mobile: false,
    });

    expect(
      screen.getByRole("button", {
        name: /^languages/i,
      })
    ).toHaveAttribute("aria-expanded", "true");

    expect(
      screen.getByRole("button", {
        name: /^web and apis/i,
      })
    ).toHaveAttribute("aria-expanded", "true");

    expect(
      screen.getByRole("button", {
        name: /^business tools/i,
      })
    ).toHaveAttribute("aria-expanded", "true");

    expect(
      screen.getByRole("button", {
        name: /^cloud and devops/i,
      })
    ).toHaveAttribute("aria-expanded", "false");

    expect(screen.getByText("Java")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Microsoft Excel")).toBeInTheDocument();
  });

  it("starts all nested skill categories collapsed on mobile", async () => {
    await loadProfilePage({
      mobile: true,
    });

    expect(
      screen.getByRole("button", {
        name: /^languages/i,
      })
    ).toHaveAttribute("aria-expanded", "false");

    expect(
      screen.getByRole("button", {
        name: /^web and apis/i,
      })
    ).toHaveAttribute("aria-expanded", "false");

    expect(
      screen.getByRole("button", {
        name: /^business tools/i,
      })
    ).toHaveAttribute("aria-expanded", "false");

    expect(screen.queryByText("Java")).not.toBeInTheDocument();
    expect(screen.queryByText("React")).not.toBeInTheDocument();
  });

  it("allows a collapsed skill category to be opened", async () => {
    const user = userEvent.setup();

    await loadProfilePage({
      mobile: true,
    });

    const languagesButton = screen.getByRole("button", {
      name: /^languages/i,
    });

    await user.click(languagesButton);

    expect(languagesButton).toHaveAttribute("aria-expanded", "true");

    expect(screen.getByText("Java")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
  });

  it("keeps no more than three skill categories expanded at once", async () => {
    const user = userEvent.setup();

    await loadProfilePage({
      mobile: false,
    });

    const languagesButton = screen.getByRole("button", {
      name: /^languages/i,
    });

    const webButton = screen.getByRole("button", {
      name: /^web and apis/i,
    });

    const businessButton = screen.getByRole("button", {
      name: /^business tools/i,
    });

    const cloudButton = screen.getByRole("button", {
      name: /^cloud and devops/i,
    });

    expect(languagesButton).toHaveAttribute("aria-expanded", "true");
    expect(webButton).toHaveAttribute("aria-expanded", "true");
    expect(businessButton).toHaveAttribute("aria-expanded", "true");

    await user.click(cloudButton);

    expect(languagesButton).toHaveAttribute("aria-expanded", "false");
    expect(webButton).toHaveAttribute("aria-expanded", "true");
    expect(businessButton).toHaveAttribute("aria-expanded", "true");
    expect(cloudButton).toHaveAttribute("aria-expanded", "true");

    expect(screen.queryByText("Java")).not.toBeInTheDocument();
    expect(screen.getByText("AWS")).toBeInTheDocument();
  });

  it("starts every work experience entry collapsed", async () => {
    await loadProfilePage();

    const mattressButton = screen.getByRole("button", {
      name: /the mattress & appliance spot/i,
    });

    const schoolButton = screen.getByRole("button", {
      name: /gwinnett county public schools/i,
    });

    const jpmorganButton = screen.getByRole("button", {
      name: /jpmorgan chase/i,
    });

    expect(mattressButton).toHaveAttribute("aria-expanded", "false");
    expect(schoolButton).toHaveAttribute("aria-expanded", "false");
    expect(jpmorganButton).toHaveAttribute("aria-expanded", "false");

    expect(
      screen.queryByText(/built an automated inventory workflow/i)
    ).not.toBeInTheDocument();
  });

  it("expands an individual work experience entry", async () => {
    const user = userEvent.setup();

    await loadProfilePage();

    const mattressButton = screen.getByRole("button", {
      name: /the mattress & appliance spot/i,
    });

    await user.click(mattressButton);

    expect(mattressButton).toHaveAttribute("aria-expanded", "true");

    expect(
      screen.getByText(/built an automated inventory workflow/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /connected internal product data to the company website/i
      )
    ).toBeInTheDocument();
  });

  it("keeps no more than three work experience entries expanded at once", async () => {
    const user = userEvent.setup();

    await loadProfilePage();

    const mattressButton = screen.getByRole("button", {
      name: /the mattress & appliance spot/i,
    });

    const schoolButton = screen.getByRole("button", {
      name: /gwinnett county public schools/i,
    });

    const jpmorganButton = screen.getByRole("button", {
      name: /jpmorgan chase/i,
    });

    const exampleButton = screen.getByRole("button", {
      name: /example company/i,
    });

    await user.click(mattressButton);
    await user.click(schoolButton);
    await user.click(jpmorganButton);

    expect(mattressButton).toHaveAttribute("aria-expanded", "true");
    expect(schoolButton).toHaveAttribute("aria-expanded", "true");
    expect(jpmorganButton).toHaveAttribute("aria-expanded", "true");

    await user.click(exampleButton);

    expect(mattressButton).toHaveAttribute("aria-expanded", "false");
    expect(schoolButton).toHaveAttribute("aria-expanded", "true");
    expect(jpmorganButton).toHaveAttribute("aria-expanded", "true");
    expect(exampleButton).toHaveAttribute("aria-expanded", "true");
  });

  it("renders actual project names from supported project title fields", async () => {
    await loadProfilePage();

    expect(screen.getByText("DefenderFirewall")).toBeInTheDocument();
    expect(screen.getByText("Jinx")).toBeInTheDocument();
    expect(screen.getByText("PatchWork")).toBeInTheDocument();
    expect(screen.getByText("Inventory Automation")).toBeInTheDocument();
    expect(screen.getByText("Embedded Systems Lab")).toBeInTheDocument();

    expect(screen.queryByText("Project 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Project 2")).not.toBeInTheDocument();
  });

  it("falls back to a numbered project title when no project name exists", async () => {
    await loadProfilePage({
      resume: createResume({
        parsed_data: {
          skills: {},
          education: [],
          experience: [],
          certifications: [],
          projects: [
            {
              description: "A project without a parsed title.",
              bullets: ["Built something useful."],
            },
          ],
        },
      }),
    });

    expect(screen.getByText("Project 1")).toBeInTheDocument();
  });

  it("expands an individual project", async () => {
    const user = userEvent.setup();

    await loadProfilePage();

    const defenderButton = screen.getByRole("button", {
      name: /defenderfirewall/i,
    });

    expect(defenderButton).toHaveAttribute("aria-expanded", "false");

    await user.click(defenderButton);

    expect(defenderButton).toHaveAttribute("aria-expanded", "true");

    expect(
      screen.getByText(/a modular windows-focused defensive toolkit/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/built monitoring and scanning utilities/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/added event-driven automation/i)
    ).toBeInTheDocument();
  });

  it("keeps no more than three projects expanded at once", async () => {
    const user = userEvent.setup();

    await loadProfilePage();

    const defenderButton = screen.getByRole("button", {
      name: /defenderfirewall/i,
    });

    const jinxButton = screen.getByRole("button", {
      name: /^jinx/i,
    });

    const patchWorkButton = screen.getByRole("button", {
      name: /^patchwork/i,
    });

    const inventoryButton = screen.getByRole("button", {
      name: /inventory automation/i,
    });

    await user.click(defenderButton);
    await user.click(jinxButton);
    await user.click(patchWorkButton);

    expect(defenderButton).toHaveAttribute("aria-expanded", "true");
    expect(jinxButton).toHaveAttribute("aria-expanded", "true");
    expect(patchWorkButton).toHaveAttribute("aria-expanded", "true");

    await user.click(inventoryButton);

    expect(defenderButton).toHaveAttribute("aria-expanded", "false");
    expect(jinxButton).toHaveAttribute("aria-expanded", "true");
    expect(patchWorkButton).toHaveAttribute("aria-expanded", "true");
    expect(inventoryButton).toHaveAttribute("aria-expanded", "true");
  });

  it("renders empty messages when parsed sections are missing", async () => {
    await loadProfilePage({
      resume: createResume({
        parsed_data: {
          skills: {},
          education: [],
          experience: [],
          projects: [],
          certifications: [],
        },
      }),
    });

    expect(
      screen.getByText(/no skills were found in this resume/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/no education details were found in this resume/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/no work experience was found in this resume/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/no projects were found in your uploaded resume/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/no certifications were found in your uploaded resume/i)
    ).toBeInTheDocument();
  });

  it("shows the service error when the resume cannot be loaded", async () => {
    mockMatchMedia();
    mockAuthenticatedUser();

    getResumeByUserIdMock.mockRejectedValue(new Error("Resume lookup failed"));

    renderProfile();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /resume lookup failed/i
    );
  });

  it("shows the fallback error when loading fails without a message", async () => {
    mockMatchMedia();
    mockAuthenticatedUser();

    getResumeByUserIdMock.mockRejectedValue({});

    renderProfile();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to load your resume\. please try again/i
    );
  });

  it("signs out and redirects to login", async () => {
    const user = userEvent.setup();
    const signOutMock = vi.fn().mockResolvedValue();

    mockMatchMedia();

    mockAuthenticatedUser({
      signOut: signOutMock,
    });

    getResumeByUserIdMock.mockResolvedValue(createResume());

    renderProfile();

    await screen.findByText("Ericka_James_Resume.pdf");

    await user.click(
      screen.getByRole("button", {
        name: /log out/i,
      })
    );

    expect(signOutMock).toHaveBeenCalledOnce();

    expect(
      await screen.findByRole("heading", {
        name: /login destination/i,
      })
    ).toBeInTheDocument();
  });

  it("shows an error when logout fails", async () => {
    const user = userEvent.setup();

    mockMatchMedia();

    mockAuthenticatedUser({
      signOut: vi.fn().mockRejectedValue(new Error("Logout failed")),
    });

    getResumeByUserIdMock.mockResolvedValue(createResume());

    renderProfile();

    await screen.findByText("Ericka_James_Resume.pdf");

    await user.click(
      screen.getByRole("button", {
        name: /log out/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /logout failed/i
    );
  });

  it("updates section state when the viewport crosses the mobile breakpoint", async () => {
    const { setMatches } = mockMatchMedia({
      matches: false,
    });

    mockAuthenticatedUser();

    getResumeByUserIdMock.mockResolvedValue(createResume());

    renderProfile();

    await screen.findByText("Ericka_James_Resume.pdf");

    expect(
      screen.getByRole("button", {
        name: /^languages/i,
      })
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent(window, new Event("resize"));

    setMatches(true);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /^languages/i,
        })
      ).toHaveAttribute("aria-expanded", "false");
    });

    expect(
      screen.getByRole("button", {
        name: /the mattress & appliance spot/i,
      })
    ).toHaveAttribute("aria-expanded", "false");

    expect(
      screen.getByRole("button", {
        name: /defenderfirewall/i,
      })
    ).toHaveAttribute("aria-expanded", "false");
  });
});
