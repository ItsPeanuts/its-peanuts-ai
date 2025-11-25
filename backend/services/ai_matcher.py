import json
from openai import OpenAI
from config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)


def score_job_match(
    candidate_profile_text: str,
    job_description: str,
    language: str = "nl",
) -> dict:
    lang_part = "Beantwoord in het Nederlands." if language == "nl" else "Answer in English."

    prompt = f"""
Je bent een ervaren recruiter. Je krijgt:
- een samenvatting van de kandidaat
- een vacaturetekst

Geef:
1. Een matchscore van 0 tot 100.
2. 3 tot 5 sterke punten (waarom het wél past).
3. 3 tot 5 risico's/zwakke punten (waarom het minder past).
4. Een korte conclusie.

Formaat van je antwoord MOET strikt JSON zijn, zonder extra tekst:

{{
  "score": <nummer 0-100>,
  "strengths": ["...","..."],
  "risks": ["...","..."],
  "summary": "korte conclusie"
}}

{lang_part}

KANDIDAAT:
\"\"\"{candidate_profile_text}\"\"\"

VACATURE:
\"\"\"{job_description}\"\"\"
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Je bent een nauwkeurige, data-gedreven recruiter."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )

    raw = response.choices[0].message.content.strip()

    try:
        data = json.loads(raw)
    except Exception:
        data = {
            "score": 0,
            "strengths": [],
            "risks": [],
            "summary": "Kon het antwoord niet goed parsen.",
        }

    data.setdefault("score", 0)
    data.setdefault("strengths", [])
    data.setdefault("risks", [])
    data.setdefault("summary", "")

    try:
        s = int(data["score"])
        data["score"] = max(0, min(100, s))
    except Exception:
        data["score"] = 0

    return data
