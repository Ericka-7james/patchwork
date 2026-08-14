from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import HTTPException

from backend.core.auth import extract_bearer_token, get_authenticated_user


def test_extract_bearer_token_returns_token():
    token = extract_bearer_token("Bearer test-token")

    assert token == "test-token"


@pytest.mark.parametrize(
    "authorization",
    [
        None,
        "",
    ],
)
def test_extract_bearer_token_rejects_missing_header(authorization):
    with pytest.raises(HTTPException) as exc_info:
        extract_bearer_token(authorization)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Missing authorization token."


@pytest.mark.parametrize(
    "authorization",
    [
        "test-token",
        "Basic test-token",
        "Bearer",
        "Bearer ",
    ],
)
def test_extract_bearer_token_rejects_invalid_header(authorization):
    with pytest.raises(HTTPException) as exc_info:
        extract_bearer_token(authorization)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid authorization header."


@pytest.mark.asyncio
async def test_get_authenticated_user_returns_verified_user():
    expected_user = {
        "id": "user-123",
        "email": "ericka@example.com",
    }

    with patch(
        "backend.core.auth.get_supabase_user",
        new=AsyncMock(return_value=expected_user),
    ):
        user = await get_authenticated_user(
            authorization="Bearer valid-token",
        )

    assert user == expected_user


@pytest.mark.asyncio
async def test_get_authenticated_user_rejects_invalid_supabase_token():
    request = httpx.Request(
        "GET",
        "https://example.supabase.co/auth/v1/user",
    )
    response = httpx.Response(
        status_code=401,
        request=request,
    )

    error = httpx.HTTPStatusError(
        "Unauthorized",
        request=request,
        response=response,
    )

    with patch(
        "backend.core.auth.get_supabase_user",
        new=AsyncMock(side_effect=error),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await get_authenticated_user(
                authorization="Bearer invalid-token",
            )

    assert exc_info.value.status_code == 401
    assert (
        exc_info.value.detail
        == "Invalid or expired authorization token."
    )


@pytest.mark.asyncio
async def test_get_authenticated_user_handles_supabase_failure():
    with patch(
        "backend.core.auth.get_supabase_user",
        new=AsyncMock(side_effect=httpx.RequestError("Network error")),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await get_authenticated_user(
                authorization="Bearer valid-token",
            )

    assert exc_info.value.status_code == 502
    assert (
        exc_info.value.detail
        == "Unable to verify authorization with Supabase."
    )


@pytest.mark.asyncio
async def test_get_authenticated_user_rejects_user_without_id():
    with patch(
        "backend.core.auth.get_supabase_user",
        new=AsyncMock(return_value={"email": "ericka@example.com"}),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await get_authenticated_user(
                authorization="Bearer valid-token",
            )

    assert exc_info.value.status_code == 401
    assert (
        exc_info.value.detail
        == "Authenticated user could not be identified."
    )