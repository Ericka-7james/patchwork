import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../../components/ProtectedRoute";

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}));

vi.mock("../../context/useAuth", () => ({
  useAuth: useAuthMock,
}));

function renderProtectedRoute() {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<h1>Protected dashboard</h1>} />
        </Route>

        <Route path="/login" element={<h1>Login page</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("shows a loading message while authentication is loading", () => {
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: true,
    });

    renderProtectedRoute();

    expect(
      screen.getByText(/loading your patchwork account/i)
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: /protected dashboard/i,
      })
    ).not.toBeInTheDocument();
  });

  it("redirects logged-out users to login", async () => {
    useAuthMock.mockReturnValue({
      user: null,
      isLoading: false,
    });

    renderProtectedRoute();

    expect(
      await screen.findByRole("heading", {
        name: /login page/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: /protected dashboard/i,
      })
    ).not.toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    useAuthMock.mockReturnValue({
      user: {
        id: "user-123",
      },
      isLoading: false,
    });

    renderProtectedRoute();

    expect(
      screen.getByRole("heading", {
        name: /protected dashboard/i,
      })
    ).toBeInTheDocument();
  });
});
