import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { HOME_CONTENT } from "../content/pages/homeContent";
import "./styles/Home.css";

function Home() {
  const { hero } = HOME_CONTENT;

  return (
    <div className="site-shell">
      <Header variant="home" />

      <main className="home-main">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{hero.eyebrow}</p>

            <h1>
              {hero.heading} <span>{hero.headingAccent}</span>
            </h1>

            <div className="hero-details">
              <p className="hero-description">{hero.description}</p>

              <div className="hero-actions">
                <Link
                  to={hero.primaryAction.route}
                  className="button button-primary"
                >
                  {hero.primaryAction.label}
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

              <div className="resume-badge">{hero.badge}</div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
