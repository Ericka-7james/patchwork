import { supabase } from "../lib/supabase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

const JOB_APPLICATION_FIELDS =
  "id, user_id, company, role, status, status_source, applied_at, last_email_at, gmail_thread_id, gmail_message_id, notes, created_at, updated_at";

async function getSupabaseAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || "Unable to verify your session.");
  }

  if (!session?.access_token) {
    throw new Error("You must be signed in to use Job Review.");
  }

  return session.access_token;
}

export async function getGoogleProviderToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || "Unable to load your Google connection.");
  }

  return session?.provider_token ?? null;
}

export async function syncJobApplications() {
  const accessToken = await getSupabaseAccessToken();

  const googleAccessToken = await getGoogleProviderToken();

  if (!googleAccessToken) {
    throw new Error("Connect Gmail before syncing job applications.");
  }

  const response = await fetch(`${API_BASE_URL}/api/job-review/sync`, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${accessToken}`,

      "X-Google-Access-Token": googleAccessToken,
    },
  });

  let result;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.detail || "Unable to sync job applications.");
  }

  return result;
}

export async function getJobApplications(userId) {
  if (!userId) {
    throw new Error("You must be signed in to view Job Review.");
  }

  const { data, error } = await supabase
    .from("job_applications")
    .select(JOB_APPLICATION_FIELDS)
    .eq("user_id", userId)
    .order("last_email_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (error) {
    throw new Error(error.message || "Unable to load job applications.");
  }

  return data ?? [];
}

export async function updateJobApplicationStatus({ jobId, status }) {
  if (!jobId) {
    throw new Error("Job application information is missing.");
  }

  const { data, error } = await supabase
    .from("job_applications")
    .update({
      status,
      status_source: "manual",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .select(JOB_APPLICATION_FIELDS)
    .single();

  if (error) {
    throw new Error(error.message || "Unable to update job status.");
  }

  return data;
}
