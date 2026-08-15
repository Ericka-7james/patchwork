import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "../../context/AuthContext";
import { useAuth } from "../../context/useAuth";

const {
  getSessionMock,
  onAuthStateChangeMock,
  signOutMock,
  fromMock,
  unsubscribeMock,
  profileSingleMock,
  resumeMaybeSingleMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signOutMock: vi.fn(),
  fromMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  profileSingleMock: vi.fn(),
  resumeMaybeSingleMock: vi.fn(),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signOut: signOutMock,
    },
    from: fromMock,
  },
}));

function AuthConsumer() {
  const {
    user,
    profile,
    hasResume,
    isLoading,
    isProfileLoading,
    isResumeStateLoading,
    refreshResumeState,
    signOut,
  } = useAuth();

  return (
    <div>
      <span data-testid="auth-loading">{String(isLoading)}</span>
      <span data-testid="profile-loading">{String(isProfileLoading)}</span>
      <span data-testid="resume-loading">{String(isResumeStateLoading)}</span>

      <span data-testid="user-id">{user?.id ?? "no-user"}</span>

      <span data-testid="first-name">
        {profile?.first_name ?? "no-profile"}
      </span>

      <span data-testid="has-resume">{String(hasResume)}</span>

      <button type="button" onClick={refreshResumeState}>
        Refresh resume
      </button>

      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    onAuthStateChangeMock.mockReset();
    signOutMock.mockReset();
    fromMock.mockReset();
    unsubscribeMock.mockReset();
    profileSingleMock.mockReset();
    resumeMaybeSingleMock.mockReset();

    onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    });

    profileSingleMock.mockResolvedValue({
      data: {
        id: "user-123",
        username: "patchuser",
        first_name: "Ericka",
      },
      error: null,
    });

    resumeMaybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });

    fromMock.mockImplementation((table) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: profileSingleMock,
            })),
          })),
        };
      }

      if (table === "resumes") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: resumeMaybeSingleMock,
            })),
          })),
        };
      }

      throw new Error(`Unexpected Supabase table: ${table}`);
    });
  });

  it("loads a logged-out session", async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });

    renderProvider();

    expect(screen.getByTestId("auth-loading")).toHaveTextContent("true");

    await waitFor(() => {
      expect(screen.getByTestId("auth-loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("user-id")).toHaveTextContent("no-user");
    expect(screen.getByTestId("first-name")).toHaveTextContent("no-profile");
    expect(screen.getByTestId("has-resume")).toHaveTextContent("false");

    expect(fromMock).not.toHaveBeenCalled();
  });

  it("loads the authenticated user profile", async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-123",
          },
        },
      },
      error: null,
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("first-name")).toHaveTextContent("Ericka");
    });

    expect(screen.getByTestId("user-id")).toHaveTextContent("user-123");

    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(profileSingleMock).toHaveBeenCalledOnce();
  });

  it("loads resume state for the authenticated user", async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-123",
          },
        },
      },
      error: null,
    });

    resumeMaybeSingleMock.mockResolvedValue({
      data: {
        id: "resume-123",
      },
      error: null,
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("has-resume")).toHaveTextContent("true");
    });

    expect(fromMock).toHaveBeenCalledWith("resumes");
    expect(resumeMaybeSingleMock).toHaveBeenCalledOnce();
  });

  it("reports no resume when the authenticated user has none", async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-123",
          },
        },
      },
      error: null,
    });

    resumeMaybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("resume-loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("has-resume")).toHaveTextContent("false");
  });

  it("refreshes resume state on demand", async () => {
    const user = userEvent.setup();

    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-123",
          },
        },
      },
      error: null,
    });

    resumeMaybeSingleMock
      .mockResolvedValueOnce({
        data: null,
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "resume-123",
        },
        error: null,
      });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("has-resume")).toHaveTextContent("false");
    });

    await user.click(
      screen.getByRole("button", {
        name: /refresh resume/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId("has-resume")).toHaveTextContent("true");
    });

    expect(resumeMaybeSingleMock).toHaveBeenCalledTimes(2);
  });

  it("updates the session when Supabase reports an auth change", async () => {
    let authStateCallback;

    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });

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

    profileSingleMock.mockResolvedValue({
      data: {
        id: "user-456",
        username: "newuser",
        first_name: "Jordan",
      },
      error: null,
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-loading")).toHaveTextContent("false");
    });

    authStateCallback("SIGNED_IN", {
      user: {
        id: "user-456",
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-id")).toHaveTextContent("user-456");
    });

    await waitFor(() => {
      expect(screen.getByTestId("first-name")).toHaveTextContent("Jordan");
    });
  });

  it("clears the user when Supabase reports sign out", async () => {
    let authStateCallback;

    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-123",
          },
        },
      },
      error: null,
    });

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

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("first-name")).toHaveTextContent("Ericka");
    });

    authStateCallback("SIGNED_OUT", null);

    await waitFor(() => {
      expect(screen.getByTestId("user-id")).toHaveTextContent("no-user");
    });

    expect(screen.getByTestId("first-name")).toHaveTextContent("no-profile");
    expect(screen.getByTestId("has-resume")).toHaveTextContent("false");
  });

  it("calls Supabase sign out", async () => {
    const user = userEvent.setup();

    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });

    signOutMock.mockResolvedValue({
      error: null,
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-loading")).toHaveTextContent("false");
    });

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(signOutMock).toHaveBeenCalledOnce();
  });

  it("throws when Supabase sign out fails", async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });

    const signOutError = new Error("Unable to sign out");

    signOutMock.mockResolvedValue({
      error: signOutError,
    });

    function SignOutErrorConsumer() {
      const { signOut } = useAuth();

      async function handleSignOut() {
        try {
          await signOut();
        } catch (error) {
          document.body.dataset.signOutError = error.message;
        }
      }

      return (
        <button type="button" onClick={handleSignOut}>
          Sign out
        </button>
      );
    }

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <SignOutErrorConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    await waitFor(() => {
      expect(document.body.dataset.signOutError).toBe("Unable to sign out");
    });

    delete document.body.dataset.signOutError;
  });

  it("unsubscribes from auth changes when unmounted", async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });

    const { unmount } = renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-loading")).toHaveTextContent("false");
    });

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledOnce();
  });
});
