import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResumeGenerator from "../../pages/ResumeGenerator";

const { useAuthMock, getResumeByUserIdMock, harvardResumeMock } = vi.hoisted(
  () => ({
    useAuthMock: vi.fn(),
    getResumeByUserIdMock: vi.fn(),
    harvardResumeMock: vi.fn(),
  })
);

vi.mock("../../context/useAuth", () => ({
  useAuth: useAuthMock,
}));

vi.mock("../../services/resumeService", () => ({
  getResumeByUserId: getResumeByUserIdMock,
}));

vi.mock("../../components/resume/HarvardResume", () => ({
  default: (props) => harvardResumeMock(props),
}));

vi.mock("../../content/pages/resumeGeneratorContent", () => ({
  RESUME_GENERATOR_CONTENT: {
    intro: {
      eyebrow: "Resume generator",
      heading: "Build your updated resume",
      description: "Preview your resume using a professional template.",
    },

    template: {
      name: "Harvard Resume",
      description: "A clean Harvard-style resume format.",
    },

    actions: {
      backToProfile: "Back to profile",
    },

    loading: {
      message: "Loading your resume...",
    },

    errors: {
      missingResume: "Your parsed resume could not be found.",
      loadFallback: "Unable to load your resume. Please try again.",
      logoutFallback: "Unable to log out. Please try again.",
    },

    routes: {
      login: "/login",
      profile: "/profile",
    },
  },
}));

function mockAuthenticatedUser(overrides = {}) {
  useAuthMock.mockReturnValue({
    user: {
      id: "user-123",
    },
    profile: {
      first_name: "Ericka",
    },
    hasResume: true,
    signOut: vi.fn(),
    ...overrides,
  });
}

