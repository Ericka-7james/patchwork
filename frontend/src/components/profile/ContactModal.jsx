import { useEffect, useState } from "react";

import LoadingOverlay from "../common/LoadingOverlay";

import "./styles/ContactModal.css";

const CONTACT_FIELDS = [
  {
    key: "location",
    label: "Location",
    placeholder: "Atlanta, GA",
  },
  {
    key: "address",
    label: "Address",
    placeholder: "Optional address",
  },
  {
    key: "email",
    label: "Email",
    placeholder: "you@example.com",
  },
  {
    key: "phone",
    label: "Phone",
    placeholder: "(555) 123-4567",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "linkedin.com/in/username",
  },
  {
    key: "github",
    label: "GitHub",
    placeholder: "github.com/username",
  },
  {
    key: "website",
    label: "Website",
    placeholder: "yourwebsite.com",
  },
  {
    key: "portfolio",
    label: "Portfolio",
    placeholder: "portfolio.example.com",
  },
];

function createDraft(contact) {
  const source =
    contact && typeof contact === "object" && !Array.isArray(contact)
      ? contact
      : {};

  return {
    location: typeof source.location === "string" ? source.location : "",
    address: typeof source.address === "string" ? source.address : "",
    email: typeof source.email === "string" ? source.email : "",
    phone: typeof source.phone === "string" ? source.phone : "",
    linkedin: typeof source.linkedin === "string" ? source.linkedin : "",
    github: typeof source.github === "string" ? source.github : "",
    website: typeof source.website === "string" ? source.website : "",
    portfolio: typeof source.portfolio === "string" ? source.portfolio : "",
    other: Array.isArray(source.other)
      ? source.other.filter((item) => typeof item === "string").join("\n")
      : "",
  };
}

function ContactModal({ contact, onClose, onApply }) {
  const [draft, setDraft] = useState(() => createDraft(contact));

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSaving, onClose]);

  function handleFieldChange(event) {
    const { name, value } = event.target;

    setDraft((currentDraft) => ({
      ...currentDraft,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const nextContact = {
      location: draft.location.trim(),
      address: draft.address.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      linkedin: draft.linkedin.trim(),
      github: draft.github.trim(),
      website: draft.website.trim(),
      portfolio: draft.portfolio.trim(),

      other: draft.other
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    };

    setIsSaving(true);

    try {
      await onApply(nextContact);
    } finally {
      setIsSaving(false);
    }
  }

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget && !isSaving) {
      onClose();
    }
  }

  return (
    <div className="contact-modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <section
        className="contact-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        aria-busy={isSaving}
      >
        <LoadingOverlay
          isLoading={isSaving}
          message="Saving your contact information..."
        />

        <div className="contact-modal-header">
          <div>
            <span className="contact-modal-eyebrow">User's Contact</span>

            <h2 id="contact-modal-title">Edit contact information</h2>
          </div>

          <button
            type="button"
            className="contact-modal-close"
            aria-label="Close contact editor"
            onClick={onClose}
            disabled={isSaving}
          >
            ×
          </button>
        </div>

        <form className="contact-modal-form" onSubmit={handleSubmit}>
          <div className="contact-modal-fields">
            {CONTACT_FIELDS.map((field) => (
              <label className="contact-modal-field" key={field.key}>
                <span>{field.label}</span>

                <input
                  type="text"
                  name={field.key}
                  value={draft[field.key]}
                  placeholder={field.placeholder}
                  onChange={handleFieldChange}
                  disabled={isSaving}
                />
              </label>
            ))}
          </div>

          <label className="contact-modal-field">
            <span>Other contact information</span>

            <textarea
              name="other"
              value={draft.other}
              onChange={handleFieldChange}
              rows={4}
              placeholder={"U.S. Citizen\nAdditional contact detail"}
              disabled={isSaving}
            />

            <small>Enter one item per line.</small>
          </label>

          <div className="contact-modal-footer">
            <button
              type="button"
              className="button button-small button-outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="button button-small"
              disabled={isSaving}
            >
              Done
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ContactModal;
