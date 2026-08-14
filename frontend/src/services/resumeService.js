import { supabase } from "../lib/supabase";

const RESUME_BUCKET = "resume-originals";

function buildResumeStoragePath(userId, resumeId) {
  return `${userId}/${resumeId}/original`;
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

  return resume;
}
