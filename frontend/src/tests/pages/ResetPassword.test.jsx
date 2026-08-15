import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResetPassword from "../../pages/ResetPassword";

const {
  getSessionMock,
  onAuthStateChangeMock,
  updateUserMock,
  unsubscribeMock,
  useAuthMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  updateUserMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      updateUser: updateUserMock,
    },
  },
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: useAuthMock,
}));

function renderResetPassword() {
  render(
    <MemoryRouter initialEntries={["/reset-password"]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<h1>Profile destination</h1>} />
        <Route
          path="/forgot-password"
          element={<h1>Forgot password destination</h1>}
        />
      </Routes>
    </MemoryRouter>
  );
}

async function fillPasswords(
  user,
  { password = "NewSecure!123", confirmPassword = "NewSecure!123" } = {}
) {
  await user.type(screen.getByLabelText(/^new password$/i), password);

  await user.type(
    screen.getByLabelText(/confirm new password/i),
    confirmPassword
  );
}

function mockReadyRecoverySession() {
  getSessionMock.mockResolvedValue({
    data: {
      session: {
        user: {
          id: "user-123",
        },
      },
    },
  });
}

describe("ResetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthMock.mockReturnValue({
      hasResume: false,
    });

    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
    });

    onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    });

    updateUserMock.mockResolvedValue({
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the reset password page", () => {
    renderResetPassword();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /choose something new/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /update your password/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /update password/i,
      })
    ).toBeDisabled();
  });

  it("shows recovery guidance while no valid session exists", () => {
    renderResetPassword();

    expect(
      screen.getByText(/waiting for a valid recovery session/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: /request another reset email/i,
      })
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("enables password updates when an existing recovery session is present", async () => {
    mockReadyRecoverySession();

    renderResetPassword();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update password/i,
        })
      ).toBeEnabled();
    });

    expect(
      screen.queryByText(/waiting for a valid recovery session/i)
    ).not.toBeInTheDocument();
  });

  it("enables password updates when Supabase reports PASSWORD_RECOVERY", async () => {
    let authStateCallback;

    onAuthStateChangeMock.mockImplementation((callback) => {
      authStateCallback = callback;

      return {
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      };
    });

    renderResetPassword();

    expect(
      screen.getByRole("button", {
        name: /update password/i,
      })
    ).toBeDisabled();

    authStateCallback("PASSWORD_RECOVERY", {
      user: {
        id: "user-123",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update password/i,
        })
      ).toBeEnabled();
    });
  });

  it("enables password updates when Supabase reports any active session", async () => {
    let authStateCallback;

    onAuthStateChangeMock.mockImplementation((callback) => {
      authStateCallback = callback;

      return {
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      };
    });

    renderResetPassword();

    authStateCallback("SIGNED_IN", {
      user: {
        id: "user-123",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update password/i,
        })
      ).toBeEnabled();
    });
  });

  it("rejects passwords shorter than nine characters", async () => {
    const user = userEvent.setup();

    mockReadyRecoverySession();

    renderResetPassword();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update password/i,
        })
      ).toBeEnabled();
    });

    await fillPasswords(user, {
      password: "short",
      confirmPassword: "short",
    });

    await user.click(
      screen.getByRole("button", {
        name: /update password/i,
      })
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /password must be at least 9 characters long/i
    );

    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("rejects passwords that do not match", async () => {
    const user = userEvent.setup();

    mockReadyRecoverySession();

    renderResetPassword();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update password/i,
        })
      ).toBeEnabled();
    });

    await fillPasswords(user, {
      password: "NewSecure!123",
      confirmPassword: "Different!123",
    });

    await user.click(
      screen.getByRole("button", {
        name: /update password/i,
      })
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /passwords do not match/i
    );

    expect(updateUserMock).not.toHaveBeenCalled();
  });

  it("updates the password through Supabase", async () => {
    const user = userEvent.setup();

    mockReadyRecoverySession();

    renderResetPassword();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update password/i,
        })
      ).toBeEnabled();
    });

    await fillPasswords(user);

    await user.click(
      screen.getByRole("button", {
        name: /update password/i,
      })
    );

    await waitFor(() => {
      expect(updateUserMock).toHaveBeenCalledWith({
        password: "NewSecure!123",
      });
    });
  });

  it("shows Supabase password update errors", async () => {
    const user = userEvent.setup();

    mockReadyRecoverySession();

    updateUserMock.mockResolvedValue({
      error: {
        message: "Password update failed",
      },
    });

    renderResetPassword();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update password/i,
        })
      ).toBeEnabled();
    });

    await fillPasswords(user);

    await user.click(
      screen.getByRole("button", {
        name: /update password/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /password update failed/i
    );
  });

  it("shows the fallback error when Supabase returns an error without a message", async () => {
    const user = userEvent.setup();

    mockReadyRecoverySession();

    updateUserMock.mockResolvedValue({
      error: {},
    });

    renderResetPassword();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update password/i,
        })
      ).toBeEnabled();
    });

    await fillPasswords(user);

    await user.click(
      screen.getByRole("button", {
        name: /update password/i,
      })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to update your password\. please request a new reset link/i
    );
  });

  it("shows a confirmation after updating the password", async () => {
    const user = userEvent.setup();

    mockReadyRecoverySession();

    renderResetPassword();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update password/i,
        })
      ).toBeEnabled();
    });

    await fillPasswords(user);

    await user.click(
      screen.getByRole("button", {
        name: /update password/i,
      })
    );

    const success = await screen.findByRole("status");

    expect(success).toHaveTextContent(/password updated/i);
    expect(success).toHaveTextContent(/you're all set/i);

    expect(success).toHaveTextContent(
      /your password has been updated successfully/i
    );

    expect(success).toHaveTextContent(/taking you back to your profile/i);
  });

  it("replaces the password form with the success state", async () => {
    const user = userEvent.setup();

    mockReadyRecoverySession();

    renderResetPassword();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update password/i,
        })
      ).toBeEnabled();
    });

    await fillPasswords(user);

    await user.click(
      screen.getByRole("button", {
        name: /update password/i,
      })
    );

    await screen.findByRole("status");

    expect(screen.queryByLabelText(/^new password$/i)).not.toBeInTheDocument();

    expect(
      screen.queryByLabelText(/confirm new password/i)
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: /update password/i,
      })
    ).not.toBeInTheDocument();
  });

  it("redirects to profile after a successful password update", async () => {
    const user = userEvent.setup();

    mockReadyRecoverySession();

    renderResetPassword();

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update password/i,
        })
      ).toBeEnabled();
    });

    await fillPasswords(user);

    const originalSetTimeout = window.setTimeout;

    const setTimeoutSpy = vi
      .spyOn(window, "setTimeout")
      .mockImplementation((callback, delay, ...args) => {
        if (delay === 1600) {
          callback();
          return 1;
        }

        return originalSetTimeout(callback, delay, ...args);
      });

    await user.click(
      screen.getByRole("button", {
        name: /update password/i,
      })
    );

    expect(
      await screen.findByRole("heading", {
        name: /profile destination/i,
      })
    ).toBeInTheDocument();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1600);
  });

  it("unsubscribes from auth state changes when unmounted", async () => {
    const { unmount } = render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledOnce();
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledOnce();
  });
});
