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

from backend.core.auth import (
    extract_bearer_token,
    get_authenticated_user,
)
from backend.parsing.extract import (
    DocxExtractionError,
    PdfExtractionError,
    UnsupportedResumeTypeError,
    extract_resume_text,
)
from backend.parsing.structure import (
    parse_resume_structure,
)
from backend.services.resume_service import (
    download_resume_file,
    get_resume_by_id,
    update_resume_parse_state,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
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