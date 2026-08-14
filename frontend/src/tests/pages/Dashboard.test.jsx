import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Dashboard from "../../pages/Dashboard";

const { useAuthMock, uploadResumeMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  uploadResumeMock: vi.fn(),
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: useAuthMock,
}));

vi.mock("../../services/resumeService", () => ({
  uploadResume: uploadResumeMock,
}));

function renderDashboard() {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<h1>Login destination</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

function mockAuthenticatedUser(overrides = {}) {
  useAuthMock.mockReturnValue({
    user: {
      id: "user-123",
    },
    profile: {
      first_name: "Ericka",
    },
    isProfileLoading: false,
    signOut: vi.fn(),
    ...overrides,
  });
}

function createPdfResume() {
  return new File(["resume content"], "software-resume.pdf", {
    type: "application/pdf",
  });
}

describe("Dashboard", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    uploadResumeMock.mockReset();
  });

  it("renders the authenticated user's first name", () => {
    mockAuthenticatedUser();

    renderDashboard();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /welcome, ericka/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/signed in as ericka/i)).toBeInTheDocument();
  });

  it("shows a loading greeting while the profile loads", () => {
    useAuthMock.mockReturnValue({
      user: {
        id: "user-123",
      },
      profile: null,
      isProfileLoading: true,
      signOut: vi.fn(),
    });

    renderDashboard();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /welcome back/i,
      })
    ).toBeInTheDocument();
  });

  it("renders the resume upload controls", () => {
    mockAuthenticatedUser();

    renderDashboard();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /start with your current resume/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByText(/pdf or docx, up to 10 mb/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /choose resume/i,
      })
    ).toBeEnabled();
  });

  it("accepts a PDF resume", async () => {
    const user = userEvent.setup();

    mockAuthenticatedUser();
    renderDashboard();

    const file = createPdfResume();

    await user.upload(screen.getByLabelText(/resume file/i), file);

    expect(screen.getByText("software-resume.pdf")).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /choose a different resume/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /upload resume/i,
      })
    ).toBeEnabled();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("accepts a DOCX resume", async () => {
    const user = userEvent.setup();

    mockAuthenticatedUser();
    renderDashboard();

    const file = new File(["resume content"], "software-resume.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await user.upload(screen.getByLabelText(/resume file/i), file);

    expect(screen.getByText("software-resume.docx")).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /upload resume/i,
      })
    ).toBeEnabled();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects an unsupported resume type", async () => {
    const user = userEvent.setup({
      applyAccept: false,
    });

    mockAuthenticatedUser();
    renderDashboard();

    const file = new File(["not a resume"], "resume.txt", {
      type: "text/plain",
    });

    await user.upload(screen.getByLabelText(/resume file/i), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /please choose a pdf or docx resume/i
    );

    expect(screen.queryByText("resume.txt")).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /upload resume/i,
      })
    ).not.toBeInTheDocument();
  });

  it("rejects a resume larger than 10 MB", async () => {
    const user = userEvent.setup();

    mockAuthenticatedUser();
    renderDashboard();

    const oversizedContent = new Uint8Array(10 * 1024 * 1024 + 1);

    const file = new File([oversizedContent], "large-resume.pdf", {
      type: "application/pdf",
    });

    await user.upload(screen.getByLabelText(/resume file/i), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /resume must be 10 mb or smaller/i
    );

    expect(screen.queryByText("large-resume.pdf")).not.toBeInTheDocument();
  });

  it("uploads the selected resume for the authenticated user", async () => {
    const user = userEvent.setup();
    const file = createPdfResume();

    uploadResumeMock.mockResolvedValue({
      id: "resume-123",
      user_id: "user-123",
      original_filename: file.name,
      mime_type: file.type,
      status: "uploaded",
    });

    mockAuthenticatedUser();
    renderDashboard();

    await user.upload(screen.getByLabelText(/resume file/i), file);

    await user.click(
      screen.getByRole("button", {
        name: /upload resume/i,
      })
    );

    expect(uploadResumeMock).toHaveBeenCalledOnce();

    expect(uploadResumeMock).toHaveBeenCalledWith({
      userId: "user-123",
      file,
    });

    expect(
      await screen.findByText(/resume uploaded successfully/i)
    ).toBeInTheDocument();
  });

  it("shows an uploading state while the resume upload is pending", async () => {
    const user = userEvent.setup();
    const file = createPdfResume();

    let resolveUpload;

    uploadResumeMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        })
    );

    mockAuthenticatedUser();
    renderDashboard();

    await user.upload(screen.getByLabelText(/resume file/i), file);

    await user.click(
      screen.getByRole("button", {
        name: /upload resume/i,
      })
    );

    expect(
      screen.getByRole("button", {
        name: /uploading/i,
      })
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: /choose a different resume/i,
      })
    ).toBeDisabled();

    expect(screen.getByLabelText(/resume file/i)).toBeDisabled();

    resolveUpload({
      id: "resume-123",
      status: "uploaded",
    });

    expect(
      await screen.findByText(/resume uploaded successfully/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /upload resume/i,
      })
    ).toBeEnabled();
  });

  it("shows an error when the resume upload fails", async () => {
    const user = userEvent.setup();
    const file = createPdfResume();

    uploadResumeMock.mockRejectedValue(new Error("Storage upload failed"));

    mockAuthenticatedUser();
    renderDashboard();

    await user.upload(screen.getByLabelText(/resume file/i), file);

    await user.click(
      screen.getByRole("button", {
        name: /upload resume/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /storage upload failed/i
    );

    expect(
      screen.queryByText(/resume uploaded successfully/i)
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /upload resume/i,
      })
    ).toBeEnabled();
  });

  it("shows the fallback error when the resume upload fails without a message", async () => {
    const user = userEvent.setup();
    const file = createPdfResume();

    uploadResumeMock.mockRejectedValue({});

    mockAuthenticatedUser();
    renderDashboard();

    await user.upload(screen.getByLabelText(/resume file/i), file);

    await user.click(
      screen.getByRole("button", {
        name: /upload resume/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to upload your resume\. please try again/i
    );
  });

  it("signs out and redirects to login", async () => {
    const user = userEvent.setup();
    const signOutMock = vi.fn().mockResolvedValue();

    mockAuthenticatedUser({
      signOut: signOutMock,
    });

    renderDashboard();

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

    renderDashboard();

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

    renderDashboard();

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
