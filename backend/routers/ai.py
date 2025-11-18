from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.ai_cv import rewrite_cv
from services.ai_letter import generate_motivation_letter
from services.ai_matcher import score_job_match

router = APIRouter()


# ---------- CV HERSCHRIJVEN ----------

class CVRewriteRequest(BaseModel):
    cv_text: str
    target_role: str | None = None
    language: str = "nl"


class CVRewriteResponse(BaseModel):
    rewritten_cv: str


@router.post("/rewrite-cv", response_model=CVRewriteResponse)
async def ai_rewrite_cv(payload: CVRewriteRequest):
    if not payload.cv_text.strip():
        raise HTTPException(status_code=400, detail="cv_text is required")

    rewritten = rewrite_cv(
        cv_text=payload.cv_text,
        target_role=payload.target_role,
        language=payload.language,
    )
    return CVRewriteResponse(rewritten_cv=rewritten)


# ---------- MOTIVATIEBRIEF ----------

class LetterRequest(BaseModel):
    cv_text: str
    job_description: str
    company_name: str | None = None
    language: str = "nl"
    tone: str = "professioneel"


class LetterResponse(BaseModel):
    letter: str


@router.post("/motivation-letter", response_model=LetterResponse)
async def ai_motivation_letter(payload: LetterRequest):
    if not payload.cv_text.strip():
        raise HTTPException(status_code=400, detail="cv_text is required")
    if not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="job_description is required")

    letter = generate_motivation_letter(
        cv_text=payload.cv_text,
        job_description=payload.job_description,
        company_name=payload.company_name,
        language=payload.language,
        tone=payload.tone,
    )
    return LetterResponse(letter=letter)


# ---------- JOB MATCHER ----------

class MatchRequest(BaseModel):
    candidate_profile_text: str
    job_description: str
    language: str = "nl"


class MatchResponse(BaseModel):
    score: int
    strengths: list[str]
    risks: list[str]
    summary: str


@router.post("/match-job", response_model=MatchResponse)
async def ai_match_job(payload: MatchRequest):
    if not payload.candidate_profile_text.strip():
        raise HTTPException(status_code=400, detail="candidate_profile_text is required")
    if not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="job_description is required")

    result = score_job_match(
        candidate_profile_text=payload.candidate_profile_text,
        job_description=payload.job_description,
        language=payload.language,
    )

    return MatchResponse(
        score=result["score"],
        strengths=result["strengths"],
        risks=result["risks"],
        summary=result["summary"],
    )
