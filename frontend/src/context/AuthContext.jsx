import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import AuthContext from "./AuthContextBase";

/**
 * Provides Supabase authentication and profile state to the application.
 *
 * The provider initializes the current session, listens for authentication
 * changes, loads the authenticated user's profile, and exposes logout
 * functionality through the shared auth context.
 *
 * @param {object} props Component properties.
 * @param {React.ReactNode} props.children Child components that need auth state.
 * @returns {JSX.Element} The authentication context provider.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const user = session?.user ?? null;

  useEffect(() => {
    let isActive = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isActive) {
        return;
      }

      if (error) {
        console.error("Unable to load Supabase session:", error);
        setSession(null);
        setProfile(null);
      } else {
        const currentSession = data.session ?? null;

        setSession(currentSession);

        if (!currentSession?.user) {
          setProfile(null);
        }
      }

      setIsLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) {
        return;
      }

      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setIsProfileLoading(false);
      }

      setIsLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let isActive = true;

    async function loadProfile() {
      setIsProfileLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, first_name")
        .eq("id", user.id)
        .single();

      if (!isActive) {
        return;
      }

      if (error) {
        console.error("Unable to load user profile:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        setProfile(null);
      } else {
        setProfile(data);
      }

      setIsProfileLoading(false);
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [user]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }

  const contextValue = useMemo(
    () => ({
      session,
      user,
      profile,
      isLoading,
      isProfileLoading,
      signOut,
    }),
    [session, user, profile, isLoading, isProfileLoading]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
