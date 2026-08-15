import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ForgotPassword from "../../pages/ForgotPassword";

const { resetPasswordForEmailMock, useAuthMock } = vi.hoisted(() => ({
  resetPasswordForEmailMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: resetPasswordForEmailMock,
    },
  },
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: useAuthMock,
}));

function renderForgotPassword() {
  render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/login" element={<h1>Login destination</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ForgotPassword", () => {
  beforeEach(() => {
    resetPasswordForEmailMock.mockReset();
    useAuthMock.mockReset();

    useAuthMock.mockReturnValue({
      hasResume: false,
    });

    resetPasswordForEmailMock.mockResolvedValue({
      error: null,
    });
  });

  it("renders the forgot password page", () => {
    renderForgotPassword();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /let's get you back in/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /reset your password/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    ).toBeInTheDocument();
  });

  it("renders the link back to sign in", () => {
    renderForgotPassword();

    expect(
      screen.getByRole("link", {
        name: /back to sign in/i,
      })
    ).toHaveAttribute("href", "/login");
  });

  it("navigates back to sign in", async () => {
    const user = userEvent.setup();

    renderForgotPassword();

    await user.click(
      screen.getByRole("link", {
        name: /back to sign in/i,
      })
    );

    expect(
      await screen.findByRole("heading", {
        name: /login destination/i,
      })
    ).toBeInTheDocument();
  });

  it("normalizes the email before requesting a password reset", async () => {
    const user = userEvent.setup();

    renderForgotPassword();

    await user.type(
      screen.getByLabelText(/email address/i),
      "  USER@Example.COM  "
    );

    await user.click(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    );

    expect(resetPasswordForEmailMock).toHaveBeenCalledOnce();

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith("user@example.com", {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  });

  it("shows a sending state while the reset request is pending", async () => {
    const user = userEvent.setup();

    let resolveRequest;

    resetPasswordForEmailMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    renderForgotPassword();

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@example.com"
    );

    await user.click(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    );

    expect(
      screen.getByRole("button", {
        name: /sending reset link/i,
      })
    ).toBeDisabled();

    resolveRequest({
      error: null,
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      /password reset link has been sent/i
    );
  });

  it("shows a success message after requesting a password reset", async () => {
    const user = userEvent.setup();

    renderForgotPassword();

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@example.com"
    );

    await user.click(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      /if an account exists for that email, a password reset link has been sent/i
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows Supabase password reset errors", async () => {
    const user = userEvent.setup();

    resetPasswordForEmailMock.mockResolvedValue({
      error: {
        message: "Unable to send recovery email",
      },
    });

    renderForgotPassword();

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@example.com"
    );

    await user.click(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to send recovery email/i
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the fallback error when Supabase returns no message", async () => {
    const user = userEvent.setup();

    resetPasswordForEmailMock.mockResolvedValue({
      error: {},
    });

    renderForgotPassword();

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@example.com"
    );

    await user.click(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to send the password reset email\. please try again/i
    );
  });

  it("re-enables the submit button after a failed reset request", async () => {
    const user = userEvent.setup();

    resetPasswordForEmailMock.mockResolvedValue({
      error: {
        message: "Request failed",
      },
    });

    renderForgotPassword();

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@example.com"
    );

    await user.click(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    );

    await screen.findByRole("alert");

    expect(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    ).toBeEnabled();
  });

  it("clears a previous error before a successful retry", async () => {
    const user = userEvent.setup();

    resetPasswordForEmailMock
      .mockResolvedValueOnce({
        error: {
          message: "Temporary reset failure",
        },
      })
      .mockResolvedValueOnce({
        error: null,
      });

    renderForgotPassword();

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@example.com"
    );

    await user.click(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /temporary reset failure/i
    );

    await user.click(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      /password reset link has been sent/i
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears a previous success message before a failed retry", async () => {
    const user = userEvent.setup();

    resetPasswordForEmailMock
      .mockResolvedValueOnce({
        error: null,
      })
      .mockResolvedValueOnce({
        error: {
          message: "Second request failed",
        },
      });

    renderForgotPassword();

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@example.com"
    );

    await user.click(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    );

    expect(await screen.findByRole("status")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /send reset link/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /second request failed/i
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
