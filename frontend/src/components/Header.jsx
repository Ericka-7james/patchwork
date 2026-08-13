import { Link, useNavigate } from "react-router-dom";

function Header({
  variant = "home",
  showLogin = false,
  showSignup = false,
  username = "",
  onLogout,
  isLoggingOut = false,
}) {
  const navigate = useNavigate();

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
          <button
            type="button"
            className="nav-link header-text-button"
            onClick={() => navigate(-1)}
          >
            Back
          </button>

          {showLogin && (
            <Link to="/login" className="button button-small button-outline">
              Log in
            </Link>
          )}

          {showSignup && (
            <Link to="/signup" className="button button-small button-outline">
              Sign up
            </Link>
          )}
        </nav>
      )}

      {variant === "app" && (
        <nav className="nav-actions" aria-label="App navigation">
          {username && (
            <span className="nav-link" aria-label={`Signed in as ${username}`}>
              {username}
            </span>
          )}

          <Link to="/dashboard" className="nav-link">
            Dashboard
          </Link>

          <button
            type="button"
            className="button button-small button-outline"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Log out"}
          </button>
        </nav>
      )}
    </header>
  );
}

export default Header;
