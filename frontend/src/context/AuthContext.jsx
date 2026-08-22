import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabase";

import AuthContext from "./AuthContextBase";

const PROFILE_SELECT = [
  "id",
  "username",
  "first_name",
  "last_name",
  "phone",
  "resume_email",
  "resume_phone",
  "location",
  "address",
  "linkedin",
  "github",
  "website",
  "portfolio",
  "contact_other",
  "contact_initialized",
].join(", ");

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hasResume, setHasResume] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isResumeStateLoading, setIsResumeStateLoading] = useState(false);

  const user = session?.user ?? null;
  const userId = user?.id ?? null;

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
        setHasResume(false);
      } else {
        const currentSession = data.session ?? null;

        setSession(currentSession);

        if (!currentSession?.user) {
          setProfile(null);
          setHasResume(false);
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
        setHasResume(false);
        setIsProfileLoading(false);
        setIsResumeStateLoading(false);
      }

      setIsLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    setIsProfileLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Unable to load user profile:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      setProfile(null);
      setIsProfileLoading(false);

      return null;
    }

    setProfile(data);
    setIsProfileLoading(false);

    return data;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    let isActive = true;

    async function loadProfile() {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", userId)
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
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    let isActive = true;

    async function loadResumeState() {
      setIsResumeStateLoading(true);

      const { data, error } = await supabase
        .from("resumes")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!isActive) {
        return;
      }

      if (error) {
        console.error("Unable to load user resume state:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        setHasResume(false);
      } else {
        setHasResume(Boolean(data?.id));
      }

      setIsResumeStateLoading(false);
    }

    loadResumeState();

    return () => {
      isActive = false;
    };
  }, [userId]);

  const refreshResumeState = useCallback(async () => {
    if (!userId) {
      setHasResume(false);
      return false;
    }

    setIsResumeStateLoading(true);

    const { data, error } = await supabase
      .from("resumes")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Unable to refresh user resume state:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });

      setHasResume(false);
      setIsResumeStateLoading(false);

      return false;
    }

    const resumeExists = Boolean(data?.id);

    setHasResume(resumeExists);
    setIsResumeStateLoading(false);

    return resumeExists;
  }, [userId]);

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
      hasResume,
      isLoading,
      isProfileLoading,
      isResumeStateLoading,
      refreshProfile,
      refreshResumeState,
      signOut,
    }),
    [
      session,
      user,
      profile,
      hasResume,
      isLoading,
      isProfileLoading,
      isResumeStateLoading,
      refreshProfile,
      refreshResumeState,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
