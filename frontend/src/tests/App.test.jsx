import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

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

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
      signOut: signOutMock,
    },
    from: fromMock,
  },
}));

describe("App routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.history.pushState({}, "", "/");

    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });

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

  it("redirects logged-out visitors away from the dashboard", async () => {
    window.history.pushState({}, "", "/dashboard");

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /welcome back to patchwork/i,
      })
    ).toBeInTheDocument();
  });

  it("renders the dashboard for an authenticated user", async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-123",
            email: "user@example.com",
          },
        },
      },
      error: null,
    });

    window.history.pushState({}, "", "/dashboard");

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: /welcome, ericka/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/signed in as ericka/i)).toBeInTheDocument();

    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(fromMock).toHaveBeenCalledWith("resumes");

    expect(profileSingleMock).toHaveBeenCalledOnce();
    expect(resumeMaybeSingleMock).toHaveBeenCalledOnce();
  });
});
