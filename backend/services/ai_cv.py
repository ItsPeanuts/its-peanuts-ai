from openai import OpenAI
from backend.config import OPENAI_API_KEY



client = OpenAI(api_key=OPENAI_API_KEY)


def rewrite_cv(cv_text: str, target_role: str | None = None, language: str = "nl") -> str:
    """
    Neemt ruwe CV-tekst en geeft een ATS-proof, strak gestructureerde versie terug.
    """
    role_part = f" De kandidaat richt zich op de functie: {target_role}." if target_role else ""
    lang_part = "Schrijf in het Nederlands." if language == "nl" else "Write in English."

    prompt = f"""
Jij bent een top HR- en recruitment specialist en copywriter.

Hieronder staat de ruwe CV-tekst van een kandidaat. Herschrijf dit naar een:
- professioneel, duidelijk CV
- met duidelijke secties (Profiel, Werkervaring, Opleiding, Vaardigheden, Certificaten)
- kort, krachtig en ATS-proof
- zonder leugens toe te voegen.

{role_part}
{lang_part}

RUWE CV:
\"\"\"{cv_text}\"\"\"

Gestructureerd CV:
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Je bent een expert CV-schrijver en recruitment specialist."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
    )

    return response.choices[0].message.content.strip()
