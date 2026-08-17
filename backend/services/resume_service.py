import httpx

from core.supabase_client import (
    SUPABASE_URL,
    get_supabase_headers,
)

RESUME_BUCKET = "resume-originals"


async def get_resume_by_id(
    access_token: str,
    resume_id: str,
) -> dict | None:
    if not SUPABASE_URL:
        raise RuntimeError(
            "SUPABASE_URL is not configured."
        )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/resumes",
            headers=get_supabase_headers(
                access_token
            ),
            params={
                "id": f"eq.{resume_id}",
                "select": (
                    "id,user_id,original_filename,"
                    "mime_type,status,parsed_data"
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
    return (
        f"{user_id}/"
        f"{resume_id}/original"
    )


async def download_resume_file(
    access_token: str,
    user_id: str,
    resume_id: str,
) -> bytes:
    if not SUPABASE_URL:
        raise RuntimeError(
            "SUPABASE_URL is not configured."
        )

    storage_path = build_resume_storage_path(
        user_id=user_id,
        resume_id=resume_id,
    )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            (
                f"{SUPABASE_URL}/storage/v1/"
                "object/authenticated/"
                f"{RESUME_BUCKET}/{storage_path}"
            ),
            headers=get_supabase_headers(
                access_token
            ),
        )

    response.raise_for_status()

    return response.content


async def update_resume_parse_state(
    access_token: str,
    resume_id: str,
    *,
    status: str,
    parsed_data: dict | None = None,
    parse_error: str | None = None,
) -> None:
    if not SUPABASE_URL:
        raise RuntimeError(
            "SUPABASE_URL is not configured."
        )

    payload = {
        "status": status,
        "parsed_data": parsed_data,
        "parse_error": parse_error,
    }

    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{SUPABASE_URL}/rest/v1/resumes",
            headers={
                **get_supabase_headers(
                    access_token
                ),
                "Prefer": "return=minimal",
            },
            params={
                "id": f"eq.{resume_id}",
            },
            json=payload,
        )

    response.raise_for_status()


async def update_resume_parsed_data(
    access_token: str,
    resume_id: str,
    *,
    parsed_data: dict,
) -> None:
    if not SUPABASE_URL:
        raise RuntimeError(
            "SUPABASE_URL is not configured."
        )

    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{SUPABASE_URL}/rest/v1/resumes",
            headers={
                **get_supabase_headers(
                    access_token
                ),
                "Prefer": "return=minimal",
            },
            params={
                "id": f"eq.{resume_id}",
            },
            json={
                "parsed_data": parsed_data,
            },
        )

    response.raise_for_status()