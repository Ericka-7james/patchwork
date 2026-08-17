import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COMPONENT_CONTENT } from "../content/common/componentContent";
import { useAuth } from "../context/useAuth";

function Header({
  variant = "home",
  showLogin = false,
  showSignup = false,
  firstName = "",
  onLogout,
  isLoggingOut = false,
}) {
  const navigate = useNavigate();
  const { hasResume } = useAuth();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const { brand, header } = COMPONENT_CONTENT;

  const { actions, navigationLabels, routes, signedInLabel } = header;

  const userMenuLabel =
    typeof firstName === "string" && firstName.trim()
      ? firstName.trim()
      : "Account";

  function toggleUserMenu() {
    setIsUserMenuOpen((currentValue) => !currentValue);
  }

  function closeUserMenu() {
    setIsUserMenuOpen(false);
  }

  return (
    <header className="navbar">
      <Link to={routes.home} className="brand" onClick={closeUserMenu}>
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
          <div className="app-user-menu">
            <button
              type="button"
              className="nav-link app-user-name app-user-menu-trigger"
              aria-label={`${signedInLabel} ${userMenuLabel}`}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              onClick={toggleUserMenu}
              title={userMenuLabel}
            >
              <span>{userMenuLabel}</span>

              <span className="app-user-menu-chevron" aria-hidden="true">
                ▾
              </span>
            </button>

            {isUserMenuOpen && (
              <div
                className="app-user-dropdown"
                role="menu"
                aria-label={`${userMenuLabel} account menu`}
              >
                <Link
                  to={routes.dashboard}
                  className="app-user-dropdown-link"
                  role="menuitem"
                  onClick={closeUserMenu}
                >
                  {actions.dashboard}
                </Link>

                {hasResume && (
                  <>
                    <Link
                      to={routes.profile}
                      className="app-user-dropdown-link"
                      role="menuitem"
                      onClick={closeUserMenu}
                    >
                      {actions.profile}
                    </Link>

                    <Link
                      to={routes.resumeGenerator}
                      className="app-user-dropdown-link"
                      role="menuitem"
                      onClick={closeUserMenu}
                    >
                      {actions.resumeGenerator}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

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
