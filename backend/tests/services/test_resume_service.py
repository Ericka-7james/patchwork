from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app import app
from backend.core.auth import get_authenticated_user
from backend.services.resume_service import (
    build_resume_storage_path,
    download_resume_file,
    get_resume_by_id,
)

USER_ID = "7af37c73-f11c-4405-a800-430030e4bf4f"
RESUME_ID = "c3415a62-c40e-4ec6-902e-57840bd95ab9"

client = TestClient(app)


def authenticated_user_override():
    return {
        "id": USER_ID,
        "email": "ericka@example.com",
    }


@pytest.fixture(autouse=True)
def override_authenticated_user():
    app.dependency_overrides[get_authenticated_user] = (
        authenticated_user_override
    )

    yield

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_resume_by_id_returns_accessible_resume():
    expected_resume = {
        "id": RESUME_ID,
        "user_id": USER_ID,
        "original_filename": "resume.pdf",
        "mime_type": "application/pdf",
        "status": "uploaded",
    }

    def handler(request: httpx.Request):
        assert request.headers["authorization"] == "Bearer test-token"
        assert request.headers["apikey"] == "test-publishable-key"

        assert request.url.params["id"] == f"eq.{RESUME_ID}"

        return httpx.Response(
            status_code=200,
            json=[expected_resume],
        )

    transport = httpx.MockTransport(handler)

    async_client = httpx.AsyncClient(
        transport=transport,
    )

    with (
        patch(
            "backend.services.resume_service.SUPABASE_URL",
            "https://example.supabase.co",
        ),
        patch(
            "backend.services.resume_service.get_supabase_headers",
            return_value={
                "apikey": "test-publishable-key",
                "Authorization": "Bearer test-token",
            },
        ),
        patch(
            "backend.services.resume_service.httpx.AsyncClient",
            return_value=async_client,
        ),
    ):
        resume = await get_resume_by_id(
            access_token="test-token",
            resume_id=RESUME_ID,
        )

    assert resume == expected_resume


@pytest.mark.asyncio
async def test_get_resume_by_id_returns_none_when_rls_hides_row():
    def handler(_request: httpx.Request):
        return httpx.Response(
            status_code=200,
            json=[],
        )

    transport = httpx.MockTransport(handler)

    async_client = httpx.AsyncClient(
        transport=transport,
    )

    with (
        patch(
            "backend.services.resume_service.SUPABASE_URL",
            "https://example.supabase.co",
        ),
        patch(
            "backend.services.resume_service.get_supabase_headers",
            return_value={
                "apikey": "test-publishable-key",
                "Authorization": "Bearer test-token",
            },
        ),
        patch(
            "backend.services.resume_service.httpx.AsyncClient",
            return_value=async_client,
        ),
    ):
        resume = await get_resume_by_id(
            access_token="test-token",
            resume_id=RESUME_ID,
        )

    assert resume is None


def test_build_resume_storage_path():
    storage_path = build_resume_storage_path(
        user_id=USER_ID,
        resume_id=RESUME_ID,
    )

    assert storage_path == f"{USER_ID}/{RESUME_ID}/original"


@pytest.mark.asyncio
async def test_download_resume_file_returns_private_object_bytes():
    expected_content = b"fake resume file content"

    def handler(request: httpx.Request):
        assert request.headers["authorization"] == "Bearer test-token"
        assert request.headers["apikey"] == "test-publishable-key"

        assert request.url.path == (
            "/storage/v1/object/authenticated/"
            f"resume-originals/{USER_ID}/{RESUME_ID}/original"
        )

        return httpx.Response(
            status_code=200,
            content=expected_content,
        )

    transport = httpx.MockTransport(handler)

    async_client = httpx.AsyncClient(
        transport=transport,
    )

    with (
        patch(
            "backend.services.resume_service.SUPABASE_URL",
            "https://example.supabase.co",
        ),
        patch(
            "backend.services.resume_service.get_supabase_headers",
            return_value={
                "apikey": "test-publishable-key",
                "Authorization": "Bearer test-token",
            },
        ),
        patch(
            "backend.services.resume_service.httpx.AsyncClient",
            return_value=async_client,
        ),
    ):
        content = await download_resume_file(
            access_token="test-token",
            user_id=USER_ID,
            resume_id=RESUME_ID,
        )

    assert content == expected_content


