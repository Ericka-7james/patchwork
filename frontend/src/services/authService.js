import { supabase } from "../lib/supabase";

export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}/dashboard`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw new Error(error.message || "Unable to continue with Google.");
  }

  return data;
}

export async function connectGmail() {
  const redirectTo = `${window.location.origin}/job-review`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",

    options: {
      redirectTo,

      scopes: "https://www.googleapis.com/auth/gmail.readonly",

      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    throw new Error(error.message || "Unable to connect Gmail.");
  }

  return data;
}
