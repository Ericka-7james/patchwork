import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../../pages/Home";

function renderHome() {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
}

describe("Home", () => {
  it("renders the PatchWork brand", () => {
    renderHome();

    expect(screen.getByRole("link", { name: "PatchWork" })).toBeInTheDocument();
  });

  it("renders the main hero heading", () => {
    renderHome();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /build a stronger resume without making anything up/i,
      })
    ).toBeInTheDocument();
  });

  it("renders the product description", () => {
    renderHome();

    expect(
      screen.getByText(
        /patchwork helps turn the work you have actually done into clear, polished resume language/i
      )
    ).toBeInTheDocument();
  });

  it("renders the build my resume call to action", () => {
    renderHome();

    const cta = screen.getByRole("link", {
      name: /build my resume/i,
    });

    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/signup");
  });

  it("renders the signup navigation link", () => {
    renderHome();

    const signupLink = screen.getByRole("link", {
      name: /sign up/i,
    });

    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute("href", "/signup");
  });

  it("renders the login navigation link", () => {
    renderHome();

    const loginLink = screen.getByRole("link", {
      name: /log in/i,
    });

    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("renders the resume visual badge text", () => {
    renderHome();

    expect(
      screen.getByText(/clearer\. stronger\. still yours\./i)
    ).toBeInTheDocument();
  });

  it("renders the footer copyright", () => {
    renderHome();

    expect(
      screen.getByText(/© 2026 PatchWork · Ericka James/i)
    ).toBeInTheDocument();
  });
});
