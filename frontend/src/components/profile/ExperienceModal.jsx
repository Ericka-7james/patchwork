import { useEffect, useState } from "react";
import "./styles/ExperienceModal.css";

function createDraft(experience) {
  return {
    ...experience,
    heading: typeof experience?.heading === "string" ? experience.heading : "",
    bullets: Array.isArray(experience?.bullets) ? [...experience.bullets] : [],
    hidden: experience?.hidden === true,
  };
}

function ExperienceModal({ experience, onClose, onApply }) {
  const [draft, setDraft] = useState(() => createDraft(experience));

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!experience) {
    return null;
  }

  function handleHeadingChange(event) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      heading: event.target.value,
    }));
  }

  function handleBulletChange(index, value) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      bullets: currentDraft.bullets.map((bullet, bulletIndex) =>
        bulletIndex === index ? value : bullet
      ),
    }));
  }

  function handleAddBullet() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      bullets: [...currentDraft.bullets, ""],
    }));
  }

  function handleRemoveBullet(index) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      bullets: currentDraft.bullets.filter(
        (_, bulletIndex) => bulletIndex !== index
      ),
    }));
  }

  function handleVisibilityToggle() {
    setDraft((currentDraft) => ({
      ...currentDraft,
      hidden: !currentDraft.hidden,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const heading = draft.heading.trim();

    if (!heading) {
      return;
    }

    onApply({
      ...draft,
      heading,
      bullets: draft.bullets
        .map((bullet) => (typeof bullet === "string" ? bullet.trim() : ""))
        .filter(Boolean),
      hidden: draft.hidden === true,
    });
  }

  function handleOverlayMouseDown(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="experience-modal-overlay"
      onMouseDown={handleOverlayMouseDown}
    >
      <section
        className="experience-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="experience-modal-title"
      >
        <div className="experience-modal-header">
          <div>
            <span className="experience-modal-eyebrow">Work experience</span>

            <h2 id="experience-modal-title">Edit experience</h2>
          </div>

          <button
            type="button"
            className="experience-modal-close"
            aria-label="Close experience editor"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form className="experience-modal-form" onSubmit={handleSubmit}>
          <label className="experience-modal-field">
            <span>Experience heading</span>

            <textarea
              value={draft.heading}
              onChange={handleHeadingChange}
              rows={3}
              required
            />
          </label>

          <div className="experience-modal-bullets">
            <div className="experience-modal-section-heading">
              <span>Bullet points</span>

              <button
                type="button"
                className="button button-small button-outline"
                onClick={handleAddBullet}
              >
                Add bullet
              </button>
            </div>

            {draft.bullets.length > 0 ? (
              <div className="experience-modal-bullet-list">
                {draft.bullets.map((bullet, index) => (
                  <div
                    className="experience-modal-bullet"
                    key={`experience-bullet-${index}`}
                  >
                    <textarea
                      value={bullet}
                      onChange={(event) =>
                        handleBulletChange(index, event.target.value)
                      }
                      rows={3}
                      aria-label={`Bullet ${index + 1}`}
                    />

                    <button
                      type="button"
                      className="experience-modal-remove"
                      onClick={() => handleRemoveBullet(index)}
                      aria-label={`Remove bullet ${index + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="experience-modal-empty">
                No bullet points yet. Add one when you are ready.
              </p>
            )}
          </div>

          <div className="experience-modal-footer">
            <button
              type="button"
              className="button button-small button-outline"
              onClick={handleVisibilityToggle}
            >
              {draft.hidden ? "Show on resume" : "Hide from resume"}
            </button>

            <div className="experience-modal-footer-actions">
              <button
                type="button"
                className="button button-small button-outline"
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button button-small"
                disabled={!draft.heading.trim()}
              >
                Done
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ExperienceModal;
