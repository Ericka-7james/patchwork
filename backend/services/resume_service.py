import httpx

from backend.core.supabase_client import (
    SUPABASE_URL,
    get_supabase_headers,
)

RESUME_BUCKET = "resume-originals"


async def get_resume_by_id(
    access_token: str,
    resume_id: str,
) -> dict | None:
    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL is not configured.")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/resumes",
            headers=get_supabase_headers(access_token),
            params={
                "id": f"eq.{resume_id}",
                "select": (
                    "id,user_id,original_filename,"
                    "mime_type,status"
                ),
            },
        )

    response.raise_for_status()

    resumes = response.json()

    if not resumes:
        return None

    return resumes[0]


def build_resume_storage_path(
    user_id: str,
    resume_id: str,
) -> str:
    return f"{user_id}/{resume_id}/original"


async def download_resume_file(
    access_token: str,
    user_id: str,
    resume_id: str,
) -> bytes:
    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL is not configured.")

    storage_path = build_resume_storage_path(
        user_id=user_id,
        resume_id=resume_id,
    )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            (
                f"{SUPABASE_URL}/storage/v1/object/authenticated/"
                f"{RESUME_BUCKET}/{storage_path}"
            ),
            headers=get_supabase_headers(access_token),
        )

    response.raise_for_status()

    return response.content