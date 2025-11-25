from openai import OpenAI
from config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)


def generate_motivation_letter(
    cv_text: str,
    job_description: str,
    company_name: str | None = None,
    language: str = "nl",
    tone: str = "professioneel",
) -> str:
    lang_part = (
        "Schrijf de motivatiebrief in het Nederlands."
        if language == "nl"
        else "Write the cover letter in English."
    )

    company_part = f"De brief is gericht aan het bedrijf: {company_name}." if company_name else ""

    prompt = f"""
Je bent een ervaren recruiter en copywriter. Schrijf een sterke, overtuigende motivatiebrief.

- Gebruik informatie uit de CV-tekst en de vacaturetekst.
- Maak het maximaal 400–500 woorden.
- Maak het concreet en resultaatgericht.
- Maak de toon: {tone}.
- Geen onzin of leugens toevoegen.

{lang_part}
{company_part}

CV-TEKST:
\"\"\"{cv_text}\"\"\"

VACATURETEKST:
\"\"\"{job_description}\"\"\"

Schrijf nu de volledige motivatiebrief:
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Je bent een expert in sollicitatiebrieven en recruitment."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
    )

    return response.choices[0].message.content.strip()
