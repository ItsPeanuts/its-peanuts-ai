import os
from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import models


@dataclass(frozen=True)
class Settings:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Auth / JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-render")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))  # 30 days

    # Bootstrap registration
    BOOTSTRAP_TOKEN: str = os.getenv("BOOTSTRAP_TOKEN", "")
    REGISTRATION_ENABLED: bool = os.getenv("REGISTRATION_ENABLED", "false").lower() == "true"

    def get_current_candidate(
        self,
        creds: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
        db: Session = Depends(get_db),
    ) -> models.Candidate:
        if creds is None or not creds.credentials:
            raise HTTPException(status_code=401, detail="Not authenticated")

        token = creds.credentials
        try:
            payload = jwt.decode(token, self.JWT_SECRET, algorithms=[self.JWT_ALGORITHM])
            sub = payload.get("sub")
            if not sub:
                raise HTTPException(status_code=401, detail="Invalid token")
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

        candidate = db.query(models.Candidate).filter(models.Candidate.id == int(sub)).first()
        if not candidate:
            raise HTTPException(status_code=401, detail="User not found")

        return candidate


settings = Settings()
