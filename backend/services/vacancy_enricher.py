"""
Vacancy Enricher — verrijkt gescrapede vacatures bij publicatie.

Functies:
- extract_phone(text)          → telefoonnummer uit tekst
- clean_description(text)      → verwijder contactinfo uit beschrijving
- parse_metadata(title, desc)  → extract salary, hours, type, locatie via regex
- ai_enrich(title, desc, co)   → herschrijf beschrijving via OpenAI (met fallback)
- enrich_for_publish(sv)       → geeft dict terug met alle Vacancy-velden
"""

import logging
import os
import re

logger = logging.getLogger(__name__)

# ── Regex ─────────────────────────────────────────────────────────────────────

PHONE_RE = re.compile(
    r'(?<!\d)('
    r'\+31[\s\-]?[1-9][\s\-]?(?:\d[\s\-]?){7,8}'   # +31 6 12345678
    r'|0[1-9][\s\-]?(?:\d[\s\-]?){6,8}'              # 06-12345678 / 020-1234567
    r')(?!\d)'
)

EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b')
URL_RE   = re.compile(r'https?://\S+|www\.\S+')


def extract_phone(text: str) -> str:
    """Geeft het eerste telefoonnummer uit de tekst, of leeg string."""
    if not text:
        return ""
    m = PHONE_RE.search(text)
    if not m:
        return ""
    # Normaliseer: verwijder spaties en streepjes
    raw = m.group().strip()
    return re.sub(r'[\s\-]', '', raw)


