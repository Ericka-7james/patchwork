from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from app import app
from core.auth import get_authenticated_user

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


def create_resume():
    return {
        "id": RESUME_ID,
        "user_id": USER_ID,
        "original_filename": "resume.pdf",
        "mime_type": "application/pdf",
        "status": "parsed",
        "parsed_data": {
            "name": "Ericka James",
            "education": [
                "Spelman College",
            ],
            "experience": [
                {
                    "heading": "Company A — Engineer",
                    "bullets": [
                        "Built production software.",
                        "Added automated tests.",
                    ],
                    "hidden": False,
                },
                {
                    "heading": "Company B — Developer",
                    "bullets": [
                        "Built internal tools.",
                    ],
                    "hidden": False,
                },
            ],
            "projects": [],
            "skills": {},
        },
    }


def test_update_experience_saves_heading_bullets_and_hidden():
    resume = create_resume()

    with (
        patch(
            "app.get_resume_by_id",
            new=AsyncMock(
                return_value=resume
            ),
        ),
        patch(
            "app.update_resume_parsed_data",
            new=AsyncMock(),
        ) as update_mock,
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/0",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "Company A — Senior Engineer",
                "bullets": [
                    "Built production systems.",
                    "Improved test coverage.",
                ],
                "hidden": True,
            },
        )

    assert response.status_code == 200

    payload = response.json()

    assert payload["experience_index"] == 0

    assert payload["experience"] == {
        "heading": "Company A — Senior Engineer",
        "bullets": [
            "Built production systems.",
            "Improved test coverage.",
        ],
        "hidden": True,
    }

    saved_data = payload["parsed_data"]

    assert saved_data["experience"][0] == {
        "heading": "Company A — Senior Engineer",
        "bullets": [
            "Built production systems.",
            "Improved test coverage.",
        ],
        "hidden": True,
    }

    update_mock.assert_awaited_once_with(
        access_token="valid-token",
        resume_id=RESUME_ID,
        parsed_data=saved_data,
    )


def test_update_experience_keeps_other_experiences_unchanged():
    resume = create_resume()

    original_second_experience = (
        resume["parsed_data"]["experience"][1].copy()
    )

    with (
        patch(
            "app.get_resume_by_id",
            new=AsyncMock(
                return_value=resume
            ),
        ),
        patch(
            "app.update_resume_parsed_data",
            new=AsyncMock(),
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/0",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "Updated Company A",
                "bullets": [
                    "Updated bullet.",
                ],
                "hidden": False,
            },
        )

    assert response.status_code == 200

    parsed_data = response.json()[
        "parsed_data"
    ]

    assert parsed_data["experience"][1] == (
        original_second_experience
    )


def test_update_experience_defaults_hidden_to_false():
    resume = create_resume()

    with (
        patch(
            "app.get_resume_by_id",
            new=AsyncMock(
                return_value=resume
            ),
        ),
        patch(
            "app.update_resume_parsed_data",
            new=AsyncMock(),
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/0",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "Company A — Engineer",
                "bullets": [
                    "Built software.",
                ],
            },
        )

    assert response.status_code == 200

    assert response.json()[
        "experience"
    ]["hidden"] is False


def test_update_experience_trims_heading_and_bullets():
    resume = create_resume()

    with (
        patch(
            "app.get_resume_by_id",
            new=AsyncMock(
                return_value=resume
            ),
        ),
        patch(
            "app.update_resume_parsed_data",
            new=AsyncMock(),
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/0",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "  Company A — Engineer  ",
                "bullets": [
                    "  Built software.  ",
                    "",
                    "   ",
                    "  Added tests. ",
                ],
                "hidden": False,
            },
        )

    assert response.status_code == 200

    assert response.json()[
        "experience"
    ] == {
        "heading": "Company A — Engineer",
        "bullets": [
            "Built software.",
            "Added tests.",
        ],
        "hidden": False,
    }


