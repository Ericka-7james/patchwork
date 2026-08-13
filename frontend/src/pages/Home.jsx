import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import "./Home.css";

function Home() {
  return (
    <div className="site-shell">
      <header className="navbar">
        <Link to="/" className="brand">
          Patch<span>Work</span>
        </Link>

        <nav className="nav-actions" aria-label="Main navigation">
          <Link to="/signup" className="nav-link">
            Sign up
          </Link>

          <Link to="/login" className="button button-small button-outline">
            Log in
          </Link>
        </nav>
      </header>

      <main className="home-main">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              Your experience. Better communicated.
            </p>

            <h1>
              Build a stronger resume
              <span> without making anything up.</span>
            </h1>

            <div className="hero-details">
              <p className="hero-description">
                PatchWork helps turn the work you have actually done into
                clear, polished resume language that shows employers what you
                bring to the table, without inventing skills, metrics, or
                experience.
              </p>

              <div className="hero-actions">
                <Link to="/signup" className="button button-primary">
                  Build my resume
                </Link>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="resume-card resume-card-back" />

            <div className="resume-card resume-card-front">
              <div className="resume-heading-row">
                <div className="resume-name-block" />
                <div className="resume-dot" />
              </div>

              <div className="resume-section">
                <div className="resume-label" />
                <div className="resume-line" />
                <div className="resume-line" />
                <div className="resume-line resume-line-short" />
              </div>

              <div className="resume-section">
                <div className="resume-label" />
                <div className="resume-line" />
                <div className="resume-line resume-line-medium" />
              </div>

              <div className="resume-badge">
                Clearer. Stronger. Still yours.
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;