def clean_description(text: str) -> str:
    """Verwijder emails, telefoonnummers en URLs uit de beschrijving."""
    if not text:
        return ""
    text = EMAIL_RE.sub("", text)
    text = PHONE_RE.sub("", text)
    text = URL_RE.sub("", text)
    # Opruimen: dubbele spaties / regels
    text = re.sub(r'\s{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()


def parse_metadata(title: str, description: str) -> dict:
    """
    Haal salary_range, hours_per_week, employment_type en work_location
    uit titel + beschrijving via regex + keyword matching.
    """
    combined = ((title or "") + " " + (description or "")).lower()

    # ── Salaris ───────────────────────────────────────────────────────────────
    salary_range = None
    for pat in [
        r'€\s*[\d\.]+\s*[-–]\s*€?\s*[\d\.]+(?:\s*(?:per\s+maand|p/m|pm|,-|,-))?',
        r'[\d\.]+\s*[-–]\s*[\d\.]+\s*euro(?:\s*per\s+maand)?',
        r'€\s*[\d\.]+(?: per (?:maand|uur|jaar))?',
    ]:
        m = re.search(pat, combined, re.IGNORECASE)
        if m:
            salary_range = m.group().strip()
            break

    # ── Uren per week ─────────────────────────────────────────────────────────
    hours_per_week = None
    for pat in [
        r'(\d+)\s*[-–]\s*(\d+)\s*uur(?:\s*p(?:er|\.)\s*week)?',
        r'(\d+)\s*uur\s*(?:per|p\.)\s*week',
        r'(\d+)\s*(?:upw|u/w)',
    ]:
        m = re.search(pat, combined, re.IGNORECASE)
        if m:
            hours_per_week = re.sub(r'\s*uur.*', '', m.group(), flags=re.IGNORECASE).strip()
            break

    # ── Dienstverband ─────────────────────────────────────────────────────────
    employment_type = None
    if any(k in combined for k in ['parttime', 'part-time', 'part time', 'deeltijd']):
        employment_type = "parttime"
    elif any(k in combined for k in ['freelance', 'zzp', 'zelfstandig']):
        employment_type = "freelance"
    elif any(k in combined for k in ['stage', 'stagiair', 'internship', 'stageplek']):
        employment_type = "stage"
    elif any(k in combined for k in ['tijdelijk', 'bepaalde tijd', 'interim', 'uitzend']):
        employment_type = "tijdelijk"
    elif any(k in combined for k in ['fulltime', 'full-time', 'full time', 'voltijd', '40 uur', '40uur']):
        employment_type = "fulltime"

    # ── Werklocatie ───────────────────────────────────────────────────────────
    work_location = None
    has_remote = any(k in combined for k in ['remote', 'vanuit huis', 'thuiswerken', 'thuis werken', 'home office'])
    has_office = any(k in combined for k in ['kantoor', 'op locatie', 'op-locatie', 'onsite'])
    has_hybrid = any(k in combined for k in ['hybride', 'hybrid', 'deels thuis', 'deels kantoor'])

    if has_hybrid or (has_remote and has_office):
        work_location = "hybride"
    elif has_remote:
        work_location = "remote"
    elif has_office:
        work_location = "op-locatie"

    return {
        "salary_range": salary_range,
        "hours_per_week": hours_per_week,
        "employment_type": employment_type,
        "work_location": work_location,
    }


def ai_enrich_description(title: str, description: str, company_name: str) -> str:
    """
    Herschrijf de beschrijving met OpenAI naar een nette vacaturetekst.
    Verwijdert contactinfo en maakt er 2-3 professionele alinea's van.
    Fallback naar clean_description() als er geen API key is of bij fout.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return _generate_fallback(title, description, company_name)

    raw_text = (description or "").strip()
    # Stuur niet meer dan 2000 tekens naar de API
    truncated = raw_text[:2000] if raw_text else "(geen omschrijving beschikbaar)"

    prompt = (
        f"Je bent een recruitment specialist. Herschrijf onderstaande vacaturetekst naar een "
        f"professionele, aantrekkelijke vacature in het Nederlands. "
        f"Verwijder ALLE contactgegevens (emails, telefoonnummers, URLs, namen van contactpersonen). "
        f"Gebruik Markdown opmaak met precies deze 3 secties (vette koptekst + opsommingstekens):\n\n"
        f"**Wat ga je doen?**\n- [taken]\n\n"
        f"**Wat breng je mee?**\n- [eisen]\n\n"
        f"**Wat bieden wij?**\n- [voordelen]\n\n"
        f"Houd het zakelijk en aansprekend. Geef alleen de geformatteerde tekst terug, niets anders.\n\n"
        f"Functietitel: {title}\n"
        f"Bedrijf: {company_name or 'Onbekend bedrijf'}\n"
        f"Originele tekst:\n{truncated}"
    )

    try:
        import openai
        client = openai.OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.4,
        )
        result = resp.choices[0].message.content
        return result.strip() if result else _generate_fallback(title, description, company_name)
    except Exception as exc:
        logger.warning("[enricher] OpenAI fout: %s", exc)
        return _generate_fallback(title, description, company_name)


def _generate_fallback(title: str, description: str, company_name: str) -> str:
    """Maak een nette beschrijving zonder AI: schoon op + voeg context toe."""
    cleaned = clean_description(description)
    if cleaned and len(cleaned) > 100:
        return cleaned

    # Beschrijving te kort of leeg — gebruik template
    co = company_name or "dit bedrijf"
    parts = [f"Wij zoeken een enthousiaste {title} voor {co}."]
    if cleaned:
        parts.append(cleaned)
    parts.append(
        "Heb je interesse? Solliciteer direct via het platform en laat ons meer over je weten."
    )
    return "\n\n".join(parts)


def enrich_for_publish(title: str, description: str, company_name: str,
                       location: str, use_ai: bool = True) -> dict:
    """
    Combineert alle verrijkingsstappen en geeft een dict terug dat direct
    als kwargs voor models.Vacancy() gebruikt kan worden.

    use_ai=True  → AI herschrijft de beschrijving (voor enkele publicatie)
    use_ai=False → Alleen regex opschoning (voor bulk, snel)
    """
    meta = parse_metadata(title, description)

    if use_ai:
        desc_clean = ai_enrich_description(title, description, company_name)
    else:
        desc_clean = _generate_fallback(title, description, company_name)

    return {
        "description": desc_clean,
        "location": location,
        "salary_range": meta["salary_range"],
        "hours_per_week": meta["hours_per_week"],
        "employment_type": meta["employment_type"],
        "work_location": meta["work_location"],
    }
