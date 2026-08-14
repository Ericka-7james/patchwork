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
from backend.services.resume_service import get_resume_by_id

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/auth/me")
async def get_current_user(
    user: dict = Depends(get_authenticated_user),
):
    return {
        "id": user["id"],
        "email": user.get("email"),
    }


@app.post("/api/resumes/{resume_id}/parse")
async def authorize_resume_parse(
    resume_id: UUID,
    authorization: str | None = Header(default=None),
    user: dict = Depends(get_authenticated_user),
):
    access_token = extract_bearer_token(authorization)

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
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to authorize resume access.",
            ) from error

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve resume from Supabase.",
        ) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve resume from Supabase.",
        ) from error

    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    if resume.get("user_id") != user["id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    return {
        "resume_id": resume["id"],
        "status": "authorized",
    }