import { act, fireEvent, render, screen } from "@testing-library/react";

import { describe, expect, it, vi } from "vitest";

import ExperienceModal from "../../../components/profile/ExperienceModal";

function createExperience(overrides = {}) {
  return {
    heading: "JPMorgan Chase — Software Engineer",

    bullets: ["Built production software.", "Added automated tests."],

    hidden: false,

    ...overrides,
  };
}

function createDeferredPromise() {
  let resolve;
  let reject;

  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

describe("ExperienceModal", () => {
  it("does not render without an experience", () => {
    render(
      <ExperienceModal experience={null} onClose={vi.fn()} onApply={vi.fn()} />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the selected experience", () => {
    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    expect(screen.getByLabelText("Experience heading")).toHaveValue(
      "JPMorgan Chase — Software Engineer"
    );

    expect(screen.getByLabelText("Bullet 1")).toHaveValue(
      "Built production software."
    );

    expect(screen.getByLabelText("Bullet 2")).toHaveValue(
      "Added automated tests."
    );

    expect(
      screen.getByRole("button", {
        name: "Hide from resume",
      })
    ).toBeInTheDocument();
  });

  it("edits the experience heading and bullets", () => {
    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("Experience heading"), {
      target: {
        value: "JPMorgan Chase — Senior Software Engineer",
      },
    });

    fireEvent.change(screen.getByLabelText("Bullet 1"), {
      target: {
        value: "Built customer-facing software.",
      },
    });

    expect(screen.getByLabelText("Experience heading")).toHaveValue(
      "JPMorgan Chase — Senior Software Engineer"
    );

    expect(screen.getByLabelText("Bullet 1")).toHaveValue(
      "Built customer-facing software."
    );
  });

  it("adds a bullet", () => {
    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Add bullet",
      })
    );

    expect(screen.getByLabelText("Bullet 3")).toBeInTheDocument();

    expect(screen.getByLabelText("Bullet 3")).toHaveValue("");
  });

  it("removes a bullet", () => {
    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove bullet 1",
      })
    );

    expect(screen.getByLabelText("Bullet 1")).toHaveValue(
      "Added automated tests."
    );

    expect(screen.queryByLabelText("Bullet 2")).not.toBeInTheDocument();
  });

  it("toggles the experience visibility", () => {
    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Hide from resume",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Show on resume",
      })
    ).toBeInTheDocument();
  });

  it("starts hidden experiences with a show button", () => {
    render(
      <ExperienceModal
        experience={createExperience({
          hidden: true,
        })}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    );

    expect(
      screen.getByRole("button", {
        name: "Show on resume",
      })
    ).toBeInTheDocument();
  });

  it("submits cleaned experience data", async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);

    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={vi.fn()}
        onApply={onApply}
      />
    );

    fireEvent.change(screen.getByLabelText("Experience heading"), {
      target: {
        value: "  JPMorgan Chase — Senior Engineer  ",
      },
    });

    fireEvent.change(screen.getByLabelText("Bullet 1"), {
      target: {
        value: "  Built production systems.  ",
      },
    });

    fireEvent.change(screen.getByLabelText("Bullet 2"), {
      target: {
        value: "   ",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Hide from resume",
      })
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: "Done",
        })
      );
    });

    expect(onApply).toHaveBeenCalledOnce();

    expect(onApply).toHaveBeenCalledWith({
      heading: "JPMorgan Chase — Senior Engineer",

      bullets: ["Built production systems."],

      hidden: true,
    });
  });

  it("does not submit an empty heading", async () => {
    const onApply = vi.fn();

    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={vi.fn()}
        onApply={onApply}
      />
    );

    fireEvent.change(screen.getByLabelText("Experience heading"), {
      target: {
        value: "   ",
      },
    });

    expect(
      screen.getByRole("button", {
        name: "Done",
      })
    ).toBeDisabled();

    expect(onApply).not.toHaveBeenCalled();
  });

  it("closes with the close button", () => {
    const onClose = vi.fn();

    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={onClose}
        onApply={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Close experience editor",
      })
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes with the cancel button", () => {
    const onClose = vi.fn();

    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={onClose}
        onApply={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cancel",
      })
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when Escape is pressed", () => {
    const onClose = vi.fn();

    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={onClose}
        onApply={vi.fn()}
      />
    );

    fireEvent.keyDown(window, {
      key: "Escape",
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when the modal background is pressed", () => {
    const onClose = vi.fn();

    const { container } = render(
      <ExperienceModal
        experience={createExperience()}
        onClose={onClose}
        onApply={vi.fn()}
      />
    );

    const overlay = container.querySelector(".experience-modal-overlay");

    fireEvent.mouseDown(overlay);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not close when the dialog itself is pressed", () => {
    const onClose = vi.fn();

    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={onClose}
        onApply={vi.fn()}
      />
    );

    fireEvent.mouseDown(screen.getByRole("dialog"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks the editor while saving", async () => {
    const deferred = createDeferredPromise();

    const onApply = vi.fn(() => deferred.promise);

    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={vi.fn()}
        onApply={onApply}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Done",
      })
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");

    expect(screen.getByLabelText("Experience heading")).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Add bullet",
      })
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Hide from resume",
      })
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Cancel",
      })
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: "Done",
      })
    ).toBeDisabled();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "false");
  });

  it("cannot be closed with Escape while saving", async () => {
    const deferred = createDeferredPromise();

    const onClose = vi.fn();

    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={onClose}
        onApply={() => deferred.promise}
      />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Done",
      })
    );

    fireEvent.keyDown(window, {
      key: "Escape",
    });

    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });
  });

  it("unlocks the editor when saving fails", async () => {
    const onApply = vi.fn().mockImplementation(async () => {
      throw new Error("Unable to save experience.");
    });

    render(
      <ExperienceModal
        experience={createExperience()}
        onClose={vi.fn()}
        onApply={async (experience) => {
          try {
            await onApply(experience);
          } catch {
            // The parent owns displaying the save error.
          }
        }}
      />
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: "Done",
        })
      );
    });

    expect(onApply).toHaveBeenCalledOnce();

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "false");

    expect(
      screen.getByRole("button", {
        name: "Done",
      })
    ).not.toBeDisabled();

    expect(screen.getByLabelText("Experience heading")).not.toBeDisabled();
  });
});
