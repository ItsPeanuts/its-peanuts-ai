import json
from typing import Literal

from openai import OpenAI
from backend.config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)


def score_job_match(
    candidate_profile_text: str,
    job_description: str,
    language: Literal["nl", "en"] = "nl",
) -> dict:
    """
    Berekent met AI hoe goed een kandidaat past op een vacature.
    Gebruikt een score van 0–100 en geeft een korte uitleg terug.
    Dit wordt gebruikt door het endpoint /ai/match-job.
    """

    if language == "nl":
        system_prompt = (
            "Je bent een ervaren Nederlandse recruitment consultant. "
            "Je beoordeelt hoe goed een kandidaat past op een vacature. "
            "Geef een matchscore van 0 tot 100 en een korte uitleg in het Nederlands."
        )
    else:
        system_prompt = (
            "You are an experienced recruitment consultant. "
            "You evaluate how well a candidate fits a job description. "
            "Give a match score from 0 to 100 and a short explanation in English."
        )

    user_payload = {
        "candidate_profile": candidate_profile_text,
        "job_description": job_description,
        "instructions": (
            "Geef je antwoord als geldig JSON-object met exact deze velden: "
            "{'match_score': int, 'explanation': str}."
        ),
    }

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": json.dumps(user_payload, ensure_ascii=False),
            },
        ],
        temperature=0.3,
    )

    content = response.choices[0].message.content

    try:
        data = json.loads(content)
        score = int(data.get("match_score", 0))
        explanation = data.get("explanation", "")
    except Exception:
        # Fallback als AI geen netjes JSON terugstuurt
        score = 0
        explanation = (
            "De AI kon geen geldige matchscore genereren op basis van de aangeleverde gegevens."
        )

    # Zorg dat score tussen 0 en 100 zit
    score = max(0, min(100, score))

    return {
        "match_score": score,
        "explanation": explanation,
    }

