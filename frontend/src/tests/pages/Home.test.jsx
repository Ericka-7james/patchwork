import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../../pages/Home";

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({
    hasResume: false,
  }),
}));

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

    expect(screen.getByRole("link", { name: "PatchWork" })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("renders the main hero content", () => {
    renderHome();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /build a stronger resume without making anything up/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /patchwork helps turn the work you have actually done into clear, polished resume language/i
      )
    ).toBeInTheDocument();
  });

  it("renders the primary call to action", () => {
    renderHome();

    expect(
      screen.getByRole("link", { name: /build my resume/i })
    ).toHaveAttribute("href", "/signup");
  });

  it("renders signup and login navigation", () => {
    renderHome();

    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/signup"
    );

    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("renders the resume visual badge", () => {
    renderHome();

    expect(
      screen.getByText(/clearer\. stronger\. still yours\./i)
    ).toBeInTheDocument();
  });

  it("renders the footer", () => {
    renderHome();

    expect(
      screen.getByText(/© 2026 PatchWork · Ericka James/i)
    ).toBeInTheDocument();
  });
});
