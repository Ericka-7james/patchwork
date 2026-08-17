import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../../pages/Login";

const { signInMock, signInWithGoogleMock, useAuthMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  signInWithGoogleMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: signInMock,
    },
  },
}));

vi.mock("../../services/authService", () => ({
  signInWithGoogle: signInWithGoogleMock,
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: useAuthMock,
}));

function renderLogin() {
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<h1>Dashboard destination</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

async function fillLoginForm(
  user,
  { identifier = "user@example.com", password = "S3cure!Pass" } = {}
) {
  await user.type(screen.getByLabelText(/email or phone number/i), identifier);

  await user.type(screen.getByLabelText(/^password$/i), password);
}

describe("Login", () => {
  beforeEach(() => {
    signInMock.mockReset();
    signInWithGoogleMock.mockReset();
    useAuthMock.mockReset();

    useAuthMock.mockReturnValue({
      hasResume: false,
    });
  });

  it("renders the login page", () => {
    renderLogin();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /pick up where you left off/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /welcome back to patchwork/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/email or phone number/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /continue with google/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /sign in/i,
      })
    ).toBeInTheDocument();
  });

  it("renders signup and forgot password links", () => {
    renderLogin();

    expect(
      screen.getByRole("link", {
        name: /sign up/i,
      })
    ).toHaveAttribute("href", "/signup");

    expect(
      screen.getByRole("link", {
        name: /create an account/i,
      })
    ).toHaveAttribute("href", "/signup");

    expect(
      screen.getByRole("link", {
        name: /forgot password/i,
      })
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("renders the footer", () => {
    renderLogin();

    expect(
      screen.getByText(/© 2026 PatchWork · Ericka James/i)
    ).toBeInTheDocument();
  });

  it("starts Google sign in", async () => {
    const user = userEvent.setup();

    signInWithGoogleMock.mockResolvedValue({
      url: "https://accounts.google.com",
    });

    renderLogin();

    await user.click(
      screen.getByRole("button", {
        name: /continue with google/i,
      })
    );

    expect(signInWithGoogleMock).toHaveBeenCalledOnce();
  });

  it("shows Google sign in errors", async () => {
    const user = userEvent.setup();

    signInWithGoogleMock.mockRejectedValue(
      new Error("Unable to continue with Google.")
    );

    renderLogin();

    await user.click(
      screen.getByRole("button", {
        name: /continue with google/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to continue with google/i
    );
  });

  it("signs in with a normalized email address", async () => {
    const user = userEvent.setup();

    signInMock.mockResolvedValue({
      error: null,
    });

    renderLogin();

    await fillLoginForm(user, {
      identifier: "  USER@example.com  ",
    });

    await user.click(
      screen.getByRole("button", {
        name: /sign in/i,
      })
    );

    expect(signInMock).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "S3cure!Pass",
    });
  });

  it("signs in with a phone number", async () => {
    const user = userEvent.setup();

    signInMock.mockResolvedValue({
      error: null,
    });

    renderLogin();

    await fillLoginForm(user, {
      identifier: "+15551234567",
    });

    await user.click(
      screen.getByRole("button", {
        name: /sign in/i,
      })
    );

    expect(signInMock).toHaveBeenCalledWith({
      phone: "+15551234567",
      password: "S3cure!Pass",
    });
  });

  it("redirects to the dashboard after successful login", async () => {
    const user = userEvent.setup();

    signInMock.mockResolvedValue({
      error: null,
    });

    renderLogin();

    await fillLoginForm(user);

    await user.click(
      screen.getByRole("button", {
        name: /sign in/i,
      })
    );

    expect(
      await screen.findByRole("heading", {
        name: /dashboard destination/i,
      })
    ).toBeInTheDocument();
  });

  it("shows Supabase login errors", async () => {
    const user = userEvent.setup();

    signInMock.mockResolvedValue({
      error: {
        message: "Invalid login credentials",
      },
    });

    renderLogin();

    await fillLoginForm(user, {
      password: "WrongPassword123!",
    });

    await user.click(
      screen.getByRole("button", {
        name: /sign in/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid login credentials/i
    );
  });

  it("does not redirect after a failed login", async () => {
    const user = userEvent.setup();

    signInMock.mockResolvedValue({
      error: {
        message: "Invalid login credentials",
      },
    });

    renderLogin();

    await fillLoginForm(user);

    await user.click(
      screen.getByRole("button", {
        name: /sign in/i,
      })
    );

    expect(
      await screen.findByText(/invalid login credentials/i)
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: /dashboard destination/i,
      })
    ).not.toBeInTheDocument();
  });
});
