from backend.models.base import Base
from backend.models.organisation import Organisation
from backend.models.user import User
from backend.models.vacancy import Vacancy
from backend.models.candidate_cv import CandidateCV
from backend.models.application import Application
from backend.models.intake import IntakeQuestion, IntakeAnswer
from backend.models.ai_result import AIResult
from backend.models.recruiter_chat import RecruiterChatMessage
from backend.models.interview_session import InterviewSession
from backend.models.crm_sync import CRMSync
from backend.models.virtual_interview import VirtualInterviewSession
from backend.models.scraped_vacancy import ScrapedVacancy
from backend.models.promotion import PromotionRequest

__all__ = [
    "Base",
    "Organisation",
    "User",
    "Vacancy",
    "CandidateCV",
    "Application",
    "IntakeQuestion",
    "IntakeAnswer",
    "AIResult",
    "RecruiterChatMessage",
    "InterviewSession",
    "CRMSync",
    "VirtualInterviewSession",
    "ScrapedVacancy",
    "PromotionRequest",
]





