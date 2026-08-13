import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { validatePassword } from "../utils/validatePassword";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./Signup.css";

const initialFormData = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function Signup() {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrors([]);
    setMessage("");

    const trimmedData = {
      ...formData,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      username: formData.username.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
    };

    if (trimmedData.password !== trimmedData.confirmPassword) {
      setErrors(["Passwords do not match."]);
      return;
    }

    const passwordCheck = validatePassword(trimmedData);

    if (!passwordCheck.isValid) {
      setErrors(passwordCheck.errors);
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email: trimmedData.email,
      password: trimmedData.password,
      options: {
        data: {
          username: trimmedData.username,
          first_name: trimmedData.firstName,
          last_name: trimmedData.lastName,
        },
      },
    });

    setIsSubmitting(false);

    if (error) {
      setErrors([error.message]);
      return;
    }

    setMessage(
      "Your account was created. Check your email to confirm your address before signing in."
    );

    setFormData(initialFormData);
  }

  return (
    <div className="auth-page">
      <Header variant="auth" showLogin />

      <main className="auth-main">
        <section className="auth-intro">
          <p className="eyebrow">Start with what you already have.</p>

          <h1>
            Build something stronger
            <span> from something real.</span>
          </h1>

          <p>
            Create your PatchWork account and start improving the way your
            experience is presented.
          </p>

          <div className="auth-principle">
            <strong>PatchWork promise</strong>
            <span>
              We improve how your experience is communicated. We do not invent
              experience for you.
            </span>
          </div>
        </section>

        <section className="signup-card">
          <div className="signup-heading">
            <p className="eyebrow">Create account</p>
            <h2>Welcome to PatchWork</h2>
            <p>Email signup is available now. Phone authentication comes next.</p>
          </div>

          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="field-row">
              <label className="form-field">
                <span>First name</span>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  autoComplete="given-name"
                  placeholder="First name"
                  required
                />
              </label>

              <label className="form-field">
                <span>Last name</span>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  autoComplete="family-name"
                  placeholder="Last name"
                  required
                />
              </label>
            </div>

            <label className="form-field">
              <span>Username</span>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                placeholder="yourusername"
                minLength="3"
                required
              />
            </label>

            <label className="form-field">
              <span>Email address</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="form-field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="9+ characters"
                minLength="9"
                required
              />
            </label>

            <label className="form-field">
              <span>Confirm password</span>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                placeholder="Enter it again"
                minLength="9"
                required
              />
            </label>

            <div className="password-note">
              <strong>Your password:</strong>
              <span>
                Must be at least 9 characters and cannot contain your username,
                email name, first name, or last name.
              </span>
            </div>

            {errors.length > 0 && (
              <div className="form-alert form-alert-error" role="alert">
                <strong>Check a few things:</strong>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{" "}
            <Link to="/login">Log in</Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Signup;