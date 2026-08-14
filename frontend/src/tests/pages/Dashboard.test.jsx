import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Dashboard from "../../pages/Dashboard";

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: useAuthMock,
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

describe("Dashboard", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("renders the authenticated user's first name", () => {
    useAuthMock.mockReturnValue({
      profile: {
        first_name: "Ericka",
      },
      isProfileLoading: false,
      signOut: vi.fn(),
    });

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

  it("renders the resume upload placeholder", () => {
    useAuthMock.mockReturnValue({
      profile: {
        first_name: "Ericka",
      },
      isProfileLoading: false,
      signOut: vi.fn(),
    });

    renderDashboard();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /start with your current resume/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByText(/pdf or docx/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /choose resume/i,
      })
    ).toBeDisabled();
  });

  it("signs out and redirects to login", async () => {
    const user = userEvent.setup();
    const signOutMock = vi.fn().mockResolvedValue();

    useAuthMock.mockReturnValue({
      profile: {
        first_name: "Ericka",
      },
      isProfileLoading: false,
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

    useAuthMock.mockReturnValue({
      profile: {
        first_name: "Ericka",
      },
      isProfileLoading: false,
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

    useAuthMock.mockReturnValue({
      profile: {
        first_name: "Ericka",
      },
      isProfileLoading: false,
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
