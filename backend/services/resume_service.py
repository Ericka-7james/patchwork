import httpx

from core.supabase_client import (
    SUPABASE_URL,
    get_supabase_headers,
)


RESUME_BUCKET = "resume-originals"

PROFILE_CONTACT_SELECT = (
    "id,phone,resume_email,resume_phone,"
    "location,address,linkedin,github,"
    "website,portfolio,contact_other,"
    "contact_initialized"
)


def _clean_text(
    value,
) -> str:
    return (
        value.strip()
        if isinstance(value, str)
        else ""
    )


def _clean_text_list(
    values,
) -> list[str]:
    if not isinstance(values, list):
        return []

    return [
        value.strip()
        for value in values
        if isinstance(value, str)
        and value.strip()
    ]


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


async def get_profile_by_id(
    access_token: str,
    user_id: str,
) -> dict | None:
    if not SUPABASE_URL:
        raise RuntimeError(
            "SUPABASE_URL is not configured."
        )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers=get_supabase_headers(
                access_token
            ),
            params={
                "id": f"eq.{user_id}",
                "select": PROFILE_CONTACT_SELECT,
            },
        )

    response.raise_for_status()

    profiles = response.json()

    if not profiles:
        return None

    return profiles[0]


async def initialize_profile_contact(
    access_token: str,
    user_id: str,
    *,
    auth_email: str | None,
    parsed_contact: dict | None,
) -> dict | None:
    profile = await get_profile_by_id(
        access_token=access_token,
        user_id=user_id,
    )

    if not profile:
        return None

    if profile.get(
        "contact_initialized"
    ) is True:
        return profile

    contact = (
        parsed_contact
        if isinstance(
            parsed_contact,
            dict,
        )
        else {}
    )

    existing_email = _clean_text(
        profile.get(
            "resume_email"
        )
    )

    existing_account_phone = _clean_text(
        profile.get(
            "phone"
        )
    )

    existing_resume_phone = _clean_text(
        profile.get(
            "resume_phone"
        )
    )

    existing_other = _clean_text_list(
        profile.get(
            "contact_other"
        )
    )

    payload = {
        "resume_email": (
            existing_email
            or _clean_text(auth_email)
            or _clean_text(
                contact.get("email")
            )
        ),
        "resume_phone": (
            existing_resume_phone
            or existing_account_phone
            or _clean_text(
                contact.get("phone")
            )
        ),
        "location": (
            _clean_text(
                profile.get(
                    "location"
                )
            )
            or _clean_text(
                contact.get(
                    "location"
                )
            )
        ),
        "address": (
            _clean_text(
                profile.get(
                    "address"
                )
            )
            or _clean_text(
                contact.get(
                    "address"
                )
            )
        ),
        "linkedin": (
            _clean_text(
                profile.get(
                    "linkedin"
                )
            )
            or _clean_text(
                contact.get(
                    "linkedin"
                )
            )
        ),
        "github": (
            _clean_text(
                profile.get(
                    "github"
                )
            )
            or _clean_text(
                contact.get(
                    "github"
                )
            )
        ),
        "website": (
            _clean_text(
                profile.get(
                    "website"
                )
            )
            or _clean_text(
                contact.get(
                    "website"
                )
            )
        ),
        "portfolio": (
            _clean_text(
                profile.get(
                    "portfolio"
                )
            )
            or _clean_text(
                contact.get(
                    "portfolio"
                )
            )
        ),
        "contact_other": (
            existing_other
            or _clean_text_list(
                contact.get(
                    "other"
                )
            )
        ),
        "contact_initialized": True,
    }

    return await update_profile_contact(
        access_token=access_token,
        user_id=user_id,
        contact=payload,
        preserve_contact_initialized=True,
    )


async def update_profile_contact(
    access_token: str,
    user_id: str,
    *,
    contact: dict,
    preserve_contact_initialized: bool = False,
) -> dict:
    if not SUPABASE_URL:
        raise RuntimeError(
            "SUPABASE_URL is not configured."
        )

    payload = {
        "resume_email": _clean_text(
            contact.get(
                "resume_email"
            )
        ),
        "resume_phone": _clean_text(
            contact.get(
                "resume_phone"
            )
        ),
        "location": _clean_text(
            contact.get(
                "location"
            )
        ),
        "address": _clean_text(
            contact.get(
                "address"
            )
        ),
        "linkedin": _clean_text(
            contact.get(
                "linkedin"
            )
        ),
        "github": _clean_text(
            contact.get(
                "github"
            )
        ),
        "website": _clean_text(
            contact.get(
                "website"
            )
        ),
        "portfolio": _clean_text(
            contact.get(
                "portfolio"
            )
        ),
        "contact_other": _clean_text_list(
            contact.get(
                "contact_other"
            )
        ),
        "contact_initialized": True,
    }

    if preserve_contact_initialized:
        payload[
            "contact_initialized"
        ] = bool(
            contact.get(
                "contact_initialized",
                True,
            )
        )

    async with httpx.AsyncClient() as client:
        response = await client.patch(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers={
                **get_supabase_headers(
                    access_token
                ),
                "Prefer": (
                    "return=representation"
                ),
            },
            params={
                "id": f"eq.{user_id}",
            },
            json=payload,
        )

    response.raise_for_status()

    profiles = response.json()

    if not profiles:
        raise RuntimeError(
            "Updated profile could not be returned."
        )

    return profiles[0]


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