def test_update_experience_returns_404_for_invalid_index():
    resume = create_resume()

    with patch(
        "app.get_resume_by_id",
        new=AsyncMock(
            return_value=resume
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/99",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "Example",
                "bullets": [],
                "hidden": False,
            },
        )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Experience not found.",
    }


def test_update_experience_rejects_negative_index():
    resume = create_resume()

    with patch(
        "app.get_resume_by_id",
        new=AsyncMock(
            return_value=resume
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/-1",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "Example",
                "bullets": [],
                "hidden": False,
            },
        )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Experience not found.",
    }


def test_update_experience_returns_404_when_resume_is_inaccessible():
    with patch(
        "app.get_resume_by_id",
        new=AsyncMock(
            return_value=None
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/0",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "Example",
                "bullets": [],
                "hidden": False,
            },
        )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Resume not found.",
    }


def test_update_experience_rejects_mismatched_owner():
    resume = create_resume()

    resume["user_id"] = "different-user-id"

    with patch(
        "app.get_resume_by_id",
        new=AsyncMock(
            return_value=resume
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/0",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "Example",
                "bullets": [],
                "hidden": False,
            },
        )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Resume not found.",
    }


def test_update_experience_returns_409_without_parsed_data():
    resume = create_resume()

    resume["parsed_data"] = None

    with patch(
        "app.get_resume_by_id",
        new=AsyncMock(
            return_value=resume
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/0",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "Example",
                "bullets": [],
                "hidden": False,
            },
        )

    assert response.status_code == 409

    assert response.json() == {
        "detail": (
            "Resume does not contain "
            "editable parsed data."
        ),
    }


def test_update_experience_returns_409_without_experience_array():
    resume = create_resume()

    resume["parsed_data"]["experience"] = None

    with patch(
        "app.get_resume_by_id",
        new=AsyncMock(
            return_value=resume
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/0",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "Example",
                "bullets": [],
                "hidden": False,
            },
        )

    assert response.status_code == 409

    assert response.json() == {
        "detail": (
            "Resume does not contain "
            "editable experience data."
        ),
    }


def test_update_experience_rejects_empty_heading():
    resume = create_resume()

    with patch(
        "app.get_resume_by_id",
        new=AsyncMock(
            return_value=resume
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/0",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "",
                "bullets": [],
                "hidden": False,
            },
        )

    assert response.status_code == 422


def test_update_experience_requires_authorization_header():
    response = client.patch(
        f"/api/resumes/{RESUME_ID}/experience/0",
        json={
            "heading": "Example",
            "bullets": [],
            "hidden": False,
        },
    )

    assert response.status_code == 401

    assert response.json() == {
        "detail": "Missing authorization token.",
    }


def test_update_experience_returns_502_when_supabase_read_fails():
    with patch(
        "app.get_resume_by_id",
        new=AsyncMock(
            side_effect=httpx.RequestError(
                "Supabase unavailable"
            )
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/0",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "Example",
                "bullets": [],
                "hidden": False,
            },
        )

    assert response.status_code == 502

    assert response.json() == {
        "detail": (
            "Unable to retrieve resume "
            "from Supabase."
        ),
    }


def test_update_experience_returns_502_when_supabase_write_fails():
    resume = create_resume()

    with (
        patch(
            "app.get_resume_by_id",
            new=AsyncMock(
                return_value=resume
            ),
        ),
        patch(
            "app.update_resume_parsed_data",
            new=AsyncMock(
                side_effect=httpx.RequestError(
                    "Supabase unavailable"
                )
            ),
        ),
    ):
        response = client.patch(
            f"/api/resumes/{RESUME_ID}/experience/0",
            headers={
                "Authorization": "Bearer valid-token",
            },
            json={
                "heading": "Example",
                "bullets": [],
                "hidden": True,
            },
        )

    assert response.status_code == 502

    assert response.json() == {
        "detail": (
            "Unable to update resume "
            "in Supabase."
        ),
    }