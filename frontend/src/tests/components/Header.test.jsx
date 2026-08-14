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
        <Route path="/profile" element={<h1>Profile destination</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Header", () => {
  it("renders the PatchWork brand", () => {
    renderHeader();

    expect(
      screen.getByRole("link", {
        name: /patchwork/i,
      })
    ).toHaveAttribute("href", "/");
  });

  it("renders signup and login navigation for the home variant", () => {
    renderHeader();

    expect(
      screen.getByRole("link", {
        name: /sign up/i,
      })
    ).toHaveAttribute("href", "/signup");

    expect(
      screen.getByRole("link", {
        name: /log in/i,
      })
    ).toHaveAttribute("href", "/login");
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

    expect(
      screen.getByRole("link", {
        name: /log in/i,
      })
    ).toHaveAttribute("href", "/login");

    expect(
      screen.getByRole("link", {
        name: /sign up/i,
      })
    ).toHaveAttribute("href", "/signup");
  });

  it("renders the first name as an account menu trigger for the app variant", () => {
    renderHeader({
      variant: "app",
      firstName: "Ericka",
      onLogout: vi.fn(),
    });

    const userMenuButton = screen.getByRole("button", {
      name: /signed in as ericka/i,
    });

    expect(userMenuButton).toBeInTheDocument();
    expect(userMenuButton).toHaveTextContent("Ericka");
    expect(userMenuButton).toHaveAttribute("aria-expanded", "false");
    expect(userMenuButton).toHaveAttribute("aria-haspopup", "menu");
  });

  it("preserves long first names for CSS truncation", () => {
    renderHeader({
      variant: "app",
      firstName: "Alexandria",
      onLogout: vi.fn(),
    });

    const userName = screen.getByRole("button", {
      name: /signed in as alexandria/i,
    });

    expect(userName).toHaveTextContent("Alexandria");
    expect(userName).toHaveAttribute("title", "Alexandria");
    expect(userName).toHaveClass("app-user-name");
  });

  it("does not show the account menu before the user's name is clicked", () => {
    renderHeader({
      variant: "app",
      firstName: "Ericka",
      onLogout: vi.fn(),
    });

    expect(
      screen.queryByRole("menu", {
        name: /ericka account menu/i,
      })
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("menuitem", {
        name: /profile/i,
      })
    ).not.toBeInTheDocument();
  });

  it("opens the account menu when the user's name is clicked", async () => {
    const user = userEvent.setup();

    renderHeader({
      variant: "app",
      firstName: "Ericka",
      onLogout: vi.fn(),
    });

    const userMenuButton = screen.getByRole("button", {
      name: /signed in as ericka/i,
    });

    await user.click(userMenuButton);

    expect(userMenuButton).toHaveAttribute("aria-expanded", "true");

    expect(
      screen.getByRole("menu", {
        name: /ericka account menu/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("menuitem", {
        name: /profile/i,
      })
    ).toHaveAttribute("href", "/profile");
  });

  it("closes the account menu when the user's name is clicked again", async () => {
    const user = userEvent.setup();

    renderHeader({
      variant: "app",
      firstName: "Ericka",
      onLogout: vi.fn(),
    });

    const userMenuButton = screen.getByRole("button", {
      name: /signed in as ericka/i,
    });

    await user.click(userMenuButton);

    expect(
      screen.getByRole("menuitem", {
        name: /profile/i,
      })
    ).toBeInTheDocument();

    await user.click(userMenuButton);

    expect(userMenuButton).toHaveAttribute("aria-expanded", "false");

    expect(
      screen.queryByRole("menuitem", {
        name: /profile/i,
      })
    ).not.toBeInTheDocument();
  });

  it("navigates to the profile page from the account menu", async () => {
    const user = userEvent.setup();

    renderHeader({
      variant: "app",
      firstName: "Ericka",
      onLogout: vi.fn(),
    });

    await user.click(
      screen.getByRole("button", {
        name: /signed in as ericka/i,
      })
    );

    await user.click(
      screen.getByRole("menuitem", {
        name: /profile/i,
      })
    );

    expect(
      await screen.findByRole("heading", {
        name: /profile destination/i,
      })
    ).toBeInTheDocument();
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
