import { Link } from "react-router-dom";

function Header({ variant = "home" }) {
  return (
    <header className="navbar">
      <Link to="/" className="brand">
        Patch<span>Work</span>
      </Link>

      {variant === "home" && (
        <nav className="nav-actions" aria-label="Main navigation">
          <Link to="/signup" className="nav-link">
            Sign up
          </Link>

          <Link to="/login" className="button button-small button-outline">
            Log in
          </Link>
        </nav>
      )}

      {variant === "auth" && (
        <nav className="nav-actions" aria-label="Authentication navigation">
          <Link to="/" className="back-link">
            Back home
          </Link>
        </nav>
      )}

      {variant === "app" && (
        <nav className="nav-actions" aria-label="App navigation">
          <Link to="/dashboard" className="nav-link">
            Dashboard
          </Link>
        </nav>
      )}
    </header>
  );
}

export default Header;