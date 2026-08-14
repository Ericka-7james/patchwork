import { Link, useNavigate } from "react-router-dom";
import { COMPONENT_CONTENT } from "../common/componentContent";

function Header({
  variant = "home",
  showLogin = false,
  showSignup = false,
  firstName = "",
  onLogout,
  isLoggingOut = false,
}) {
  const navigate = useNavigate();

  const { brand, header } = COMPONENT_CONTENT;
  const { actions, navigationLabels, routes, signedInLabel } = header;

  const displayName =
    firstName.length > 8 ? `${firstName.slice(0, 8)}...` : firstName;

  return (
    <header className="navbar">
      <Link to={routes.home} className="brand">
        {brand.firstPart}
        <span>{brand.secondPart}</span>
      </Link>

      {variant === "home" && (
        <nav className="nav-actions" aria-label={navigationLabels.main}>
          <Link to={routes.signup} className="nav-link">
            {actions.signUp}
          </Link>

          <Link
            to={routes.login}
            className="button button-small button-outline"
          >
            {actions.logIn}
          </Link>
        </nav>
      )}

      {variant === "auth" && (
        <nav
          className="nav-actions"
          aria-label={navigationLabels.authentication}
        >
          <button
            type="button"
            className="nav-link header-text-button"
            onClick={() => navigate(-1)}
          >
            {actions.back}
          </button>

          {showLogin && (
            <Link
              to={routes.login}
              className="button button-small button-outline"
            >
              {actions.logIn}
            </Link>
          )}

          {showSignup && (
            <Link
              to={routes.signup}
              className="button button-small button-outline"
            >
              {actions.signUp}
            </Link>
          )}
        </nav>
      )}

      {variant === "app" && (
        <nav className="nav-actions" aria-label={navigationLabels.app}>
          {displayName && (
            <span
              className="nav-link app-user-name"
              aria-label={`${signedInLabel} ${firstName}`}
              title={firstName}
            >
              {displayName}
            </span>
          )}

          <button
            type="button"
            className="button button-small button-outline"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? actions.loggingOut : actions.logOut}
          </button>
        </nav>
      )}
    </header>
  );
}

export default Header;
