from uuid import UUID

import httpx
from fastapi import (
    Depends,
    FastAPI,
    Header,
    HTTPException,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core.auth import (
    extract_bearer_token,
    get_authenticated_user,
)
from parsing.extract import (
    DocxExtractionError,
    PdfExtractionError,
    UnsupportedResumeTypeError,
    extract_resume_text,
)
from parsing.structure import (
    parse_resume_structure,
)
from services.gmail_service import (
    fetch_job_messages,
)
from services.job_review_service import (
    build_job_application,
    save_job_applications,
)
from services.resume_service import (
    download_resume_file,
    get_resume_by_id,
    initialize_profile_contact,
    update_profile_contact,
    update_resume_parsed_data,
    update_resume_parse_state,
)


class ExperienceUpdate(BaseModel):
    heading: str = Field(
        min_length=1
    )

    bullets: list[str] = Field(
        default_factory=list
    )

    hidden: bool = False


class ContactUpdate(BaseModel):
    location: str = ""
    address: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    github: str = ""
    website: str = ""
    portfolio: str = ""

    other: list[str] = Field(
        default_factory=list
    )


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://patchwork-pink.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
    }


@app.get("/api/auth/me")
async def get_current_user(
    user: dict = Depends(
        get_authenticated_user
    ),
):
    return {
        "id": user["id"],
        "email": user.get(
            "email"
        ),
    }


@app.post(
    "/api/job-review/sync"
)
async def sync_job_review(
    authorization: str | None = Header(
        default=None
    ),
    google_access_token: str | None = Header(
        default=None,
        alias=(
            "X-Google-Access-Token"
        ),
    ),
    user: dict = Depends(
        get_authenticated_user
    ),
):
    access_token = (
        extract_bearer_token(
            authorization
        )
    )

    if not google_access_token:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Connect Gmail before "
                "syncing job applications."
            ),
        )

    try:
        messages = (
            await fetch_job_messages(
                google_access_token
            )
        )

    except httpx.HTTPStatusError as error:
        if (
            error.response.status_code
            == status.HTTP_401_UNAUTHORIZED
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Your Gmail connection "
                    "expired. Reconnect Gmail "
                    "and try again."
                ),
            ) from error

        if (
            error.response.status_code
            == status.HTTP_403_FORBIDDEN
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "PatchWork does not have "
                    "permission to read Gmail. "
                    "Reconnect Gmail and approve "
                    "read-only access."
                ),
            ) from error

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to retrieve job "
                "emails from Gmail."
            ),
        ) from error

    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to connect to Gmail."
            ),
        ) from error

    applications = [
        build_job_application(
            message
        )
        for message in messages
    ]

    try:
        saved_applications = (
            await save_job_applications(
                access_token=(
                    access_token
                ),
                user_id=user["id"],
                applications=(
                    applications
                ),
            )
        )

    except httpx.HTTPStatusError as error:
        if (
            error.response.status_code
            in {
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            }
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Unable to authorize "
                    "Job Review access."
                ),
            ) from error

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to save Job Review "
                "data in Supabase."
            ),
        ) from error

    except (
        httpx.HTTPError,
        RuntimeError,
        ValueError,
    ) as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to save Job Review "
                "data in Supabase."
            ),
        ) from error

    return {
        "status": "synced",
        "message_count": len(
            messages
        ),
        "application_count": len(
            saved_applications
        ),
        "applications": (
            saved_applications
        ),
    }


@app.post(
    "/api/resumes/{resume_id}/parse"
)
async def parse_resume(
    resume_id: UUID,
    authorization: str | None = Header(
        default=None
    ),
    user: dict = Depends(
        get_authenticated_user
    ),
):
    access_token = (
        extract_bearer_token(
            authorization
        )
    )

    try:
        resume = await get_resume_by_id(
            access_token=access_token,
            resume_id=str(
                resume_id
            ),
        )

    except httpx.HTTPStatusError as error:
        if error.response.status_code in {
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        }:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Unable to authorize "
                    "resume access."
                ),
            ) from error

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to retrieve resume "
                "from Supabase."
            ),
        ) from error

    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to retrieve resume "
                "from Supabase."
            ),
        ) from error

    if not resume:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Resume not found."
            ),
        )

    if (
        resume.get("user_id")
        != user["id"]
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Resume not found."
            ),
        )

    try:
        await update_resume_parse_state(
            access_token=access_token,
            resume_id=resume["id"],
            status="parsing",
        )

        file_bytes = (
            await download_resume_file(
                access_token=(
                    access_token
                ),
                user_id=user["id"],
                resume_id=(
                    resume["id"]
                ),
            )
        )

        extracted_text = (
            extract_resume_text(
                file_bytes=file_bytes,
                mime_type=(
                    resume[
                        "mime_type"
                    ]
                ),
            )
        )

        parsed_data = (
            parse_resume_structure(
                extracted_text
            )
        )

        await initialize_profile_contact(
            access_token=access_token,
            user_id=user["id"],
            auth_email=user.get(
                "email"
            ),
            parsed_contact=(
                parsed_data.get(
                    "contact"
                )
            ),
        )

        await update_resume_parse_state(
            access_token=access_token,
            resume_id=resume["id"],
            status="parsed",
            parsed_data=(
                parsed_data
            ),
        )

    except (
        PdfExtractionError,
        DocxExtractionError,
        UnsupportedResumeTypeError,
        httpx.HTTPError,
        RuntimeError,
        ValueError,
    ) as error:
        try:
            await update_resume_parse_state(
                access_token=(
                    access_token
                ),
                resume_id=(
                    resume["id"]
                ),
                status="error",
                parse_error=str(
                    error
                ),
            )
        except (
            httpx.HTTPError,
            RuntimeError,
        ):
            pass

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to parse resume."
            ),
        ) from error

    return {
        "resume_id": resume["id"],
        "status": "parsed",
        "parsed_data": parsed_data,
    }


