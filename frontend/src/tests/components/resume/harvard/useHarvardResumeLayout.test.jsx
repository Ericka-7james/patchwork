import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useMemo, useRef } from "react";
import { useHarvardResumeLayout } from "../../../../components/resume/harvard/useHarvardResumeLayout";

const EMPTY_ARRAY = Object.freeze([]);

function createRect(height = 0) {
  return {
    height,
    width: 0,
    top: 0,
    right: 0,
    bottom: height,
    left: 0,
    x: 0,
    y: 0,
    toJSON: () => {},
  };
}

function LayoutHarness({
  blocks = EMPTY_ARRAY,
  skills = EMPTY_ARRAY,
  projects = EMPTY_ARRAY,
  experienceLimits = EMPTY_ARRAY,
  minimumExperienceLimits = EMPTY_ARRAY,
  onFitChange,
}) {
  const documentRef = useRef(null);

  const sourceSignature = useMemo(
    () =>
      JSON.stringify({
        skills,
        projects,
        experienceLimits,
      }),
    [experienceLimits, projects, skills]
  );

  const { fitState, fitLevel } = useHarvardResumeLayout({
    documentRef,
    blocks,
    sourceSignature,
    skillEntries: skills,
    projects,
    initialExperienceBulletLimits: experienceLimits,
    minimumExperienceBulletLimits: minimumExperienceLimits,
    onFitChange,
  });

  return (
    <article
      ref={documentRef}
      data-testid="layout"
      data-fit={fitLevel}
      data-density={fitState.density}
    >
      <section className="harvard-resume-page">
        <div className="harvard-resume-measurement">
          {blocks.map((block) => (
            <div key={block.key} data-resume-block-key={block.key} />
          ))}
        </div>
      </section>

      <span data-testid="settled">{String(fitState.settled)}</span>

      <span data-testid="page-count">{fitState.pageKeys.length}</span>

      <span data-testid="skill-limit">{fitState.skillCategoryLimit}</span>

      <span data-testid="project-limit">{fitState.projectLimit}</span>
    </article>
  );
}

describe("useHarvardResumeLayout", () => {
  const originalClientHeight = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "clientHeight"
  );

  const originalRect = HTMLElement.prototype.getBoundingClientRect;

  const originalComputedStyle = window.getComputedStyle;

  afterEach(() => {
    if (originalClientHeight) {
      Object.defineProperty(
        HTMLElement.prototype,
        "clientHeight",
        originalClientHeight
      );
    } else {
      delete HTMLElement.prototype.clientHeight;
    }

    HTMLElement.prototype.getBoundingClientRect = originalRect;

    window.getComputedStyle = originalComputedStyle;

    vi.restoreAllMocks();
  });

  function mockLayout({ pageHeight = 1000, padding = 100, heights = {} } = {}) {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,

      get() {
        if (this.classList?.contains("harvard-resume-page")) {
          return pageHeight;
        }

        return 0;
      },
    });

    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
      const styles = originalComputedStyle.call(window, element);

      if (element.classList?.contains("harvard-resume-page")) {
        Object.defineProperty(styles, "paddingTop", {
          configurable: true,
          value: `${padding}px`,
        });

        Object.defineProperty(styles, "paddingBottom", {
          configurable: true,
          value: `${padding}px`,
        });
      }

      return styles;
    });

    HTMLElement.prototype.getBoundingClientRect = vi.fn(function () {
      const key = this.dataset?.resumeBlockKey;

      if (!key) {
        return createRect();
      }

      return createRect(heights[key] ?? 0);
    });
  }

  it("does not settle when page height cannot be measured", () => {
    const blocks = [
      {
        key: "header",
      },
    ];

    render(<LayoutHarness blocks={blocks} />);

    expect(screen.getByTestId("settled")).toHaveTextContent("false");
  });

  it("settles a one-page resume", async () => {
    mockLayout({
      heights: {
        header: 300,
        summary: 200,
      },
    });

    const blocks = [
      {
        key: "header",
      },
      {
        key: "summary",
      },
    ];

    const onFitChange = vi.fn();

    render(<LayoutHarness blocks={blocks} onFitChange={onFitChange} />);

    await waitFor(() => {
      expect(screen.getByTestId("settled")).toHaveTextContent("true");
    });

    expect(screen.getByTestId("page-count")).toHaveTextContent("1");

    expect(onFitChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fits: true,
        pageCount: 1,
        layoutMode: "one-page",
      })
    );
  });

  it("uses roomy density for a sufficiently full accepted page", async () => {
    mockLayout({
      heights: {
        header: 300,
        summary: 250,
      },
    });

    const blocks = [
      {
        key: "header",
      },
      {
        key: "summary",
      },
    ];

    render(<LayoutHarness blocks={blocks} />);

    await waitFor(() => {
      expect(screen.getByTestId("settled")).toHaveTextContent("true");
    });

    expect(screen.getByTestId("layout")).toHaveAttribute(
      "data-density",
      "roomy"
    );
  });

  it("starts with all skills available", () => {
    const skills = [
      ["One", ["1"]],
      ["Two", ["2"]],
      ["Three", ["3"]],
      ["Four", ["4"]],
    ];

    render(<LayoutHarness skills={skills} />);

    expect(screen.getByTestId("skill-limit")).toHaveTextContent("4");
  });

  it("starts with all projects available", () => {
    const projects = [
      {
        heading: "One",
      },
      {
        heading: "Two",
      },
      {
        heading: "Three",
      },
    ];

    render(<LayoutHarness projects={projects} />);

    expect(screen.getByTestId("project-limit")).toHaveTextContent("3");
  });

  it("resets layout state when source content changes", async () => {
    const firstSkills = [["One", ["1"]]];

    const secondSkills = [
      ["One", ["1"]],
      ["Two", ["2"]],
    ];

    const { rerender } = render(<LayoutHarness skills={firstSkills} />);

    expect(screen.getByTestId("skill-limit")).toHaveTextContent("1");

    rerender(<LayoutHarness skills={secondSkills} />);

    await waitFor(() => {
      expect(screen.getByTestId("skill-limit")).toHaveTextContent("2");
    });
  });
});
