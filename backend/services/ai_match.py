from typing import List, Dict, Any
import json

from openai import OpenAI

from backend.config import OPENAI_API_KEY
from backend import models

# OpenAI client gebruiken zoals in de andere services
client = OpenAI(api_key=OPENAI_API_KEY)


async def rank_candidates_for_job(
    job_description: str,
    candidates: List[models.CandidateProfile],
) -> List[Dict[str, Any]]:
    """
    Krijgt:
      - job_description: de tekst van de vacature
      - candidates: lijst met CandidateProfile objecten uit de database

    Geeft een lijst terug met dicts:
      {
        "candidate": <CandidateProfile>,
        "score": <int 0-100>,
        "explanation": <uitleg in NL>
      }
    """

    # Geen kandidaten? Dan valt er niks te ranken.
    if not candidates:
        return []

    # Bouw een compacte lijst van kandidaten voor de prompt
    candidate_blocks = []
    for c in candidates:
        name = c.full_name or f"Kandidaat {c.id}"
        cv_text = (c.cv_text or "")[:1500]  # niet té lang maken

        block = f"""
KANDIDAAT_ID: {c.id}
Naam: {name}
CV:
{cv_text}
--------------------
"""
        candidate_blocks.append(block)

    prompt = f"""
Je bent een senior recruiter.

Je krijgt één vacature + een lijst met kandidaten (met KANDIDAAT_ID).
Voor elke kandidaat geef je:

- een matchscore tussen 0 en 100 (hoe beter de match, hoe hoger)
- een korte uitleg in het Nederlands waarom je deze score geeft.

Vacature:
-----------
{job_description}

Kandidaten:
-----------
{''.join(candidate_blocks)}

BELANGRIJK:
- Geef ALLEEN geldige JSON terug.
- Formaat van de JSON:

{{
  "candidates": [
    {{
      "id": <int>,          // KANDIDAAT_ID
      "score": <int>,       // 0 tot 100
      "uitleg": "<korte uitleg in het Nederlands>"
    }},
    ...
  ]
}}
"""

    try:
        response = client.responses.create(
            model="gpt-4.1-mini",
            input=prompt,
            response_format={"type": "json_object"},
        )

        raw_text = response.output[0].content[0].text

        data = json.loads(raw_text)

        # We verwachten {"candidates": [...]}
        items = data.get("candidates", [])

        scores_by_id: Dict[int, Dict[str, Any]] = {}
        for item in items:
            cid = item.get("id")
            score = item.get("score")
            explanation = item.get("uitleg") or item.get("explanation")

            if cid is None or score is None:
                continue

            scores_by_id[int(cid)] = {
                "score": int(score),
                "explanation": explanation or "",
            }

        # Bouw resultaatlijst met dezelfde CandidateProfile objecten
        results: List[Dict[str, Any]] = []
        for c in candidates:
            meta = scores_by_id.get(
                c.id,
                {
                    "score": 0,
                    "explanation": "Geen score ontvangen van AI.",
                },
            )
            results.append(
                {
                    "candidate": c,
                    "score": meta["score"],
                    "explanation": meta["explanation"],
                }
            )

        # Sorteer op score (hoog naar laag)
        results.sort(key=lambda r: r["score"], reverse=True)
        return results

    except Exception as e:
        # Als OpenAI stuk is, crasht de hele API nu niet maar geven
        # we gewoon alles terug met score 0.
        print("AI match error:", e)
        return [
            {
                "candidate": c,
                "score": 0,
                "explanation": "AI-matchen is tijdelijk niet beschikbaar.",
            }
            for c in candidates
        ]