@app.patch(
    "/api/resumes/{resume_id}/experience/{experience_index}"
)
async def update_experience(
    resume_id: UUID,
    experience_index: int,
    experience_update: ExperienceUpdate,
    authorization: str | None = Header(
        default=None
    ),
    user: dict = Depends(
        get_authenticated_user
    ),
):
    access_token = (
        extract_bearer_token(
            authorization
        )
    )

    try:
        resume = await get_resume_by_id(
            access_token=access_token,
            resume_id=str(
                resume_id
            ),
        )

    except httpx.HTTPStatusError as error:
        if error.response.status_code in {
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        }:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Unable to authorize "
                    "resume access."
                ),
            ) from error

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to retrieve resume "
                "from Supabase."
            ),
        ) from error

    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to retrieve resume "
                "from Supabase."
            ),
        ) from error

    if not resume:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Resume not found."
            ),
        )

    if (
        resume.get("user_id")
        != user["id"]
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Resume not found."
            ),
        )

    parsed_data = resume.get(
        "parsed_data"
    )

    if not isinstance(
        parsed_data,
        dict,
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Resume does not contain "
                "editable parsed data."
            ),
        )

    experiences = (
        parsed_data.get(
            "experience"
        )
    )

    if not isinstance(
        experiences,
        list,
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Resume does not contain "
                "editable experience data."
            ),
        )

    if (
        experience_index < 0
        or experience_index
        >= len(experiences)
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Experience not found."
            ),
        )

    heading = (
        experience_update
        .heading
        .strip()
    )

    if not heading:
        raise HTTPException(
            status_code=(
                status.HTTP_422_UNPROCESSABLE_ENTITY
            ),
            detail=(
                "Experience heading "
                "cannot be empty."
            ),
        )

    bullets = [
        bullet.strip()
        for bullet
        in experience_update.bullets
        if bullet.strip()
    ]

    current_experience = (
        experiences[
            experience_index
        ]
        if isinstance(
            experiences[
                experience_index
            ],
            dict,
        )
        else {}
    )

    updated_experience = {
        **current_experience,
        "heading": heading,
        "bullets": bullets,
        "hidden": (
            experience_update.hidden
        ),
    }

    updated_experiences = [
        *experiences
    ]

    updated_experiences[
        experience_index
    ] = updated_experience

    updated_parsed_data = {
        **parsed_data,
        "experience": (
            updated_experiences
        ),
    }

    try:
        await update_resume_parsed_data(
            access_token=access_token,
            resume_id=(
                resume["id"]
            ),
            parsed_data=(
                updated_parsed_data
            ),
        )

    except httpx.HTTPStatusError as error:
        if error.response.status_code in {
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        }:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Unable to authorize "
                    "resume update."
                ),
            ) from error

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to update resume "
                "in Supabase."
            ),
        ) from error

    except (
        httpx.HTTPError,
        RuntimeError,
    ) as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to update resume "
                "in Supabase."
            ),
        ) from error

    return {
        "resume_id": resume["id"],
        "experience_index": (
            experience_index
        ),
        "experience": (
            updated_experience
        ),
        "parsed_data": (
            updated_parsed_data
        ),
    }


@app.patch(
    "/api/profile/contact"
)
async def update_contact(
    contact_update: ContactUpdate,
    authorization: str | None = Header(
        default=None
    ),
    user: dict = Depends(
        get_authenticated_user
    ),
):
    access_token = (
        extract_bearer_token(
            authorization
        )
    )

    contact = {
        "resume_email": (
            contact_update.email
        ),
        "resume_phone": (
            contact_update.phone
        ),
        "location": (
            contact_update.location
        ),
        "address": (
            contact_update.address
        ),
        "linkedin": (
            contact_update.linkedin
        ),
        "github": (
            contact_update.github
        ),
        "website": (
            contact_update.website
        ),
        "portfolio": (
            contact_update.portfolio
        ),
        "contact_other": (
            contact_update.other
        ),
        "contact_initialized": True,
    }

    try:
        updated_profile = (
            await update_profile_contact(
                access_token=access_token,
                user_id=user["id"],
                contact=contact,
            )
        )

    except httpx.HTTPStatusError as error:
        if error.response.status_code in {
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        }:
            raise HTTPException(
                status_code=(
                    status.HTTP_401_UNAUTHORIZED
                ),
                detail=(
                    "Unable to authorize "
                    "profile update."
                ),
            ) from error

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to update profile "
                "contact information."
            ),
        ) from error

    except (
        httpx.HTTPError,
        RuntimeError,
    ) as error:
        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "Unable to update profile "
                "contact information."
            ),
        ) from error

    return {
        "profile": (
            updated_profile
        ),
    }