function renderResumeGenerator() {
  render(
    <MemoryRouter initialEntries={["/resume-generator"]}>
      <Routes>
        <Route path="/resume-generator" element={<ResumeGenerator />} />
        <Route path="/profile" element={<h1>Profile destination</h1>} />
        <Route path="/login" element={<h1>Login destination</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

function createResume() {
  return {
    id: "resume-123",
    user_id: "user-123",
    original_filename: "software-resume.pdf",
    parsed_data: {
      contact: {
        name: "Ericka James",
        email: "ericka@example.com",
      },
      skills: ["React", "Python"],
      work_experience: [],
      education: [],
    },
  };
}

describe("ResumeGenerator", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    getResumeByUserIdMock.mockReset();
    harvardResumeMock.mockReset();

    mockAuthenticatedUser();

    harvardResumeMock.mockImplementation(({ parsedData }) => (
      <div data-testid="harvard-resume">
        {parsedData.contact?.name ?? "No name"}
      </div>
    ));
  });

  it("shows a loading state while the resume is being loaded", () => {
    getResumeByUserIdMock.mockReturnValue(new Promise(() => {}));

    renderResumeGenerator();

    expect(screen.getByRole("status")).toHaveTextContent(
      /loading your resume/i
    );
  });

  it("loads the authenticated user's resume", async () => {
    const resume = createResume();

    getResumeByUserIdMock.mockResolvedValue(resume);

    renderResumeGenerator();

    await waitFor(() => {
      expect(getResumeByUserIdMock).toHaveBeenCalledWith("user-123");
    });

    expect(getResumeByUserIdMock).toHaveBeenCalledOnce();
  });

  it("renders the resume generator workspace", async () => {
    getResumeByUserIdMock.mockResolvedValue(createResume());

    renderResumeGenerator();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /build your updated resume/i,
      })
    ).toBeInTheDocument();

    expect(await screen.findByText(/harvard resume/i)).toBeInTheDocument();

    expect(
      screen.getByText(/a clean harvard-style resume format/i)
    ).toBeInTheDocument();

    expect(screen.getByTestId("harvard-resume")).toHaveTextContent(
      "Ericka James"
    );
  });

  it("passes parsed resume data to HarvardResume", async () => {
    const resume = createResume();

    getResumeByUserIdMock.mockResolvedValue(resume);

    renderResumeGenerator();

    await screen.findByTestId("harvard-resume");

    expect(harvardResumeMock).toHaveBeenCalled();

    const lastCall =
      harvardResumeMock.mock.calls[harvardResumeMock.mock.calls.length - 1];

    expect(lastCall[0].parsedData).toEqual(resume.parsed_data);
    expect(lastCall[0].onFitChange).toEqual(expect.any(Function));
  });

  it("renders a link back to the profile page", async () => {
    getResumeByUserIdMock.mockResolvedValue(createResume());

    renderResumeGenerator();

    expect(
      await screen.findByRole("link", {
        name: /back to profile/i,
      })
    ).toHaveAttribute("href", "/profile");
  });

  it("navigates back to the profile page", async () => {
    const user = userEvent.setup();

    getResumeByUserIdMock.mockResolvedValue(createResume());

    renderResumeGenerator();

    await user.click(
      await screen.findByRole("link", {
        name: /back to profile/i,
      })
    );

    expect(
      await screen.findByRole("heading", {
        name: /profile destination/i,
      })
    ).toBeInTheDocument();
  });

  it("shows an error when parsed resume data is missing", async () => {
    getResumeByUserIdMock.mockResolvedValue({
      id: "resume-123",
      parsed_data: null,
    });

    renderResumeGenerator();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /parsed resume could not be found/i
    );

    expect(screen.queryByTestId("harvard-resume")).not.toBeInTheDocument();
  });

  it("shows resume loading errors", async () => {
    getResumeByUserIdMock.mockRejectedValue(
      new Error("Resume database unavailable")
    );

    renderResumeGenerator();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /resume database unavailable/i
    );
  });

  it("shows the fallback error when loading fails without a message", async () => {
    getResumeByUserIdMock.mockRejectedValue({});

    renderResumeGenerator();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to load your resume\. please try again/i
    );
  });

  it("shows removed content details when the resume is adjusted to fit", async () => {
    const user = userEvent.setup();

    getResumeByUserIdMock.mockResolvedValue(createResume());

    harvardResumeMock.mockImplementation(({ parsedData, onFitChange }) => (
      <div>
        <div data-testid="harvard-resume">{parsedData.contact.name}</div>

        <button
          type="button"
          onClick={() =>
            onFitChange({
              fits: true,
              removedSkills: 2,
              removedProjectBullets: 1,
            })
          }
        >
          Report fit
        </button>
      </div>
    ));

    renderResumeGenerator();

    await user.click(
      await screen.findByRole("button", {
        name: /report fit/i,
      })
    );

    expect(
      screen.getByText(/resume adjusted to fit within two pages/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/2 lower-priority skills removed/i)
    ).toBeInTheDocument();

    expect(screen.getByText(/1 project bullet removed/i)).toBeInTheDocument();

    expect(
      screen.getByText(/original uploaded resume was not changed/i)
    ).toBeInTheDocument();
  });

  it("uses singular wording when one skill is removed", async () => {
    const user = userEvent.setup();

    getResumeByUserIdMock.mockResolvedValue(createResume());

    harvardResumeMock.mockImplementation(({ onFitChange }) => (
      <button
        type="button"
        onClick={() =>
          onFitChange({
            fits: true,
            removedSkills: 1,
            removedProjectBullets: 0,
          })
        }
      >
        Report fit
      </button>
    ));

    renderResumeGenerator();

    await user.click(
      await screen.findByRole("button", {
        name: /report fit/i,
      })
    );

    expect(
      screen.getByText(/1 lower-priority skill removed/i)
    ).toBeInTheDocument();
  });

  it("shows a warning when the generated resume still does not fit", async () => {
    const user = userEvent.setup();

    getResumeByUserIdMock.mockResolvedValue(createResume());

    harvardResumeMock.mockImplementation(({ onFitChange }) => (
      <button
        type="button"
        onClick={() =>
          onFitChange({
            fits: false,
            removedSkills: 0,
            removedProjectBullets: 0,
          })
        }
      >
        Report overflow
      </button>
    ));

    renderResumeGenerator();

    await user.click(
      await screen.findByRole("button", {
        name: /report overflow/i,
      })
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /still cannot safely fit within two pages/i
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /preserved your contact information/i
    );
  });

  it("signs out and redirects to login", async () => {
    const user = userEvent.setup();
    const signOutMock = vi.fn().mockResolvedValue();

    mockAuthenticatedUser({
      signOut: signOutMock,
    });

    getResumeByUserIdMock.mockResolvedValue(createResume());

    renderResumeGenerator();

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

    mockAuthenticatedUser({
      signOut: vi.fn().mockRejectedValue(new Error("Logout failed")),
    });

    getResumeByUserIdMock.mockResolvedValue(createResume());

    renderResumeGenerator();

    await user.click(
      screen.getByRole("button", {
        name: /log out/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /logout failed/i
    );

    expect(
      screen.queryByRole("heading", {
        name: /login destination/i,
      })
    ).not.toBeInTheDocument();
  });

  it("shows the fallback error when logout fails without a message", async () => {
    const user = userEvent.setup();

    mockAuthenticatedUser({
      signOut: vi.fn().mockRejectedValue({}),
    });

    getResumeByUserIdMock.mockResolvedValue(createResume());

    renderResumeGenerator();

    await user.click(
      screen.getByRole("button", {
        name: /log out/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to log out\. please try again/i
    );
  });
});
