import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ContactModal from "../../../components/profile/ContactModal";

function createContact(overrides = {}) {
  return {
    location: "Atlanta, GA",
    address: "123 Main Street",
    email: "resume@example.com",
    phone: "4045551111",
    linkedin: "linkedin.com/in/patchuser",
    github: "github.com/patchuser",
    website: "patchwork.dev",
    portfolio: "portfolio.patchwork.dev",
    other: ["U.S. Citizen", "Eligible for clearance"],
    ...overrides,
  };
}

describe("ContactModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders existing contact information", () => {
    render(
      <ContactModal
        contact={createContact()}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    expect(screen.getByLabelText(/location/i)).toHaveValue("Atlanta, GA");

    expect(screen.getByLabelText(/email/i)).toHaveValue("resume@example.com");

    expect(screen.getByLabelText(/phone/i)).toHaveValue("4045551111");

    expect(screen.getByLabelText(/linkedin/i)).toHaveValue(
      "linkedin.com/in/patchuser"
    );

    expect(screen.getByLabelText(/github/i)).toHaveValue(
      "github.com/patchuser"
    );

    expect(screen.getByLabelText(/other contact information/i)).toHaveValue(
      "U.S. Citizen\nEligible for clearance"
    );
  });

  it("submits trimmed contact information", async () => {
    const user = userEvent.setup();

    const onApply = vi.fn().mockResolvedValue();

    render(
      <ContactModal
        contact={createContact({
          location: "",
          email: "",
          other: [],
        })}
        onClose={vi.fn()}
        onApply={onApply}
      />
    );

    await user.type(screen.getByLabelText(/location/i), "  Huntsville, AL  ");

    await user.type(screen.getByLabelText(/email/i), "  new@example.com  ");

    await user.type(
      screen.getByLabelText(/other contact information/i),
      "  U.S. Citizen  \n  Clearance eligible  "
    );

    await user.click(
      screen.getByRole("button", {
        name: /done/i,
      })
    );

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledOnce();
    });

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        location: "Huntsville, AL",
        email: "new@example.com",
        other: ["U.S. Citizen", "Clearance eligible"],
      })
    );
  });

  it("closes when Cancel is clicked", async () => {
    const user = userEvent.setup();

    const onClose = vi.fn();

    render(
      <ContactModal
        contact={createContact()}
        onClose={onClose}
        onApply={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: /cancel/i,
      })
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when the close button is clicked", async () => {
    const user = userEvent.setup();

    const onClose = vi.fn();

    render(
      <ContactModal
        contact={createContact()}
        onClose={onClose}
        onApply={vi.fn()}
      />
    );

    await user.click(
      screen.getByRole("button", {
        name: /close contact editor/i,
      })
    );

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when Escape is pressed", () => {
    const onClose = vi.fn();

    render(
      <ContactModal
        contact={createContact()}
        onClose={onClose}
        onApply={vi.fn()}
      />
    );

    fireEvent.keyDown(window, {
      key: "Escape",
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes when the overlay is clicked", () => {
    const onClose = vi.fn();

    const { container } = render(
      <ContactModal
        contact={createContact()}
        onClose={onClose}
        onApply={vi.fn()}
      />
    );

    const overlay = container.querySelector(".contact-modal-overlay");

    fireEvent.mouseDown(overlay);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not close when the modal itself is clicked", () => {
    const onClose = vi.fn();

    const { container } = render(
      <ContactModal
        contact={createContact()}
        onClose={onClose}
        onApply={vi.fn()}
      />
    );

    const modal = container.querySelector(".contact-modal");

    fireEvent.mouseDown(modal);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("handles missing contact information", () => {
    render(<ContactModal contact={null} onClose={vi.fn()} onApply={vi.fn()} />);

    expect(screen.getByLabelText(/location/i)).toHaveValue("");

    expect(screen.getByLabelText(/email/i)).toHaveValue("");

    expect(screen.getByLabelText(/other contact information/i)).toHaveValue("");
  });
});
