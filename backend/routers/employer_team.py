"""
Werkgever team-beheer: self-service collega's toevoegen/verwijderen.

Regels:
- Alleen e-mailadressen met hetzelfde domein als de ingelogde werkgever
- Max 4 leden per org (owner + 3 collega's)
- Account wordt direct aangemaakt + welkomstmail verstuurd
"""

import secrets
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy.orm import Session

from backend.db import get_db
from backend import models
from backend.routers.auth import get_current_user, require_role
from backend.security import hash_password
from backend.services.email import send_team_invite_email

router = APIRouter(prefix="/employer/team", tags=["employer-team"])

MAX_TEAM_SIZE = 4  # owner + max 3 collega's


def get_email_domain(email: str) -> str:
    return email.lower().split("@")[-1]


class AddTeamMemberRequest(BaseModel):
    full_name: str
    email: EmailStr


class TeamMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: str
    is_self: bool


class AddTeamMemberResponse(TeamMemberOut):
    temp_password: str


@router.get("", response_model=List[TeamMemberOut])
def list_team(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "employer")

    if not current_user.org_id:
        return [TeamMemberOut(
            id=current_user.id,
            full_name=current_user.full_name,
            email=current_user.email,
            is_self=True,
        )]

    members = db.query(models.User).filter(
        models.User.org_id == current_user.org_id
    ).order_by(models.User.id.asc()).all()

    return [
        TeamMemberOut(
            id=m.id,
            full_name=m.full_name,
            email=m.email,
            is_self=(m.id == current_user.id),
        )
        for m in members
    ]


@router.post("", response_model=AddTeamMemberResponse, status_code=201)
def add_team_member(
    payload: AddTeamMemberRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "employer")

    # 1. Domeincheck
    new_domain = get_email_domain(str(payload.email))
    my_domain = get_email_domain(current_user.email)
    if new_domain != my_domain:
        raise HTTPException(
            status_code=403,
            detail=f"Alleen e-mailadressen met @{my_domain} zijn toegestaan.",
        )

    # 2. E-mail al in gebruik?
    if db.query(models.User).filter(models.User.email == str(payload.email).lower()).first():
        raise HTTPException(status_code=409, detail="Dit e-mailadres is al in gebruik.")

    # 3. Auto-maak org aan als de werkgever nog geen org heeft
    if not current_user.org_id:
        org = models.Organisation(name=my_domain)
        db.add(org)
        db.flush()
        current_user.org_id = org.id

    org_id = current_user.org_id

    # 4. Teamgrootte check
    current_size = db.query(models.User).filter(models.User.org_id == org_id).count()
    if current_size >= MAX_TEAM_SIZE:
        raise HTTPException(
            status_code=403,
            detail=f"Team is vol. Maximum is {MAX_TEAM_SIZE - 1} collega's naast jezelf.",
        )

    # 5. Tijdelijk wachtwoord
    temp_password = secrets.token_urlsafe(8)

    # 6. Account aanmaken
    new_user = models.User(
        email=str(payload.email).lower().strip(),
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(temp_password),
        role="employer",
        plan=current_user.plan or "gratis",
        org_id=org_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 7. Welkomstmail
    org = db.query(models.Organisation).filter(models.Organisation.id == org_id).first()
    try:
        send_team_invite_email(
            to_email=new_user.email,
            full_name=new_user.full_name,
            inviter_name=current_user.full_name,
            org_name=org.name if org else my_domain,
            temp_password=temp_password,
        )
    except Exception:
        pass  # E-mail fout is niet fataal

    return AddTeamMemberResponse(
        id=new_user.id,
        full_name=new_user.full_name,
        email=new_user.email,
        is_self=False,
        temp_password=temp_password,
    )


@router.delete("/{user_id}", status_code=204)
def remove_team_member(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_role(current_user, "employer")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Je kunt je eigen account niet verwijderen.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Gebruiker niet gevonden.")
    if not current_user.org_id or user.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Deze gebruiker behoort niet tot jouw team.")

    db.delete(user)
    db.commit()
