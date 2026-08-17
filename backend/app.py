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
from services.resume_service import (
    download_resume_file,
    get_resume_by_id,
    update_resume_parsed_data,
    update_resume_parse_state,
)


class ExperienceUpdate(BaseModel):
    heading: str = Field(min_length=1)

    bullets: list[str] = Field(
        default_factory=list
    )

    hidden: bool = False


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
        "email": user.get("email"),
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
    access_token = extract_bearer_token(
        authorization
    )

    try:
        resume = await get_resume_by_id(
            access_token=access_token,
            resume_id=str(resume_id),
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
            detail="Resume not found.",
        )

    if resume.get("user_id") != user["id"]:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Resume not found.",
        )

    try:
        await update_resume_parse_state(
            access_token=access_token,
            resume_id=resume["id"],
            status="parsing",
        )

        file_bytes = await download_resume_file(
            access_token=access_token,
            user_id=user["id"],
            resume_id=resume["id"],
        )

        extracted_text = extract_resume_text(
            file_bytes=file_bytes,
            mime_type=resume["mime_type"],
        )

        parsed_data = parse_resume_structure(
            extracted_text
        )

        await update_resume_parse_state(
            access_token=access_token,
            resume_id=resume["id"],
            status="parsed",
            parsed_data=parsed_data,
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
                access_token=access_token,
                resume_id=resume["id"],
                status="error",
                parse_error=str(error),
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
            detail="Unable to parse resume.",
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
    access_token = extract_bearer_token(
        authorization
    )

    try:
        resume = await get_resume_by_id(
            access_token=access_token,
            resume_id=str(resume_id),
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
            detail="Resume not found.",
        )

    if resume.get("user_id") != user["id"]:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Resume not found.",
        )

    parsed_data = resume.get(
        "parsed_data"
    )

    if not isinstance(parsed_data, dict):
        raise HTTPException(
            status_code=(
                status.HTTP_409_CONFLICT
            ),
            detail=(
                "Resume does not contain "
                "editable parsed data."
            ),
        )

    experiences = parsed_data.get(
        "experience"
    )

    if not isinstance(experiences, list):
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
        or experience_index >= len(experiences)
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Experience not found.",
        )

    heading = experience_update.heading.strip()

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
        for bullet in experience_update.bullets
        if bullet.strip()
    ]

    current_experience = (
        experiences[experience_index]
        if isinstance(
            experiences[experience_index],
            dict,
        )
        else {}
    )

    updated_experience = {
        **current_experience,
        "heading": heading,
        "bullets": bullets,
        "hidden": experience_update.hidden,
    }

    updated_experiences = [
        *experiences
    ]

    updated_experiences[
        experience_index
    ] = updated_experience

    updated_parsed_data = {
        **parsed_data,
        "experience": updated_experiences,
    }

    try:
        await update_resume_parsed_data(
            access_token=access_token,
            resume_id=resume["id"],
            parsed_data=updated_parsed_data,
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
        "experience_index": experience_index,
        "experience": updated_experience,
        "parsed_data": updated_parsed_data,
    }