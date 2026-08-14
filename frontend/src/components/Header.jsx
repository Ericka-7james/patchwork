import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COMPONENT_CONTENT } from "../content/common/componentContent";

function Header({
  variant = "home",
  showLogin = false,
  showSignup = false,
  firstName = "",
  onLogout,
  isLoggingOut = false,
}) {
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { brand, header } = COMPONENT_CONTENT;
  const { actions, navigationLabels, routes, signedInLabel } = header;

  function toggleUserMenu() {
    setIsUserMenuOpen((currentValue) => !currentValue);
  }

  function closeUserMenu() {
    setIsUserMenuOpen(false);
  }

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
          {firstName && (
            <div className="app-user-menu">
              <button
                type="button"
                className="nav-link app-user-name app-user-menu-trigger"
                aria-label={`${signedInLabel} ${firstName}`}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                onClick={toggleUserMenu}
                title={firstName}
              >
                <span>{firstName}</span>
                <span className="app-user-menu-chevron" aria-hidden="true">
                  ▾
                </span>
              </button>

              {isUserMenuOpen && (
                <div
                  className="app-user-dropdown"
                  role="menu"
                  aria-label={`${firstName} account menu`}
                >
                  <Link
                    to={routes.profile}
                    className="app-user-dropdown-link"
                    role="menuitem"
                    onClick={closeUserMenu}
                  >
                    {actions.profile}
                  </Link>
                </div>
              )}
            </div>
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