@pytest.mark.asyncio
async def test_download_resume_file_raises_when_storage_denies_access():
    def handler(_request: httpx.Request):
        return httpx.Response(
            status_code=403,
            json={
                "message": "Forbidden",
            },
        )

    transport = httpx.MockTransport(handler)

    async_client = httpx.AsyncClient(
        transport=transport,
    )

    with (
        patch(
            "backend.services.resume_service.SUPABASE_URL",
            "https://example.supabase.co",
        ),
        patch(
            "backend.services.resume_service.get_supabase_headers",
            return_value={
                "apikey": "test-publishable-key",
                "Authorization": "Bearer test-token",
            },
        ),
        patch(
            "backend.services.resume_service.httpx.AsyncClient",
            return_value=async_client,
        ),
    ):
        with pytest.raises(httpx.HTTPStatusError):
            await download_resume_file(
                access_token="test-token",
                user_id=USER_ID,
                resume_id=RESUME_ID,
            )


def test_parse_endpoint_authorizes_owned_resume():
    resume = {
        "id": RESUME_ID,
        "user_id": USER_ID,
        "original_filename": "resume.pdf",
        "mime_type": "application/pdf",
        "status": "uploaded",
    }

    with patch(
        "backend.app.get_resume_by_id",
        new=AsyncMock(return_value=resume),
    ) as get_resume_mock:
        response = client.post(
            f"/api/resumes/{RESUME_ID}/parse",
            headers={
                "Authorization": "Bearer valid-token",
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "resume_id": RESUME_ID,
        "status": "authorized",
    }

    get_resume_mock.assert_awaited_once_with(
        access_token="valid-token",
        resume_id=RESUME_ID,
    )


def test_parse_endpoint_returns_404_for_inaccessible_resume():
    with patch(
        "backend.app.get_resume_by_id",
        new=AsyncMock(return_value=None),
    ):
        response = client.post(
            f"/api/resumes/{RESUME_ID}/parse",
            headers={
                "Authorization": "Bearer valid-token",
            },
        )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Resume not found.",
    }


def test_parse_endpoint_rejects_mismatched_owner():
    resume = {
        "id": RESUME_ID,
        "user_id": "different-user-id",
        "original_filename": "resume.pdf",
        "mime_type": "application/pdf",
        "status": "uploaded",
    }

    with patch(
        "backend.app.get_resume_by_id",
        new=AsyncMock(return_value=resume),
    ):
        response = client.post(
            f"/api/resumes/{RESUME_ID}/parse",
            headers={
                "Authorization": "Bearer valid-token",
            },
        )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Resume not found.",
    }


def test_parse_endpoint_requires_authorization_header():
    response = client.post(
        f"/api/resumes/{RESUME_ID}/parse",
    )

    assert response.status_code == 401
    assert response.json() == {
        "detail": "Missing authorization token.",
    }


def test_parse_endpoint_rejects_invalid_resume_uuid():
    response = client.post(
        "/api/resumes/not-a-valid-uuid/parse",
        headers={
            "Authorization": "Bearer valid-token",
        },
    )

    assert response.status_code == 422


def test_parse_endpoint_handles_supabase_network_failure():
    with patch(
        "backend.app.get_resume_by_id",
        new=AsyncMock(
            side_effect=httpx.RequestError(
                "Supabase unavailable",
            )
        ),
    ):
        response = client.post(
            f"/api/resumes/{RESUME_ID}/parse",
            headers={
                "Authorization": "Bearer valid-token",
            },
        )

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Unable to retrieve resume from Supabase.",
    }