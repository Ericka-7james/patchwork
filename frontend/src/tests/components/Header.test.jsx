import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Header from "../../components/Header";

function renderHeader(headerProps = {}) {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Header {...headerProps} />} />
        <Route path="/signup" element={<h1>Signup destination</h1>} />
        <Route path="/login" element={<h1>Login destination</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Header", () => {
  it("renders the PatchWork brand", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: /patchwork/i })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("renders signup and login navigation for the home variant", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/signup"
    );

    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("renders authentication navigation", () => {
    renderHeader({
      variant: "auth",
      showLogin: true,
      showSignup: true,
    });

    expect(
      screen.getByRole("button", {
        name: /back/i,
      })
    ).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login"
    );

    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/signup"
    );
  });

  it("renders the first name for the app variant", () => {
    renderHeader({
      variant: "app",
      firstName: "Ericka",
      onLogout: vi.fn(),
    });

    expect(screen.getByText("Ericka")).toBeInTheDocument();

    expect(screen.getByLabelText(/signed in as ericka/i)).toBeInTheDocument();
  });

  it("preserves long first names for CSS truncation", () => {
    renderHeader({
      variant: "app",
      firstName: "Alexandria",
      onLogout: vi.fn(),
    });

    const userName = screen.getByLabelText(/signed in as alexandria/i);

    expect(userName).toHaveTextContent("Alexandria");
    expect(userName).toHaveAttribute("title", "Alexandria");
    expect(userName).toHaveClass("app-user-name");
  });

  it("calls the logout handler", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    renderHeader({
      variant: "app",
      firstName: "Ericka",
      onLogout,
    });

    await user.click(
      screen.getByRole("button", {
        name: /log out/i,
      })
    );

    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("shows the logging out state", () => {
    renderHeader({
      variant: "app",
      firstName: "Ericka",
      onLogout: vi.fn(),
      isLoggingOut: true,
    });

    expect(
      screen.getByRole("button", {
        name: /logging out/i,
      })
    ).toBeDisabled();
  });
});
