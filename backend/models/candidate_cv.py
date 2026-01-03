from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship

from backend.database import Base


class CandidateCV(Base):
    __tablename__ = "candidate_cvs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False, index=True)

    file_name = Column(String(255), nullable=True)
    source = Column(String(50), nullable=False, default="upload")  # upload|text
    raw_text = Column(Text, nullable=False)
    extracted_text = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # optioneel, als Candidate model relationship heeft
    candidate = relationship("Candidate", backref="cvs")
