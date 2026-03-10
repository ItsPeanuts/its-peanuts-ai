"""
Email notificaties via Resend.

Vereiste env vars:
  RESEND_API_KEY  — API key van resend.com
  FROM_EMAIL      — bijv. noreply@itspeanuts.nl (moet geverifieerd domein zijn in Resend)

Als RESEND_API_KEY niet is ingesteld worden e-mails overgeslagen zonder fout.
"""

import os
import logging

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL     = os.getenv("FROM_EMAIL", "ItsPeanuts AI <noreply@itspeanuts.nl>")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "https://its-peanuts-frontend.onrender.com")


def _send(to: str, subject: str, html: str) -> None:
    """Stuur één e-mail via Resend. Logt fouten maar gooit geen exceptions."""
    if not RESEND_API_KEY:
        logger.info("[email] RESEND_API_KEY niet ingesteld — mail overgeslagen: %s", subject)
        return
    try:
        import resend  # type: ignore
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info("[email] Verstuurd naar %s: %s", to, subject)
    except Exception as exc:
        logger.error("[email] Versturen mislukt naar %s: %s", to, exc)


# ── Kandidaat: bevestiging sollicitatie ──────────────────────────────────────

def send_application_confirmation(
    candidate_email: str,
    candidate_name: str,
    vacancy_title: str,
    match_score: int,
) -> None:
    score_color = "#059669" if match_score >= 70 else "#d97706" if match_score >= 40 else "#dc2626"
    score_label = "Sterke match" if match_score >= 70 else "Goede basis" if match_score >= 40 else "Beperkte match"

    html = f"""
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#0f766e;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">ItsPeanuts AI</div>
      <div style="font-size:14px;color:#ccfbf1;margin-top:4px;">Jouw AI-gedreven recruitment partner</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        Sollicitatie ontvangen!
      </h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 24px;">
        Hi {candidate_name}, we hebben je sollicitatie goed ontvangen.
      </p>

      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-size:12px;color:#0f766e;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Functie</div>
        <div style="font-size:18px;font-weight:700;color:#111827;">{vacancy_title}</div>
      </div>

      <div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin-bottom:28px;display:flex;align-items:center;gap:16px;">
        <div style="width:56px;height:56px;border-radius:50%;background:{score_color};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;">
          {match_score}%
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#111827;">{score_label}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:2px;">
            Dit is jouw AI-matchscore op basis van je CV en de vacaturetekst.
          </div>
        </div>
      </div>

      <a href="{FRONTEND_URL}/candidate/sollicitaties"
         style="display:inline-block;padding:13px 28px;background:#0f766e;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
        Volg je sollicitatie
      </a>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        Je ontvangt updates via dit e-mailadres als je status wijzigt.<br>
        Vragen? Reageer op deze mail.
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=candidate_email,
        subject=f"Sollicitatie ontvangen: {vacancy_title}",
        html=html,
    )


# ── Werkgever: nieuwe sollicitant ────────────────────────────────────────────

def send_new_applicant_notification(
    employer_email: str,
    candidate_name: str,
    candidate_email: str,
    vacancy_title: str,
    match_score: int,
) -> None:
    score_color = "#059669" if match_score >= 70 else "#d97706" if match_score >= 40 else "#dc2626"
    score_bg    = "#d1fae5"  if match_score >= 70 else "#fef3c7"  if match_score >= 40 else "#fee2e2"
    score_label = "Sterke match" if match_score >= 70 else "Goede basis" if match_score >= 40 else "Beperkte match"

    html = f"""
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#0f766e;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">ItsPeanuts AI</div>
      <div style="font-size:14px;color:#ccfbf1;margin-top:4px;">Nieuwe sollicitant ontvangen</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        Nieuwe sollicitant op {vacancy_title}
      </h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 24px;">
        Er heeft een nieuwe kandidaat gesolliciteerd. Hieronder de details.
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:12px;width:40%;">Kandidaat</td>
            <td style="font-size:14px;font-weight:600;color:#111827;padding-bottom:12px;">{candidate_name}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:12px;">E-mail</td>
            <td style="font-size:14px;color:#374151;padding-bottom:12px;">{candidate_email}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">AI-matchscore</td>
            <td>
              <span style="font-size:13px;font-weight:700;color:{score_color};background:{score_bg};padding:3px 10px;border-radius:20px;">
                {match_score}% — {score_label}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <a href="{FRONTEND_URL}/employer"
         style="display:inline-block;padding:13px 28px;background:#0f766e;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
        Bekijk in dashboard
      </a>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        Je ontvangt deze melding omdat er een nieuwe sollicitant is op een van jouw vacatures.
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=employer_email,
        subject=f"Nieuwe sollicitant: {candidate_name} op {vacancy_title}",
        html=html,
    )


# ── Werkgever: claim-notificatie (vacature gescraped, claim je gratis account) ─

def send_claim_notification(
    employer_email: str,
    vacancy_title: str,
    company_name: str,
    claim_url: str,
) -> None:
    html = f"""
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#0f766e;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">ItsPeanuts AI</div>
      <div style="font-size:14px;color:#ccfbf1;margin-top:4px;">Iemand heeft op uw vacature gesolliciteerd</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 12px;">
        Goed nieuws voor {company_name}!
      </h1>
      <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
        Er heeft iemand gesolliciteerd op uw vacature
        <strong style="color:#0f766e;">{vacancy_title}</strong> via ItsPeanuts AI.
      </p>

      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
        <div style="font-size:14px;color:#065f46;font-weight:600;margin-bottom:6px;">
          Uw eerste vacature is gratis!
        </div>
        <div style="font-size:13px;color:#374151;line-height:1.6;">
          ItsPeanuts AI heeft uw vacature gevonden en op ons platform gepubliceerd.
          Activeer uw gratis account om de sollicitant te bekijken en te reageren.
          U kunt direct aan de slag — geen creditcard vereist.
        </div>
      </div>

      <a href="{claim_url}"
         style="display:inline-block;padding:14px 32px;background:#0f766e;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        Activeer gratis account en bekijk sollicitant →
      </a>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
        U ontvangt deze mail omdat iemand heeft gesolliciteerd op een vacature die door
        ItsPeanuts AI is gevonden op internet. Wilt u liever niet dat uw vacatures op ons
        platform staan? Stuur een reactie op deze mail en wij verwijderen de vacature.
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=employer_email,
        subject=f"Iemand heeft gesolliciteerd op '{vacancy_title}' — activeer uw gratis account",
        html=html,
    )
