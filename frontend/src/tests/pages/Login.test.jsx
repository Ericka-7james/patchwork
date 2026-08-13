import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Login from "../../pages/Login";

const { signInMock } = vi.hoisted(() => ({
  signInMock: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: signInMock,
    },
  },
}));

function renderLogin() {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe("Login", () => {
  beforeEach(() => {
    signInMock.mockReset();
  });

  it("renders the login form", () => {
    renderLogin();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /welcome back to patchwork/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/email or phone number/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^password$/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it("renders signup and forgot password links", () => {
    renderLogin();

    expect(
      screen.getByRole("link", { name: /sign up/i })
    ).toHaveAttribute("href", "/signup");

    expect(
      screen.getByRole("link", { name: /create an account/i })
    ).toHaveAttribute("href", "/signup");

    expect(
      screen.getByRole("link", { name: /forgot password/i })
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("renders the footer", () => {
    renderLogin();

    expect(
      screen.getByText(/© 2026 PatchWork · Ericka James/i)
    ).toBeInTheDocument();
  });

  it("signs in with a normalized email address", async () => {
    const user = userEvent.setup();

    signInMock.mockResolvedValue({
      error: null,
    });

    renderLogin();

    await user.type(
      screen.getByLabelText(/email or phone number/i),
      "  USER@example.com  "
    );

    await user.type(
      screen.getByLabelText(/^password$/i),
      "S3cure!Pass"
    );

    await user.click(
      screen.getByRole("button", { name: /sign in/i })
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

    await user.type(
      screen.getByLabelText(/email or phone number/i),
      "+15551234567"
    );

    await user.type(
      screen.getByLabelText(/^password$/i),
      "S3cure!Pass"
    );

    await user.click(
      screen.getByRole("button", { name: /sign in/i })
    );

    expect(signInMock).toHaveBeenCalledWith({
      phone: "+15551234567",
      password: "S3cure!Pass",
    });
  });

  it("shows a success message after login", async () => {
    const user = userEvent.setup();

    signInMock.mockResolvedValue({
      error: null,
    });

    renderLogin();

    await user.type(
      screen.getByLabelText(/email or phone number/i),
      "user@example.com"
    );

    await user.type(
      screen.getByLabelText(/^password$/i),
      "S3cure!Pass"
    );

    await user.click(
      screen.getByRole("button", { name: /sign in/i })
    );

    expect(
      await screen.findByText(/signed in successfully/i)
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

    await user.type(
      screen.getByLabelText(/email or phone number/i),
      "user@example.com"
    );

    await user.type(
      screen.getByLabelText(/^password$/i),
      "WrongPassword123!"
    );

    await user.click(
      screen.getByRole("button", { name: /sign in/i })
    );

    expect(
      await screen.findByText(/invalid login credentials/i)
    ).toBeInTheDocument();
  });
});