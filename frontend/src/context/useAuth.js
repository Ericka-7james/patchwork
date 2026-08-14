import { useContext } from "react";
import AuthContext from "./AuthContextBase";

/**
 * Returns the shared authentication context.
 *
 * @returns {object} The current authentication state and actions.
 * @throws {Error} If used outside of an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
