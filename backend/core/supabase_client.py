import os
from pathlib import Path

import httpx
from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BACKEND_DIR / ".env"

load_dotenv(ENV_PATH)


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY = os.getenv(
    "SUPABASE_PUBLISHABLE_KEY"
)


def get_supabase_headers(
    access_token: str,
) -> dict[str, str]:
    if not SUPABASE_PUBLISHABLE_KEY:
        raise RuntimeError(
            "SUPABASE_PUBLISHABLE_KEY is not configured."
        )

    return {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": f"Bearer {access_token}",
    }


async def get_supabase_user(
    access_token: str,
) -> dict:
    if not SUPABASE_URL:
        raise RuntimeError(
            "SUPABASE_URL is not configured."
        )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=get_supabase_headers(
                access_token
            ),
        )

    response.raise_for_status()

    return response.json()