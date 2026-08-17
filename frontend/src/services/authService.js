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
