import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

const {
  getSessionMock,
  onAuthStateChangeMock,
  signOutMock,
  fromMock,
  unsubscribeMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  signOutMock: vi.fn(),
  fromMock: vi.fn(),
  unsubscribeMock: vi.fn(),
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

    const singleMock = vi.fn().mockResolvedValue({
      data: {
        id: "user-123",
        username: "patchuser",
      },
      error: null,
    });

    const eqMock = vi.fn().mockReturnValue({
      single: singleMock,
    });

    const selectMock = vi.fn().mockReturnValue({
      eq: eqMock,
    });

    fromMock.mockReturnValue({
      select: selectMock,
    });

    window.history.pushState({}, "", "/dashboard");

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: /welcome, patchuser/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/signed in as patchuser/i)
    ).toBeInTheDocument();

    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(selectMock).toHaveBeenCalledWith("id, username");
    expect(eqMock).toHaveBeenCalledWith("id", "user-123");
  });
});
