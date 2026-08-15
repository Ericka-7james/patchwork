import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabase } from "../lib/supabase";
import "./styles/AuthShared.css";
import "./styles/ResetPassword.css";

const MIN_PASSWORD_LENGTH = 9;
const SUCCESS_REDIRECT_DELAY = 1600;

function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoverySessionReady, setIsRecoverySessionReady] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function checkRecoverySession() {
      const { data } = await supabase.auth.getSession();

      if (isActive && data.session) {
        setIsRecoverySessionReady(true);
      }
    }

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isActive) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || session) {
        setIsRecoverySessionReady(true);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!password || !confirmPassword) {
      setError("Enter and confirm your new password.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Your password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (!isRecoverySessionReady) {
      setError(
        "This password reset link is invalid or has expired. Request a new link."
      );
      return;
    }

    setIsSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setIsSubmitting(false);

    if (updateError) {
      setError(
        updateError.message ||
          "Unable to update your password. Please request a new reset link."
      );
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setSuccessMessage("Your password has been updated successfully.");

    window.setTimeout(() => {
      navigate("/profile", { replace: true });
    }, SUCCESS_REDIRECT_DELAY);
  }

  const isSuccess = Boolean(successMessage);

  return (
    <div className="auth-page">
      <Header variant="auth" showLogin />

      <main className="reset-password-main">
        <section className="reset-password-intro">
          <p className="eyebrow">Almost there</p>

          <h1>
            Choose something <span>new.</span>
          </h1>

          <p>
            Set a new password for your PatchWork account, then you can jump
            back into your resumes.
          </p>
        </section>

        <section
          className={`reset-password-card ${
            isSuccess ? "reset-password-card-success" : ""
          }`}
        >
          {isSuccess ? (
            <div
              className="reset-password-success"
              role="status"
              aria-live="polite"
            >
              <div className="reset-password-success-icon" aria-hidden="true">
                ✓
              </div>

              <p className="eyebrow">Password updated</p>

              <h2>You&apos;re all set.</h2>

              <p className="reset-password-success-message">{successMessage}</p>

              <p className="reset-password-success-redirect">
                Taking you back to your profile...
              </p>
            </div>
          ) : (
            <>
              <div className="reset-password-heading">
                <p className="eyebrow">New password</p>

                <h2>Update your password</h2>

                <p>Use at least {MIN_PASSWORD_LENGTH} characters.</p>
              </div>

              <form className="reset-password-form" onSubmit={handleSubmit}>
                <label className="form-field">
                  <span>New password</span>

                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Your new password"
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Confirm new password</span>

                  <input
                    type="password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Confirm your new password"
                    required
                  />
                </label>

                {error && (
                  <div className="form-alert form-alert-error" role="alert">
                    {error}
                  </div>
                )}

                <button
                  className="button button-primary button-full"
                  type="submit"
                  disabled={isSubmitting || !isRecoverySessionReady}
                >
                  {isSubmitting ? "Updating password..." : "Update password"}
                </button>
              </form>

              {!isRecoverySessionReady && (
                <p className="reset-password-help">
                  Waiting for a valid recovery session. If this link has
                  expired,{" "}
                  <Link to="/forgot-password">request another reset email</Link>
                  .
                </p>
              )}
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default ResetPassword;
