import httpx
from fastapi import Header, HTTPException, status

from backend.core.supabase_client import get_supabase_user


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token.",
        )

    scheme, separator, token = authorization.partition(" ")

    if separator != " " or scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header.",
        )

    return token.strip()


async def get_authenticated_user(
    authorization: str | None = Header(default=None),
) -> dict:
    access_token = extract_bearer_token(authorization)

    try:
        user = await get_supabase_user(access_token)
    except httpx.HTTPStatusError as error:
        if error.response.status_code in {
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        }:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authorization token.",
            ) from error

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to verify authorization with Supabase.",
        ) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to verify authorization with Supabase.",
        ) from error

    if not user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user could not be identified.",
        )

    return user