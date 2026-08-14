import { supabase } from "../lib/supabase";

const RESUME_BUCKET = "resume-originals";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function buildResumeStoragePath(userId, resumeId) {
  return `${userId}/${resumeId}/original`;
}

async function parseResume(resumeId) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || "Unable to verify your session.");
  }

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("You must be signed in to parse a resume.");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/resumes/${resumeId}/parse`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  let result;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.detail || "Unable to parse your resume.");
  }

  return result;
}

export async function uploadResume({ userId, file }) {
  if (!userId) {
    throw new Error("You must be signed in to upload a resume.");
  }

  if (!file) {
    throw new Error("Please choose a resume to upload.");
  }

  const { data: resume, error: resumeError } = await supabase
    .from("resumes")
    .upsert(
      {
        user_id: userId,
        original_filename: file.name,
        mime_type: file.type,
        status: "uploaded",
        parsed_data: null,
        parse_error: null,
      },
      {
        onConflict: "user_id",
      }
    )
    .select("id, user_id, original_filename, mime_type, status")
    .single();

  if (resumeError) {
    throw new Error(resumeError.message || "Unable to save resume details.");
  }

  const storagePath = buildResumeStoragePath(userId, resume.id);

  const { error: uploadError } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Unable to upload your resume.");
  }

  const parseResult = await parseResume(resume.id);

  return {
    ...resume,
    status: parseResult.status,
    parsed_data: parseResult.parsed_data,
  };
}
