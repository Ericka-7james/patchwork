import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabase } from "../lib/supabase";
import "./styles/AuthShared.css";
import "./styles/ForgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter the email address associated with your account.");
      return;
    }

    setIsSubmitting(true);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo,
      }
    );

    setIsSubmitting(false);

    if (resetError) {
      setError(
        resetError.message ||
          "Unable to send the password reset email. Please try again."
      );
      return;
    }

    setSuccessMessage(
      "If an account exists for that email, a password reset link has been sent."
    );
  }

  return (
    <div className="auth-page">
      <Header variant="auth" showLogin />

      <main className="forgot-password-main">
        <section className="forgot-password-intro">
          <p className="eyebrow">Password reset</p>

          <h1>
            Let&apos;s get you <span>back in.</span>
          </h1>

          <p>
            Enter the email address connected to your PatchWork account and
            we&apos;ll send you a link to create a new password.
          </p>
        </section>

        <section className="forgot-password-card">
          <div className="forgot-password-heading">
            <p className="eyebrow">Forgot password</p>
            <h2>Reset your password</h2>
            <p>We&apos;ll send the recovery link to your email address.</p>
          </div>

          <form className="forgot-password-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Email address</span>

              <input
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>

            {error && (
              <div className="form-alert form-alert-error" role="alert">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="form-alert form-alert-success" role="status">
                {successMessage}
              </div>
            )}

            <button
              className="button button-primary button-full"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending reset link..." : "Send reset link"}
            </button>
          </form>

          <p className="forgot-password-switch">
            Remembered your password? <Link to="/login">Back to sign in</Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default ForgotPassword;
