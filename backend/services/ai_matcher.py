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
            "Je bent een STRENGE, kritische recruitment consultant. "
            "Je beoordeelt hoe goed een kandidaat ECHT past bij een vacature.\n\n"
            "SCORINGSRICHTLIJNEN (wees STRENG):\n"
            "- 0-20: Totaal geen relevante ervaring of opleiding\n"
            "- 21-40: Minimale overlap — enkele overdraagbare vaardigheden maar geen directe ervaring\n"
            "- 41-55: Gedeeltelijke match — enige relevante ervaring maar mist belangrijke vereisten\n"
            "- 56-70: Redelijke match — heeft relevante ervaring maar niet alles\n"
            "- 71-85: Goede match — voldoet aan de meeste vereisten\n"
            "- 86-100: Uitstekende match — sterke directe ervaring\n\n"
            "BELANGRIJK: Beoordeel op HARDE vaardigheden en RELEVANTE werkervaring, niet op soft skills. "
            "Een CV uit een andere branche zonder relevante skills = MAX 35. "
            "Geef alleen 70+ bij aantoonbaar relevante werkervaring."
        )
    else:
        system_prompt = (
            "You are a STRICT, critical recruitment consultant. "
            "You evaluate how well a candidate TRULY fits a job description.\n\n"
            "SCORING GUIDELINES (be STRICT):\n"
            "- 0-20: No relevant experience or education whatsoever\n"
            "- 21-40: Minimal overlap — some transferable skills but no direct experience\n"
            "- 41-55: Partial match — some relevant experience but missing key requirements\n"
            "- 56-70: Reasonable match — has relevant experience but not everything required\n"
            "- 71-85: Good match — meets most requirements with relevant work experience\n"
            "- 86-100: Excellent match — meets nearly all requirements, strong direct experience\n\n"
            "IMPORTANT: Evaluate on HARD skills and RELEVANT work experience, not soft skills. "
            "A CV from a completely different industry with no relevant skills = MAX 35. "
            "Only give 70+ for demonstrably relevant work experience."
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

