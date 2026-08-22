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
  profileSelectMock,
  profileEqMock,
  profileSingleMock,
  resumeSelectMock,
  resumeEqMock,
  resumeMaybeSingleMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signOutMock: vi.fn(),

  fromMock: vi.fn(),
  unsubscribeMock: vi.fn(),

  profileSelectMock: vi.fn(),
  profileEqMock: vi.fn(),
  profileSingleMock: vi.fn(),

  resumeSelectMock: vi.fn(),
  resumeEqMock: vi.fn(),
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

function createProfile(overrides = {}) {
  return {
    id: "user-123",
    username: "patchuser",
    first_name: "Ericka",
    last_name: "James",
    phone: "4045551111",
    resume_email: "resume@example.com",
    resume_phone: "4045551111",
    location: "Atlanta, GA",
    address: "",
    linkedin: "linkedin.com/in/patchuser",
    github: "github.com/patchuser",
    website: "",
    portfolio: "",
    contact_other: ["U.S. Citizen"],
    contact_initialized: true,
    ...overrides,
  };
}

function AuthConsumer() {
  const {
    user,
    profile,
    hasResume,
    isLoading,
    isProfileLoading,
    isResumeStateLoading,
    refreshProfile,
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

      <span data-testid="resume-email">
        {profile?.resume_email ?? "no-resume-email"}
      </span>

      <span data-testid="location">{profile?.location ?? "no-location"}</span>

      <span data-testid="has-resume">{String(hasResume)}</span>

      <button type="button" onClick={refreshProfile}>
        Refresh profile
      </button>

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

    profileSelectMock.mockReset();
    profileEqMock.mockReset();
    profileSingleMock.mockReset();

    resumeSelectMock.mockReset();
    resumeEqMock.mockReset();
    resumeMaybeSingleMock.mockReset();

    onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    });

    profileSingleMock.mockResolvedValue({
      data: createProfile(),
      error: null,
    });

    resumeMaybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });

    profileSelectMock.mockReturnValue({
      eq: profileEqMock,
    });

    profileEqMock.mockReturnValue({
      single: profileSingleMock,
    });

    resumeSelectMock.mockReturnValue({
      eq: resumeEqMock,
    });

    resumeEqMock.mockReturnValue({
      maybeSingle: resumeMaybeSingleMock,
    });

    fromMock.mockImplementation((table) => {
      if (table === "profiles") {
        return {
          select: profileSelectMock,
        };
      }

      if (table === "resumes") {
        return {
          select: resumeSelectMock,
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

  it("loads the authenticated user's full profile", async () => {
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

    expect(screen.getByTestId("resume-email")).toHaveTextContent(
      "resume@example.com"
    );

    expect(screen.getByTestId("location")).toHaveTextContent("Atlanta, GA");

    expect(fromMock).toHaveBeenCalledWith("profiles");

    expect(profileSelectMock).toHaveBeenCalledWith(
      expect.stringContaining("resume_email")
    );

    expect(profileSelectMock).toHaveBeenCalledWith(
      expect.stringContaining("resume_phone")
    );

    expect(profileSelectMock).toHaveBeenCalledWith(
      expect.stringContaining("contact_initialized")
    );

    expect(profileEqMock).toHaveBeenCalledWith("id", "user-123");

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

    expect(resumeEqMock).toHaveBeenCalledWith("user_id", "user-123");
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

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("resume-loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("has-resume")).toHaveTextContent("false");
  });

  it("refreshes the profile on demand", async () => {
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

    profileSingleMock
      .mockResolvedValueOnce({
        data: createProfile({
          location: "Atlanta, GA",
        }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: createProfile({
          location: "Huntsville, AL",
        }),
        error: null,
      });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("Atlanta, GA");
    });

    await user.click(
      screen.getByRole("button", {
        name: /refresh profile/i,
      })
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(
        "Huntsville, AL"
      );
    });

    expect(profileSingleMock).toHaveBeenCalledTimes(2);
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

  it("handles profile lookup errors", async () => {
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

    profileSingleMock.mockResolvedValue({
      data: null,
      error: {
        message: "Profile lookup failed",
        code: "TEST",
      },
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("profile-loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("first-name")).toHaveTextContent("no-profile");
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
      data: createProfile({
        id: "user-456",
        username: "newuser",
        first_name: "Jordan",
      }),
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

    await user.click(
      screen.getByRole("button", {
        name: /sign out/i,
      })
    );

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

    await user.click(
      screen.getByRole("button", {
        name: /sign out/i,
      })
    );

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
