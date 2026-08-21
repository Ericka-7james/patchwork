import { act, render, screen } from "@testing-library/react";

import { afterEach, describe, expect, it, vi } from "vitest";

import LoadingOverlay from "../../../components/common/LoadingOverlay";

describe("LoadingOverlay", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render when loading is false", () => {
    render(<LoadingOverlay isLoading={false} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("waits before showing the loading overlay", () => {
    vi.useFakeTimers();

    render(<LoadingOverlay isLoading message="Saving your changes..." />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.getByRole("status")).toBeInTheDocument();

    expect(screen.getByText("Saving your changes...")).toBeInTheDocument();
  });

  it("shows immediately when delay is zero", () => {
    render(
      <LoadingOverlay isLoading delay={0} message="Building your resume..." />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();

    expect(screen.getByText("Building your resume...")).toBeInTheDocument();
  });

  it("uses the default loading message", () => {
    render(<LoadingOverlay isLoading delay={0} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders the PatchWork logo", () => {
    render(<LoadingOverlay isLoading delay={0} />);

    const logo = document.querySelector(".loading-overlay-logo");

    expect(logo).toBeInTheDocument();

    expect(logo).toHaveAttribute("src", "/PatchWorkLogo.png");

    expect(logo).toHaveAttribute("alt", "");
  });

  it("supports full screen loading", () => {
    render(<LoadingOverlay isLoading delay={0} fullScreen />);

    expect(screen.getByRole("status")).toHaveClass(
      "loading-overlay-fullscreen"
    );
  });

  it("clears the pending timer when loading stops", () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <LoadingOverlay isLoading message="Loading profile..." />
    );

    rerender(<LoadingOverlay isLoading={false} message="Loading profile..." />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
