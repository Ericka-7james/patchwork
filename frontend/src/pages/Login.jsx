import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./Login.css";

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier || !password) {
      setError("Enter your email or phone number and password.");
      return;
    }

    setIsSubmitting(true);

    const isEmail = normalizedIdentifier.includes("@");

    const credentials = isEmail
      ? {
          email: normalizedIdentifier.toLowerCase(),
          password,
        }
      : {
          phone: normalizedIdentifier,
          password,
        };

    const { error: signInError } =
      await supabase.auth.signInWithPassword(credentials);

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage("Signed in successfully.");
  }

  return (
    <div className="auth-page">
      <Header variant="auth" showSignup />

      <main className="login-main">
        <section className="login-intro">
          <p className="eyebrow">Welcome back.</p>

          <h1>
            Pick up where
            <span> you left off.</span>
          </h1>

          <p>
            Sign in to return to your resumes, continue improving your
            experience, and keep building something that still sounds like you.
          </p>
        </section>

        <section className="login-card">
          <div className="login-heading">
            <p className="eyebrow">Sign in</p>
            <h2>Welcome back to PatchWork</h2>
            <p>Use your email address or phone number.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <span>Email or phone number</span>

              <input
                type="text"
                name="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                placeholder="you@example.com or +15551234567"
                required
              />
            </label>

            <label className="login-field">
              <span>Password</span>

              <input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Your password"
                required
              />
            </label>

            <div className="login-options">
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="form-alert form-alert-error" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="form-alert form-alert-success" role="status">
                {message}
              </div>
            )}

            <button
              className="button button-primary button-full"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="login-switch">
            New to PatchWork? <Link to="/signup">Create an account</Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Login;
