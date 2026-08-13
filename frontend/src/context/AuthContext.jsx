import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import AuthContext from "./AuthContextBase";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Unable to load Supabase session:", error);
        setSession(null);
        setProfile(null);
      } else {
        setSession(data.session ?? null);

        if (!data.session?.user) {
          setProfile(null);
        }
      }

      setIsLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
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
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const user = session?.user;

      if (!user) {
        return;
      }

      setIsProfileLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, first_name")
        .eq("id", user.id)
        .single();

      if (!isMounted) {
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
      isMounted = false;
    };
  }, [session]);

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isProfileLoading,
      signOut,
    }),
    [session, profile, isLoading, isProfileLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
