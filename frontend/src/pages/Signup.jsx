import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { SIGNUP_CONTENT } from "../content/pages/signupContent";
import { supabase } from "../lib/supabase";
import { signInWithGoogle } from "../services/authService";
import { validatePassword } from "../utils/validatePassword";
import "./styles/AuthShared.css";
import "./styles/Signup.css";

const INITIAL_FORM_DATA = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function Signup() {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const {
    intro,
    card,
    fields,
    passwordNote,
    actions,
    messages,
    switchText,
    routes,
  } = SIGNUP_CONTENT;

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrors([]);
    setMessage("");

    const normalizedFormData = {
      ...formData,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
    };

    if (normalizedFormData.password !== normalizedFormData.confirmPassword) {
      setErrors([messages.passwordMismatch]);
      return;
    }

    const passwordValidation = validatePassword(normalizedFormData);

    if (!passwordValidation.isValid) {
      setErrors(passwordValidation.errors);
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email: normalizedFormData.email,
      password: normalizedFormData.password,

      options: {
        data: {
          username: normalizedFormData.username,
          first_name: normalizedFormData.firstName,
          last_name: normalizedFormData.lastName,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      setErrors([error.message]);
      return;
    }

    setMessage(messages.accountCreated);
    setFormData(INITIAL_FORM_DATA);
  }

  async function handleGoogleSignIn() {
    setErrors([]);
    setMessage("");
    setIsGoogleSubmitting(true);

    try {
      await signInWithGoogle();
    } catch (googleError) {
      setErrors([googleError.message || "Unable to continue with Google."]);

      setIsGoogleSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <Header variant="auth" showLogin />

      <main className="auth-main">
        <section className="auth-intro">
          <p className="eyebrow">{intro.eyebrow}</p>

          <h1>
            {intro.heading} <span>{intro.headingAccent}</span>
          </h1>

          <p>{intro.description}</p>

          <div className="auth-principle">
            <strong>{intro.principle.title}</strong>

            <span>{intro.principle.description}</span>
          </div>
        </section>

        <section className="signup-card">
          <div className="signup-heading">
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

          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="field-row">
              <label className="form-field">
                <span>{fields.firstName.label}</span>

                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  autoComplete={fields.firstName.autoComplete}
                  placeholder={fields.firstName.placeholder}
                  required
                  disabled={isGoogleSubmitting}
                />
              </label>

              <label className="form-field">
                <span>{fields.lastName.label}</span>

                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  autoComplete={fields.lastName.autoComplete}
                  placeholder={fields.lastName.placeholder}
                  required
                  disabled={isGoogleSubmitting}
                />
              </label>
            </div>

            <label className="form-field">
              <span>{fields.username.label}</span>

              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                autoComplete={fields.username.autoComplete}
                placeholder={fields.username.placeholder}
                minLength={fields.username.minLength}
                required
                disabled={isGoogleSubmitting}
              />
            </label>

            <label className="form-field">
              <span>{fields.email.label}</span>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete={fields.email.autoComplete}
                placeholder={fields.email.placeholder}
                required
                disabled={isGoogleSubmitting}
              />
            </label>

            <label className="form-field">
              <span>{fields.password.label}</span>

              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete={fields.password.autoComplete}
                placeholder={fields.password.placeholder}
                minLength={fields.password.minLength}
                required
                disabled={isGoogleSubmitting}
              />
            </label>

            <label className="form-field">
              <span>{fields.confirmPassword.label}</span>

              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete={fields.confirmPassword.autoComplete}
                placeholder={fields.confirmPassword.placeholder}
                minLength={fields.confirmPassword.minLength}
                required
                disabled={isGoogleSubmitting}
              />
            </label>

            <div className="password-note">
              <strong>{passwordNote.title}</strong>

              <span>{passwordNote.description}</span>
            </div>

            {errors.length > 0 && (
              <div className="form-alert form-alert-error" role="alert">
                <strong>{messages.validationHeading}</strong>

                <ul>
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
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
              disabled={isSubmitting || isGoogleSubmitting}
            >
              {isSubmitting ? actions.creatingAccount : actions.createAccount}
            </button>
          </form>

          <p className="auth-switch">
            {switchText} <Link to={routes.login}>{actions.logIn}</Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Signup;
