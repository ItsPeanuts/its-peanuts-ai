import json
from typing import List, Dict

from sqlalchemy.orm import Session

from openai import OpenAI
from backend.config import OPENAI_API_KEY
from backend import models

client = OpenAI(api_key=OPENAI_API_KEY)


def rank_candidates_for_job(
    db: Session,
    job: models.Job,
    candidates: List[models.CandidateProfile],
) -> List[Dict]:
    """
    Laat AI alle kandidaten voor één vacature beoordelen en rangschikken.
    - Leest vacaturetekst
    - Leest CV-teksten
    - Geeft per kandidaat een score (0–100) + korte uitleg terug
    - Slaat match_score op in de database
    - Retourneert een gesorteerde lijst (beste eerst)
    """

    if not candidates:
        return []

    job_text = f"Titel: {job.title}\nLocatie: {job.location or 'Onbekend'}\n\nOmschrijving:\n{job.description}"

    candidates_payload = []
    for c in candidates:
        name_or_email = c.full_name or c.email or f"Kandidaat {c.id}"
        candidates_payload.append(
            {
                "id": c.id,
                "name": name_or_email,
                "cv_text": c.cv_text[:8000],  # safeguard
            }
        )

    system_prompt = (
        "Je bent een ervaren recruitment consultant. "
        "Je beoordeelt kandidaten objectief op basis van hun CV en de vacaturetekst. "
        "Je geeft een matchscore tussen 0 en 100 en een korte Nederlandse uitleg per kandidaat."
    )

    user_prompt = {
        "job": job_text,
        "candidates": candidates_payload,
        "instructions": (
            "Geef je antwoord als geldig JSON-object met één key 'rankings', "
            "die een array bevat van objecten met exact deze velden: "
            "{'candidate_id': int, 'match_score': int, 'explanation': str}. "
            "Gebruik Nederlandse uitleg. Sorteer in je JSON van beste naar minst goede kandidaat."
        ),
    }

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": json.dumps(user_prompt, ensure_ascii=False),
            },
        ],
        temperature=0.3,
    )

    content = response.choices[0].message.content

    try:
        data = json.loads(content)
        rankings = data.get("rankings", [])
    except json.JSONDecodeError:
        # Als AI geen geldig JSON terugstuurt, doen we geen update
        # maar geven we een lege lijst terug
        return []

    # Map candidate_id -> ranking info
    ranking_by_id = {}
    for item in rankings:
        cid = item.get("candidate_id")
        score = item.get("match_score")
        explanation = item.get("explanation", "")
        if cid is None or score is None:
            continue
        ranking_by_id[int(cid)] = {
            "match_score": int(score),
            "explanation": explanation,
        }

    # Nu updaten we de kandidaten in de DB en bouwen we een nette lijst terug
    result: List[Dict] = []

    for c in candidates:
        info = ranking_by_id.get(c.id)
        if not info:
            # AI heeft deze kandidaat niet gerankt, sla over
            continue

        c.match_score = info["match_score"]

        result.append(
            {
                "candidate_id": c.id,
                "full_name": c.full_name,
                "email": c.email,
                "match_score": info["match_score"],
                "explanation": info["explanation"],
            }
        )

    db.commit()

    # Sorteer nogmaals in Python, voor de zekerheid
    result.sort(key=lambda x: x["match_score"], reverse=True)
    return result

