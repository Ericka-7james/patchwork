import { useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import Header from "../components/Header";

import Footer from "../components/Footer";

import { LOGIN_CONTENT } from "../content/pages/loginContent";

import { supabase } from "../lib/supabase";

import { signInWithGoogle } from "../services/authService";

import "./styles/AuthShared.css";

import "./styles/Login.css";

function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const { intro, card, fields, actions, switchText, errors, routes } =
    LOGIN_CONTENT;

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier || !password) {
      setError(errors.missingCredentials);

      return;
    }

    const isEmail = normalizedIdentifier.includes("@");

    const looksLikePhone = /^\+?[\d\s()-]+$/.test(normalizedIdentifier);

    if (!isEmail && !looksLikePhone) {
      setError(errors.invalidIdentifier);

      return;
    }

    const credentials = isEmail
      ? {
          email: normalizedIdentifier.toLowerCase(),

          password,
        }
      : {
          phone: normalizedIdentifier,

          password,
        };

    setIsSubmitting(true);

    const { error: signInError } =
      await supabase.auth.signInWithPassword(credentials);

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);

      return;
    }

    navigate(routes.dashboard, {
      replace: true,
    });
  }

  async function handleGoogleSignIn() {
    setError("");

    setIsGoogleSubmitting(true);

    try {
      await signInWithGoogle();
    } catch (googleError) {
      setError(googleError.message || "Unable to continue with Google.");

      setIsGoogleSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <Header variant="auth" showSignup />

      <main className="login-main">
        <section className="login-intro">
          <p className="eyebrow">{intro.eyebrow}</p>

          <h1>
            {intro.heading} <span>{intro.headingAccent}</span>
          </h1>

          <p>{intro.description}</p>
        </section>

        <section className="login-card">
          <div className="login-heading">
            <p className="eyebrow">{card.eyebrow}</p>

            <h2>{card.heading}</h2>

            <p>{card.description}</p>
          </div>

          <button
            type="button"
            className="button button-outline button-full"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || isGoogleSubmitting}
          >
            {isGoogleSubmitting
              ? "Connecting to Google..."
              : "Continue with Google"}
          </button>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <span>{fields.identifier.label}</span>

              <input
                type="text"
                name="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                placeholder={fields.identifier.placeholder}
                required
                disabled={isGoogleSubmitting}
              />
            </label>

            <label className="login-field">
              <span>{fields.password.label}</span>

              <input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder={fields.password.placeholder}
                required
                disabled={isGoogleSubmitting}
              />
            </label>

            <div className="login-options">
              <Link to={routes.forgotPassword} className="forgot-password-link">
                {actions.forgotPassword}
              </Link>
            </div>

            {error && (
              <div className="form-alert form-alert-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="button button-primary button-full"
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
            >
              {isSubmitting ? actions.signingIn : actions.signIn}
            </button>
          </form>

          <p className="login-switch">
            {switchText} <Link to={routes.signup}>{actions.createAccount}</Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Login;
