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

RESEND_API_KEY   = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL       = os.getenv("FROM_EMAIL", "ItsPeanuts AI <noreply@itspeanuts.nl>")
FRONTEND_URL     = os.getenv("FRONTEND_URL", "https://its-peanuts-frontend.onrender.com")
ADMIN_EMAIL      = os.getenv("ADMIN_EMAIL", "admin@itspeanuts.ai")
BOOKKEEPER_EMAIL = os.getenv("BOOKKEEPER_EMAIL", "")
INVOICE_FROM_EMAIL = os.getenv("INVOICE_FROM_EMAIL", "VorzaIQ <info@vorzaiq.com>")

# ── Vertalingen ───────────────────────────────────────────────────────────────

STRINGS: dict[str, dict[str, str]] = {
    # send_application_confirmation
    "application_subject": {
        "nl": "Sollicitatie ontvangen: {vacancy_title}",
        "en": "Application received: {vacancy_title}",
        "de": "Bewerbung erhalten: {vacancy_title}",
        "fr": "Candidature reçue : {vacancy_title}",
        "es": "Solicitud recibida: {vacancy_title}",
    },
    "application_heading": {
        "nl": "Sollicitatie ontvangen!",
        "en": "Application received!",
        "de": "Bewerbung erhalten!",
        "fr": "Candidature reçue !",
        "es": "¡Solicitud recibida!",
    },
    "application_intro": {
        "nl": "Hi {candidate_name}, we hebben je sollicitatie goed ontvangen.",
        "en": "Hi {candidate_name}, we have successfully received your application.",
        "de": "Hallo {candidate_name}, wir haben Ihre Bewerbung erfolgreich erhalten.",
        "fr": "Bonjour {candidate_name}, nous avons bien reçu votre candidature.",
        "es": "Hola {candidate_name}, hemos recibido tu solicitud correctamente.",
    },
    "application_position_label": {
        "nl": "Functie",
        "en": "Position",
        "de": "Stelle",
        "fr": "Poste",
        "es": "Puesto",
    },
    "application_score_strong": {
        "nl": "Sterke match",
        "en": "Strong match",
        "de": "Starke Übereinstimmung",
        "fr": "Correspondance forte",
        "es": "Coincidencia fuerte",
    },
    "application_score_good": {
        "nl": "Goede basis",
        "en": "Good basis",
        "de": "Gute Grundlage",
        "fr": "Bonne base",
        "es": "Buena base",
    },
    "application_score_limited": {
        "nl": "Beperkte match",
        "en": "Limited match",
        "de": "Eingeschränkte Übereinstimmung",
        "fr": "Correspondance limitée",
        "es": "Coincidencia limitada",
    },
    "application_score_explanation": {
        "nl": "Dit is jouw AI-matchscore op basis van je CV en de vacaturetekst.",
        "en": "This is your AI match score based on your CV and the job description.",
        "de": "Dies ist Ihr KI-Match-Score basierend auf Ihrem Lebenslauf und der Stellenbeschreibung.",
        "fr": "Ceci est votre score de correspondance IA basé sur votre CV et la description du poste.",
        "es": "Esta es tu puntuación de coincidencia IA basada en tu CV y la descripción del puesto.",
    },
    "application_cta": {
        "nl": "Volg je sollicitatie",
        "en": "Track your application",
        "de": "Bewerbung verfolgen",
        "fr": "Suivre votre candidature",
        "es": "Seguir tu solicitud",
    },
    "application_footer": {
        "nl": "Je ontvangt updates via dit e-mailadres als je status wijzigt.<br>Vragen? Reageer op deze mail.",
        "en": "You will receive updates at this email address when your status changes.<br>Questions? Reply to this email.",
        "de": "Sie erhalten Updates an diese E-Mail-Adresse, wenn sich Ihr Status ändert.<br>Fragen? Antworten Sie auf diese E-Mail.",
        "fr": "Vous recevrez des mises à jour à cette adresse e-mail lorsque votre statut change.<br>Des questions ? Répondez à cet e-mail.",
        "es": "Recibirás actualizaciones en este correo electrónico cuando cambie tu estado.<br>¿Preguntas? Responde a este correo.",
    },
    # send_new_applicant_notification
    "new_applicant_subject": {
        "nl": "Nieuwe sollicitant: {candidate_name} op {vacancy_title}",
        "en": "New applicant: {candidate_name} for {vacancy_title}",
        "de": "Neuer Bewerber: {candidate_name} für {vacancy_title}",
        "fr": "Nouveau candidat : {candidate_name} pour {vacancy_title}",
        "es": "Nuevo solicitante: {candidate_name} para {vacancy_title}",
    },
    "new_applicant_header_sub": {
        "nl": "Nieuwe sollicitant ontvangen",
        "en": "New applicant received",
        "de": "Neuer Bewerber erhalten",
        "fr": "Nouveau candidat reçu",
        "es": "Nuevo solicitante recibido",
    },
    "new_applicant_heading": {
        "nl": "Nieuwe sollicitant op {vacancy_title}",
        "en": "New applicant for {vacancy_title}",
        "de": "Neuer Bewerber für {vacancy_title}",
        "fr": "Nouveau candidat pour {vacancy_title}",
        "es": "Nuevo solicitante para {vacancy_title}",
    },
    "new_applicant_intro": {
        "nl": "Er heeft een nieuwe kandidaat gesolliciteerd. Hieronder de details.",
        "en": "A new candidate has applied. See the details below.",
        "de": "Ein neuer Kandidat hat sich beworben. Details unten.",
        "fr": "Un nouveau candidat a postulé. Voir les détails ci-dessous.",
        "es": "Un nuevo candidato ha aplicado. Ver los detalles a continuación.",
    },
    "new_applicant_col_candidate": {
        "nl": "Kandidaat",
        "en": "Candidate",
        "de": "Kandidat",
        "fr": "Candidat",
        "es": "Candidato",
    },
    "new_applicant_col_email": {
        "nl": "E-mail",
        "en": "Email",
        "de": "E-Mail",
        "fr": "E-mail",
        "es": "Correo",
    },
    "new_applicant_col_score": {
        "nl": "AI-matchscore",
        "en": "AI match score",
        "de": "KI-Match-Score",
        "fr": "Score de correspondance IA",
        "es": "Puntuación de coincidencia IA",
    },
    "new_applicant_cta": {
        "nl": "Bekijk in dashboard",
        "en": "View in dashboard",
        "de": "Im Dashboard ansehen",
        "fr": "Voir dans le tableau de bord",
        "es": "Ver en el panel",
    },
    "new_applicant_footer": {
        "nl": "Je ontvangt deze melding omdat er een nieuwe sollicitant is op een van jouw vacatures.",
        "en": "You receive this notification because there is a new applicant on one of your vacancies.",
        "de": "Sie erhalten diese Benachrichtigung, weil es einen neuen Bewerber für eine Ihrer Stellen gibt.",
        "fr": "Vous recevez cette notification car il y a un nouveau candidat sur l'une de vos offres.",
        "es": "Recibes esta notificación porque hay un nuevo solicitante en una de tus vacantes.",
    },
    # send_claim_notification
    "claim_subject": {
        "nl": "Iemand heeft gesolliciteerd op '{vacancy_title}' — activeer uw gratis account",
        "en": "Someone applied for '{vacancy_title}' — activate your free account",
        "de": "Jemand hat sich für '{vacancy_title}' beworben — aktivieren Sie Ihr kostenloses Konto",
        "fr": "Quelqu'un a postulé pour '{vacancy_title}' — activez votre compte gratuit",
        "es": "Alguien solicitó '{vacancy_title}' — activa tu cuenta gratuita",
    },
    "claim_header_sub": {
        "nl": "Iemand heeft op uw vacature gesolliciteerd",
        "en": "Someone applied to your vacancy",
        "de": "Jemand hat sich auf Ihre Stelle beworben",
        "fr": "Quelqu'un a postulé à votre offre",
        "es": "Alguien solicitó tu vacante",
    },
    "claim_heading": {
        "nl": "Goed nieuws voor {company_name}!",
        "en": "Good news for {company_name}!",
        "de": "Gute Neuigkeiten für {company_name}!",
        "fr": "Bonne nouvelle pour {company_name} !",
        "es": "¡Buenas noticias para {company_name}!",
    },
    "claim_intro": {
        "nl": "Er heeft iemand gesolliciteerd op uw vacature <strong style=\"color:#0f766e;\">{vacancy_title}</strong> via ItsPeanuts AI.",
        "en": "Someone applied to your vacancy <strong style=\"color:#0f766e;\">{vacancy_title}</strong> via ItsPeanuts AI.",
        "de": "Jemand hat sich auf Ihre Stelle <strong style=\"color:#0f766e;\">{vacancy_title}</strong> über ItsPeanuts AI beworben.",
        "fr": "Quelqu'un a postulé à votre offre <strong style=\"color:#0f766e;\">{vacancy_title}</strong> via ItsPeanuts AI.",
        "es": "Alguien solicitó tu vacante <strong style=\"color:#0f766e;\">{vacancy_title}</strong> a través de ItsPeanuts AI.",
    },
    "claim_free_label": {
        "nl": "Uw eerste vacature is gratis!",
        "en": "Your first vacancy is free!",
        "de": "Ihre erste Stelle ist kostenlos!",
        "fr": "Votre première offre est gratuite !",
        "es": "¡Tu primera vacante es gratuita!",
    },
    "claim_free_body": {
        "nl": "ItsPeanuts AI heeft uw vacature gevonden en op ons platform gepubliceerd. Activeer uw gratis account om de sollicitant te bekijken en te reageren. U kunt direct aan de slag — geen creditcard vereist.",
        "en": "ItsPeanuts AI found your vacancy and published it on our platform. Activate your free account to view the applicant and respond. You can get started right away — no credit card required.",
        "de": "ItsPeanuts AI hat Ihre Stelle gefunden und auf unserer Plattform veröffentlicht. Aktivieren Sie Ihr kostenloses Konto, um den Bewerber anzusehen und zu antworten. Sie können sofort loslegen — keine Kreditkarte erforderlich.",
        "fr": "ItsPeanuts AI a trouvé votre offre et l'a publiée sur notre plateforme. Activez votre compte gratuit pour voir le candidat et répondre. Vous pouvez commencer immédiatement — sans carte de crédit.",
        "es": "ItsPeanuts AI encontró tu vacante y la publicó en nuestra plataforma. Activa tu cuenta gratuita para ver al solicitante y responder. Puedes empezar de inmediato — sin tarjeta de crédito.",
    },
    "claim_cta": {
        "nl": "Activeer gratis account en bekijk sollicitant →",
        "en": "Activate free account and view applicant →",
        "de": "Kostenloses Konto aktivieren und Bewerber ansehen →",
        "fr": "Activer le compte gratuit et voir le candidat →",
        "es": "Activar cuenta gratuita y ver al solicitante →",
    },
    "claim_footer": {
        "nl": "U ontvangt deze mail omdat iemand heeft gesolliciteerd op een vacature die door ItsPeanuts AI is gevonden op internet. Wilt u liever niet dat uw vacatures op ons platform staan? Stuur een reactie op deze mail en wij verwijderen de vacature.",
        "en": "You receive this email because someone applied to a vacancy found by ItsPeanuts AI on the internet. Don't want your vacancies on our platform? Send a reply to this email and we will remove the vacancy.",
        "de": "Sie erhalten diese E-Mail, weil jemand sich auf eine Stelle beworben hat, die ItsPeanuts AI im Internet gefunden hat. Möchten Sie nicht, dass Ihre Stellen auf unserer Plattform stehen? Senden Sie eine Antwort auf diese E-Mail und wir entfernen die Stelle.",
        "fr": "Vous recevez cet e-mail car quelqu'un a postulé à une offre trouvée par ItsPeanuts AI sur internet. Vous ne souhaitez pas que vos offres soient sur notre plateforme ? Envoyez une réponse à cet e-mail et nous supprimerons l'offre.",
        "es": "Recibes este correo porque alguien solicitó una vacante encontrada por ItsPeanuts AI en internet. ¿No quieres que tus vacantes estén en nuestra plataforma? Envía una respuesta a este correo y eliminaremos la vacante.",
    },
    # send_status_update_email — shortlisted
    "status_shortlisted_header_sub": {
        "nl": "Goed nieuws!",
        "en": "Good news!",
        "de": "Gute Neuigkeiten!",
        "fr": "Bonne nouvelle !",
        "es": "¡Buenas noticias!",
    },
    "status_shortlisted_heading": {
        "nl": "Je staat op de shortlist!",
        "en": "You have been shortlisted!",
        "de": "Sie stehen auf der Shortlist!",
        "fr": "Vous êtes sur la liste restreinte !",
        "es": "¡Estás en la lista corta!",
    },
    "status_shortlisted_intro": {
        "nl": "Hi {candidate_name}, goed nieuws — je bent geselecteerd voor de volgende ronde!",
        "en": "Hi {candidate_name}, great news — you have been selected for the next round!",
        "de": "Hallo {candidate_name}, tolle Neuigkeiten — Sie wurden für die nächste Runde ausgewählt!",
        "fr": "Bonjour {candidate_name}, bonne nouvelle — vous avez été sélectionné pour le tour suivant !",
        "es": "Hola {candidate_name}, ¡gran noticia — has sido seleccionado para la siguiente ronda!",
    },
    "status_shortlisted_body": {
        "nl": "De werkgever heeft jouw profiel geselecteerd en wil graag verder met je. Je hoort binnenkort meer over de volgende stap.",
        "en": "The employer has selected your profile and would like to proceed with you. You will hear more about the next step soon.",
        "de": "Der Arbeitgeber hat Ihr Profil ausgewählt und möchte gerne mit Ihnen weitermachen. Sie werden bald mehr über den nächsten Schritt hören.",
        "fr": "L'employeur a sélectionné votre profil et souhaite continuer avec vous. Vous en saurez plus sur la prochaine étape bientôt.",
        "es": "El empleador ha seleccionado tu perfil y desea continuar contigo. Pronto sabrás más sobre el siguiente paso.",
    },
    "status_shortlisted_subject": {
        "nl": "Je staat op de shortlist: {vacancy_title}",
        "en": "You have been shortlisted: {vacancy_title}",
        "de": "Sie stehen auf der Shortlist: {vacancy_title}",
        "fr": "Vous êtes sur la liste restreinte : {vacancy_title}",
        "es": "Estás en la lista corta: {vacancy_title}",
    },
    # send_status_update_email — interview
    "status_interview_header_sub": {
        "nl": "Uitnodiging gesprek",
        "en": "Interview invitation",
        "de": "Gesprächseinladung",
        "fr": "Invitation à un entretien",
        "es": "Invitación a entrevista",
    },
    "status_interview_heading": {
        "nl": "Je bent uitgenodigd voor een gesprek!",
        "en": "You have been invited for an interview!",
        "de": "Sie wurden zu einem Gespräch eingeladen!",
        "fr": "Vous êtes invité à un entretien !",
        "es": "¡Has sido invitado a una entrevista!",
    },
    "status_interview_intro": {
        "nl": "Hi {candidate_name}, gefeliciteerd — de werkgever wil graag met je kennismaken!",
        "en": "Hi {candidate_name}, congratulations — the employer would like to meet you!",
        "de": "Hallo {candidate_name}, herzlichen Glückwunsch — der Arbeitgeber möchte Sie kennenlernen!",
        "fr": "Bonjour {candidate_name}, félicitations — l'employeur souhaite vous rencontrer !",
        "es": "Hola {candidate_name}, ¡felicitaciones — el empleador quiere conocerte!",
    },
    "status_interview_body": {
        "nl": "Je bent uitgenodigd voor een sollicitatiegesprek. De werkgever neemt binnenkort contact met je op om een datum en tijdstip af te spreken. Bekijk je sollicitatie voor meer details.",
        "en": "You have been invited for a job interview. The employer will contact you soon to arrange a date and time. View your application for more details.",
        "de": "Sie wurden zu einem Vorstellungsgespräch eingeladen. Der Arbeitgeber wird sich bald mit Ihnen in Verbindung setzen, um einen Termin zu vereinbaren. Sehen Sie sich Ihre Bewerbung für weitere Details an.",
        "fr": "Vous avez été invité à un entretien d'embauche. L'employeur vous contactera bientôt pour fixer une date et une heure. Consultez votre candidature pour plus de détails.",
        "es": "Has sido invitado a una entrevista de trabajo. El empleador se pondrá en contacto contigo pronto para acordar una fecha y hora. Ver tu solicitud para más detalles.",
    },
    "status_interview_subject": {
        "nl": "Uitnodiging gesprek: {vacancy_title}",
        "en": "Interview invitation: {vacancy_title}",
        "de": "Gesprächseinladung: {vacancy_title}",
        "fr": "Invitation à un entretien : {vacancy_title}",
        "es": "Invitación a entrevista: {vacancy_title}",
    },
    # send_status_update_email — hired
    "status_hired_header_sub": {
        "nl": "Goed nieuws!",
        "en": "Great news!",
        "de": "Tolle Neuigkeiten!",
        "fr": "Bonne nouvelle !",
        "es": "¡Buenas noticias!",
    },
    "status_hired_heading": {
        "nl": "Gefeliciteerd — je bent aangenomen!",
        "en": "Congratulations — you have been hired!",
        "de": "Herzlichen Glückwunsch — Sie wurden eingestellt!",
        "fr": "Félicitations — vous avez été embauché !",
        "es": "¡Felicitaciones — has sido contratado!",
    },
    "status_hired_intro": {
        "nl": "Hi {candidate_name}, we hebben goed nieuws voor je!<br>De werkgever heeft besloten jou aan te nemen voor de functie <strong style=\"color:#059669;\">{vacancy_title}</strong>.",
        "en": "Hi {candidate_name}, we have great news for you!<br>The employer has decided to hire you for the position <strong style=\"color:#059669;\">{vacancy_title}</strong>.",
        "de": "Hallo {candidate_name}, wir haben tolle Neuigkeiten für Sie!<br>Der Arbeitgeber hat entschieden, Sie für die Stelle <strong style=\"color:#059669;\">{vacancy_title}</strong> einzustellen.",
        "fr": "Bonjour {candidate_name}, nous avons une bonne nouvelle pour vous !<br>L'employeur a décidé de vous embaucher pour le poste <strong style=\"color:#059669;\">{vacancy_title}</strong>.",
        "es": "Hola {candidate_name}, ¡tenemos buenas noticias para ti!<br>El empleador ha decidido contratarte para el puesto <strong style=\"color:#059669;\">{vacancy_title}</strong>.",
    },
    "status_hired_body": {
        "nl": "De werkgever neemt binnenkort contact met je op voor de volgende stappen. Je kunt je sollicitatie ook terugvinden in je kandidaatdashboard.",
        "en": "The employer will contact you soon for the next steps. You can also find your application in your candidate dashboard.",
        "de": "Der Arbeitgeber wird sich bald mit Ihnen in Verbindung setzen, um die nächsten Schritte zu besprechen. Sie finden Ihre Bewerbung auch in Ihrem Kandidaten-Dashboard.",
        "fr": "L'employeur vous contactera bientôt pour les prochaines étapes. Vous pouvez également retrouver votre candidature dans votre tableau de bord candidat.",
        "es": "El empleador se pondrá en contacto contigo pronto para los próximos pasos. También puedes encontrar tu solicitud en tu panel de candidato.",
    },
    "status_hired_subject": {
        "nl": "Gefeliciteerd! Je bent aangenomen: {vacancy_title}",
        "en": "Congratulations! You have been hired: {vacancy_title}",
        "de": "Herzlichen Glückwunsch! Sie wurden eingestellt: {vacancy_title}",
        "fr": "Félicitations ! Vous avez été embauché : {vacancy_title}",
        "es": "¡Felicitaciones! Has sido contratado: {vacancy_title}",
    },
    # send_status_update_email — rejected
    "status_rejected_header_sub": {
        "nl": "Status update",
        "en": "Status update",
        "de": "Statusaktualisierung",
        "fr": "Mise à jour du statut",
        "es": "Actualización de estado",
    },
    "status_rejected_heading": {
        "nl": "Bedankt voor je sollicitatie",
        "en": "Thank you for your application",
        "de": "Vielen Dank für Ihre Bewerbung",
        "fr": "Merci pour votre candidature",
        "es": "Gracias por tu solicitud",
    },
    "status_rejected_body": {
        "nl": "Hi {candidate_name}, bedankt voor je sollicitatie op <strong style=\"color:#374151;\">{vacancy_title}</strong>.<br><br>Na zorgvuldige overweging heeft de werkgever besloten met andere kandidaten verder te gaan. We wensen je veel succes bij je zoektocht. Bekijk onze andere openstaande vacatures — misschien is er een betere match!",
        "en": "Hi {candidate_name}, thank you for your application for <strong style=\"color:#374151;\">{vacancy_title}</strong>.<br><br>After careful consideration, the employer has decided to proceed with other candidates. We wish you all the best in your search. Check out our other open vacancies — there might be a better match!",
        "de": "Hallo {candidate_name}, vielen Dank für Ihre Bewerbung auf <strong style=\"color:#374151;\">{vacancy_title}</strong>.<br><br>Nach sorgfältiger Überlegung hat der Arbeitgeber entschieden, mit anderen Kandidaten fortzufahren. Wir wünschen Ihnen viel Erfolg bei Ihrer Suche. Schauen Sie sich unsere anderen offenen Stellen an — vielleicht gibt es eine bessere Übereinstimmung!",
        "fr": "Bonjour {candidate_name}, merci pour votre candidature au poste <strong style=\"color:#374151;\">{vacancy_title}</strong>.<br><br>Après mûre réflexion, l'employeur a décidé de poursuivre avec d'autres candidats. Nous vous souhaitons bonne chance dans vos recherches. Consultez nos autres offres d'emploi — il y a peut-être une meilleure correspondance !",
        "es": "Hola {candidate_name}, gracias por tu solicitud para <strong style=\"color:#374151;\">{vacancy_title}</strong>.<br><br>Tras una cuidadosa consideración, el empleador ha decidido continuar con otros candidatos. Te deseamos mucho éxito en tu búsqueda. ¡Revisa nuestras otras vacantes abiertas — quizás hay una mejor coincidencia!",
    },
    "status_rejected_subject": {
        "nl": "Update sollicitatie: {vacancy_title}",
        "en": "Application update: {vacancy_title}",
        "de": "Bewerbungsupdate: {vacancy_title}",
        "fr": "Mise à jour de candidature : {vacancy_title}",
        "es": "Actualización de solicitud: {vacancy_title}",
    },
    # shared status update
    "status_cta": {
        "nl": "Bekijk je sollicitaties",
        "en": "View your applications",
        "de": "Ihre Bewerbungen ansehen",
        "fr": "Voir vos candidatures",
        "es": "Ver tus solicitudes",
    },
    "status_footer": {
        "nl": "Dit is een automatische melding van ItsPeanuts AI.",
        "en": "This is an automatic notification from ItsPeanuts AI.",
        "de": "Dies ist eine automatische Benachrichtigung von ItsPeanuts AI.",
        "fr": "Ceci est une notification automatique d'ItsPeanuts AI.",
        "es": "Esta es una notificación automática de ItsPeanuts AI.",
    },
    "status_position_label": {
        "nl": "Functie",
        "en": "Position",
        "de": "Stelle",
        "fr": "Poste",
        "es": "Puesto",
    },
    # send_team_invite_email
    "team_invite_subject": {
        "nl": "Je bent uitgenodigd voor het team van {org_name} — ItsPeanuts AI",
        "en": "You have been invited to the team of {org_name} — ItsPeanuts AI",
        "de": "Sie wurden zum Team von {org_name} eingeladen — ItsPeanuts AI",
        "fr": "Vous avez été invité à rejoindre l'équipe de {org_name} — ItsPeanuts AI",
        "es": "Has sido invitado al equipo de {org_name} — ItsPeanuts AI",
    },
    "team_invite_header_sub": {
        "nl": "Je bent toegevoegd aan een team",
        "en": "You have been added to a team",
        "de": "Sie wurden einem Team hinzugefügt",
        "fr": "Vous avez été ajouté à une équipe",
        "es": "Has sido añadido a un equipo",
    },
    "team_invite_heading": {
        "nl": "Welkom, {full_name}!",
        "en": "Welcome, {full_name}!",
        "de": "Willkommen, {full_name}!",
        "fr": "Bienvenue, {full_name} !",
        "es": "¡Bienvenido, {full_name}!",
    },
    "team_invite_intro": {
        "nl": "<strong>{inviter_name}</strong> heeft je toegevoegd aan het team van <strong>{org_name}</strong> op ItsPeanuts AI. Hieronder vind je je inloggegevens.",
        "en": "<strong>{inviter_name}</strong> has added you to the team of <strong>{org_name}</strong> on ItsPeanuts AI. Below you will find your login credentials.",
        "de": "<strong>{inviter_name}</strong> hat Sie dem Team von <strong>{org_name}</strong> auf ItsPeanuts AI hinzugefügt. Unten finden Sie Ihre Anmeldedaten.",
        "fr": "<strong>{inviter_name}</strong> vous a ajouté à l'équipe de <strong>{org_name}</strong> sur ItsPeanuts AI. Vous trouverez ci-dessous vos identifiants de connexion.",
        "es": "<strong>{inviter_name}</strong> te ha añadido al equipo de <strong>{org_name}</strong> en ItsPeanuts AI. A continuación encontrarás tus credenciales de acceso.",
    },
    "team_invite_credentials_label": {
        "nl": "Jouw inloggegevens",
        "en": "Your login credentials",
        "de": "Ihre Anmeldedaten",
        "fr": "Vos identifiants de connexion",
        "es": "Tus credenciales de acceso",
    },
    "team_invite_email_label": {
        "nl": "E-mailadres",
        "en": "Email address",
        "de": "E-Mail-Adresse",
        "fr": "Adresse e-mail",
        "es": "Correo electrónico",
    },
    "team_invite_password_label": {
        "nl": "Tijdelijk wachtwoord",
        "en": "Temporary password",
        "de": "Temporäres Passwort",
        "fr": "Mot de passe temporaire",
        "es": "Contraseña temporal",
    },
    "team_invite_password_note": {
        "nl": "Wijzig je wachtwoord na je eerste inlog via je profielpagina.",
        "en": "Change your password after your first login via your profile page.",
        "de": "Ändern Sie Ihr Passwort nach Ihrer ersten Anmeldung über Ihre Profilseite.",
        "fr": "Changez votre mot de passe après votre première connexion via votre page de profil.",
        "es": "Cambia tu contraseña después de tu primer inicio de sesión a través de tu página de perfil.",
    },
    "team_invite_cta": {
        "nl": "Naar het werkgeversdashboard",
        "en": "Go to the employer dashboard",
        "de": "Zum Arbeitgeber-Dashboard",
        "fr": "Aller au tableau de bord employeur",
        "es": "Ir al panel del empleador",
    },
    "team_invite_footer": {
        "nl": "Je ontvangt dit bericht omdat je bent toegevoegd aan een team op ItsPeanuts AI.",
        "en": "You receive this message because you have been added to a team on ItsPeanuts AI.",
        "de": "Sie erhalten diese Nachricht, weil Sie einem Team auf ItsPeanuts AI hinzugefügt wurden.",
        "fr": "Vous recevez ce message car vous avez été ajouté à une équipe sur ItsPeanuts AI.",
        "es": "Recibes este mensaje porque has sido añadido a un equipo en ItsPeanuts AI.",
    },
    # send_verification_email
    "verification_subject": {
        "nl": "Bevestig je e-mailadres — VorzaIQ",
        "en": "Confirm your email address — VorzaIQ",
        "de": "Bestätigen Sie Ihre E-Mail-Adresse — VorzaIQ",
        "fr": "Confirmez votre adresse e-mail — VorzaIQ",
        "es": "Confirma tu dirección de correo electrónico — VorzaIQ",
    },
    "verification_header_sub": {
        "nl": "Bevestig je e-mailadres",
        "en": "Confirm your email address",
        "de": "Bestätigen Sie Ihre E-Mail-Adresse",
        "fr": "Confirmez votre adresse e-mail",
        "es": "Confirma tu dirección de correo electrónico",
    },
    "verification_heading": {
        "nl": "Welkom bij VorzaIQ, {full_name}!",
        "en": "Welcome to VorzaIQ, {full_name}!",
        "de": "Willkommen bei VorzaIQ, {full_name}!",
        "fr": "Bienvenue sur VorzaIQ, {full_name} !",
        "es": "¡Bienvenido a VorzaIQ, {full_name}!",
    },
    "verification_body": {
        "nl": "Je werkgeversaccount is aangemaakt. Klik op de knop hieronder om je e-mailadres te bevestigen en je account te activeren.",
        "en": "Your employer account has been created. Click the button below to confirm your email address and activate your account.",
        "de": "Ihr Arbeitgeberkonto wurde erstellt. Klicken Sie auf die Schaltfläche unten, um Ihre E-Mail-Adresse zu bestätigen und Ihr Konto zu aktivieren.",
        "fr": "Votre compte employeur a été créé. Cliquez sur le bouton ci-dessous pour confirmer votre adresse e-mail et activer votre compte.",
        "es": "Tu cuenta de empleador ha sido creada. Haz clic en el botón de abajo para confirmar tu dirección de correo electrónico y activar tu cuenta.",
    },
    "verification_cta": {
        "nl": "E-mailadres bevestigen →",
        "en": "Confirm email address →",
        "de": "E-Mail-Adresse bestätigen →",
        "fr": "Confirmer l'adresse e-mail →",
        "es": "Confirmar dirección de correo electrónico →",
    },
    "verification_link_note": {
        "nl": "Of kopieer deze link in je browser:",
        "en": "Or copy this link into your browser:",
        "de": "Oder kopieren Sie diesen Link in Ihren Browser:",
        "fr": "Ou copiez ce lien dans votre navigateur :",
        "es": "O copia este enlace en tu navegador:",
    },
    "verification_footer": {
        "nl": "Als je je niet hebt geregistreerd bij VorzaIQ, kun je deze mail negeren.",
        "en": "If you did not register at VorzaIQ, you can ignore this email.",
        "de": "Wenn Sie sich nicht bei VorzaIQ registriert haben, können Sie diese E-Mail ignorieren.",
        "fr": "Si vous ne vous êtes pas inscrit sur VorzaIQ, vous pouvez ignorer cet e-mail.",
        "es": "Si no te has registrado en VorzaIQ, puedes ignorar este correo electrónico.",
    },
    # send_password_reset_email
    "reset_subject": {
        "nl": "Wachtwoord resetten — VorzaIQ",
        "en": "Reset password — VorzaIQ",
        "de": "Passwort zurücksetzen — VorzaIQ",
        "fr": "Réinitialiser le mot de passe — VorzaIQ",
        "es": "Restablecer contraseña — VorzaIQ",
    },
    "reset_header_sub": {
        "nl": "Wachtwoord opnieuw instellen",
        "en": "Reset your password",
        "de": "Passwort zurücksetzen",
        "fr": "Réinitialiser votre mot de passe",
        "es": "Restablecer tu contraseña",
    },
    "reset_heading": {
        "nl": "Hallo {full_name},",
        "en": "Hello {full_name},",
        "de": "Hallo {full_name},",
        "fr": "Bonjour {full_name},",
        "es": "Hola {full_name},",
    },
    "reset_body": {
        "nl": "We hebben een verzoek ontvangen om het wachtwoord van je account te resetten. Klik op de knop hieronder om een nieuw wachtwoord in te stellen.",
        "en": "We received a request to reset the password for your account. Click the button below to set a new password.",
        "de": "Wir haben eine Anfrage erhalten, das Passwort für Ihr Konto zurückzusetzen. Klicken Sie auf die Schaltfläche unten, um ein neues Passwort festzulegen.",
        "fr": "Nous avons reçu une demande de réinitialisation du mot de passe de votre compte. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.",
        "es": "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para establecer una nueva contraseña.",
    },
    "reset_cta": {
        "nl": "Wachtwoord resetten →",
        "en": "Reset password →",
        "de": "Passwort zurücksetzen →",
        "fr": "Réinitialiser le mot de passe →",
        "es": "Restablecer contraseña →",
    },
    "reset_validity": {
        "nl": "Deze link is <strong>1 uur geldig</strong>. Daarna moet je opnieuw een reset aanvragen.",
        "en": "This link is valid for <strong>1 hour</strong>. After that you must request a new reset.",
        "de": "Dieser Link ist <strong>1 Stunde lang gültig</strong>. Danach müssen Sie eine neue Zurücksetzung anfordern.",
        "fr": "Ce lien est valable <strong>1 heure</strong>. Après cela, vous devez demander une nouvelle réinitialisation.",
        "es": "Este enlace es válido por <strong>1 hora</strong>. Después de eso debes solicitar un nuevo restablecimiento.",
    },
    "reset_link_note": {
        "nl": "Of kopieer deze link in je browser:",
        "en": "Or copy this link into your browser:",
        "de": "Oder kopieren Sie diesen Link in Ihren Browser:",
        "fr": "Ou copiez ce lien dans votre navigateur :",
        "es": "O copia este enlace en tu navegador:",
    },
    "reset_footer": {
        "nl": "Als je geen wachtwoord-reset hebt aangevraagd, kun je deze mail veilig negeren. Je wachtwoord blijft ongewijzigd.",
        "en": "If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.",
        "de": "Wenn Sie keine Passwortzurücksetzung angefordert haben, können Sie diese E-Mail sicher ignorieren. Ihr Passwort bleibt unverändert.",
        "fr": "Si vous n'avez pas demandé de réinitialisation de mot de passe, vous pouvez ignorer cet e-mail en toute sécurité. Votre mot de passe restera inchangé.",
        "es": "Si no solicitaste un restablecimiento de contraseña, puedes ignorar este correo de forma segura. Tu contraseña permanecerá sin cambios.",
    },
    # send_interview_completed_notification — werkgever
    "interview_done_subject": {
        "nl": "Interview afgerond: {candidate_name} voor {vacancy_title}",
        "en": "Interview completed: {candidate_name} for {vacancy_title}",
        "de": "Interview abgeschlossen: {candidate_name} für {vacancy_title}",
        "fr": "Entretien terminé : {candidate_name} pour {vacancy_title}",
        "es": "Entrevista completada: {candidate_name} para {vacancy_title}",
    },
    "interview_done_header_sub": {
        "nl": "Interview afgerond — beoordeel de kandidaat",
        "en": "Interview completed — review the candidate",
        "de": "Interview abgeschlossen — Kandidat bewerten",
        "fr": "Entretien terminé — évaluez le candidat",
        "es": "Entrevista completada — evalúa al candidato",
    },
    "interview_done_heading": {
        "nl": "{candidate_name} heeft het interview afgerond!",
        "en": "{candidate_name} has completed the interview!",
        "de": "{candidate_name} hat das Interview abgeschlossen!",
        "fr": "{candidate_name} a terminé l'entretien !",
        "es": "¡{candidate_name} ha completado la entrevista!",
    },
    "interview_done_intro": {
        "nl": "De kandidaat heeft het AI-interview voor <strong style=\"color:#0f766e;\">{vacancy_title}</strong> afgerond. Bekijk de resultaten en geef binnen een week een reactie.",
        "en": "The candidate has completed the AI interview for <strong style=\"color:#0f766e;\">{vacancy_title}</strong>. Review the results and respond within one week.",
        "de": "Der Kandidat hat das KI-Interview für <strong style=\"color:#0f766e;\">{vacancy_title}</strong> abgeschlossen. Überprüfen Sie die Ergebnisse und antworten Sie innerhalb einer Woche.",
        "fr": "Le candidat a terminé l'entretien IA pour <strong style=\"color:#0f766e;\">{vacancy_title}</strong>. Consultez les résultats et répondez dans la semaine.",
        "es": "El candidato ha completado la entrevista IA para <strong style=\"color:#0f766e;\">{vacancy_title}</strong>. Revisa los resultados y responde dentro de una semana.",
    },
    "interview_done_score_label": {
        "nl": "Interview score",
        "en": "Interview score",
        "de": "Interview-Punktzahl",
        "fr": "Score d'entretien",
        "es": "Puntuación de entrevista",
    },
    "interview_done_deadline": {
        "nl": "Reageer voor <strong>{deadline}</strong> — de kandidaat verwacht binnen een week een reactie.",
        "en": "Respond by <strong>{deadline}</strong> — the candidate expects a response within one week.",
        "de": "Antworten Sie bis <strong>{deadline}</strong> — der Kandidat erwartet innerhalb einer Woche eine Antwort.",
        "fr": "Répondez avant le <strong>{deadline}</strong> — le candidat attend une réponse dans la semaine.",
        "es": "Responde antes del <strong>{deadline}</strong> — el candidato espera una respuesta dentro de una semana.",
    },
    "interview_done_cta": {
        "nl": "Bekijk in dashboard",
        "en": "View in dashboard",
        "de": "Im Dashboard ansehen",
        "fr": "Voir dans le tableau de bord",
        "es": "Ver en el panel",
    },
    "interview_done_footer": {
        "nl": "Je ontvangt deze melding omdat een kandidaat een interview heeft afgerond op een van jouw vacatures.",
        "en": "You receive this notification because a candidate completed an interview for one of your vacancies.",
        "de": "Sie erhalten diese Benachrichtigung, weil ein Kandidat ein Interview für eine Ihrer Stellen abgeschlossen hat.",
        "fr": "Vous recevez cette notification car un candidat a terminé un entretien pour l'une de vos offres.",
        "es": "Recibes esta notificación porque un candidato completó una entrevista para una de tus vacantes.",
    },
    # send_employer_review_reminder
    "reminder_subject": {
        "nl": "Herinnering: {candidate_name} wacht op je reactie ({vacancy_title})",
        "en": "Reminder: {candidate_name} is waiting for your response ({vacancy_title})",
        "de": "Erinnerung: {candidate_name} wartet auf Ihre Antwort ({vacancy_title})",
        "fr": "Rappel : {candidate_name} attend votre réponse ({vacancy_title})",
        "es": "Recordatorio: {candidate_name} espera tu respuesta ({vacancy_title})",
    },
    "reminder_header_sub": {
        "nl": "Herinnering: kandidaat wacht op reactie",
        "en": "Reminder: candidate awaiting response",
        "de": "Erinnerung: Kandidat wartet auf Antwort",
        "fr": "Rappel : candidat en attente de réponse",
        "es": "Recordatorio: candidato esperando respuesta",
    },
    "reminder_heading": {
        "nl": "{candidate_name} wacht al {days} dagen op je reactie",
        "en": "{candidate_name} has been waiting {days} days for your response",
        "de": "{candidate_name} wartet seit {days} Tagen auf Ihre Antwort",
        "fr": "{candidate_name} attend votre réponse depuis {days} jours",
        "es": "{candidate_name} lleva {days} días esperando tu respuesta",
    },
    "reminder_intro": {
        "nl": "De kandidaat heeft het interview afgerond voor <strong style=\"color:#0f766e;\">{vacancy_title}</strong> en wacht nog op een reactie. Kandidaten verwachten binnen een week antwoord.",
        "en": "The candidate completed the interview for <strong style=\"color:#0f766e;\">{vacancy_title}</strong> and is still waiting for a response. Candidates expect a reply within one week.",
        "de": "Der Kandidat hat das Interview für <strong style=\"color:#0f766e;\">{vacancy_title}</strong> abgeschlossen und wartet noch auf eine Antwort. Kandidaten erwarten eine Antwort innerhalb einer Woche.",
        "fr": "Le candidat a terminé l'entretien pour <strong style=\"color:#0f766e;\">{vacancy_title}</strong> et attend toujours une réponse. Les candidats attendent une réponse dans la semaine.",
        "es": "El candidato completó la entrevista para <strong style=\"color:#0f766e;\">{vacancy_title}</strong> y aún espera una respuesta. Los candidatos esperan una respuesta dentro de una semana.",
    },
    "reminder_cta": {
        "nl": "Bekijk en reageer nu",
        "en": "Review and respond now",
        "de": "Jetzt ansehen und antworten",
        "fr": "Consulter et répondre maintenant",
        "es": "Revisar y responder ahora",
    },
    "reminder_footer": {
        "nl": "Je ontvangt deze herinnering omdat een kandidaat wacht op jouw reactie. Snel reageren verbetert je werkgeversmerk.",
        "en": "You receive this reminder because a candidate is waiting for your response. Responding quickly improves your employer brand.",
        "de": "Sie erhalten diese Erinnerung, weil ein Kandidat auf Ihre Antwort wartet. Schnelles Reagieren verbessert Ihre Arbeitgebermarke.",
        "fr": "Vous recevez ce rappel car un candidat attend votre réponse. Répondre rapidement améliore votre marque employeur.",
        "es": "Recibes este recordatorio porque un candidato espera tu respuesta. Responder rápido mejora tu marca empleadora.",
    },
}


def get_string(key: str, lang: str) -> str:
    """Haal een vertaalde string op. Valt terug op 'nl' als de taal niet beschikbaar is."""
    return STRINGS.get(key, {}).get(lang) or STRINGS.get(key, {}).get("nl", "")


def _send(to: str, subject: str, html: str, from_email: str | None = None) -> None:
    """Stuur één e-mail via Resend. Logt fouten maar gooit geen exceptions."""
    if not RESEND_API_KEY:
        logger.info("[email] RESEND_API_KEY niet ingesteld — mail overgeslagen: %s", subject)
        return
    try:
        import resend  # type: ignore
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from": from_email or FROM_EMAIL,
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
    language: str = "nl",
) -> None:
    score_color = "#059669" if match_score >= 70 else "#d97706" if match_score >= 40 else "#dc2626"
    score_label = (
        get_string("application_score_strong", language)
        if match_score >= 70
        else get_string("application_score_good", language)
        if match_score >= 40
        else get_string("application_score_limited", language)
    )

    html = f"""
<!DOCTYPE html>
<html lang="{language}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#0f766e;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">ItsPeanuts AI</div>
      <div style="font-size:14px;color:#ccfbf1;margin-top:4px;">Jouw AI-gedreven recruitment partner</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        {get_string("application_heading", language)}
      </h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 24px;">
        {get_string("application_intro", language).format(candidate_name=candidate_name)}
      </p>

      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-size:12px;color:#0f766e;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">{get_string("application_position_label", language)}</div>
        <div style="font-size:18px;font-weight:700;color:#111827;">{vacancy_title}</div>
      </div>

      <div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin-bottom:28px;display:flex;align-items:center;gap:16px;">
        <div style="width:56px;height:56px;border-radius:50%;background:{score_color};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;">
          {match_score}%
        </div>
        <div>
          <div style="font-size:14px;font-weight:700;color:#111827;">{score_label}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:2px;">
            {get_string("application_score_explanation", language)}
          </div>
        </div>
      </div>

      <a href="{FRONTEND_URL}/candidate/sollicitaties"
         style="display:inline-block;padding:13px 28px;background:#0f766e;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
        {get_string("application_cta", language)}
      </a>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        {get_string("application_footer", language)}
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=candidate_email,
        subject=get_string("application_subject", language).format(vacancy_title=vacancy_title),
        html=html,
    )


# ── Werkgever: nieuwe sollicitant ────────────────────────────────────────────

def send_new_applicant_notification(
    employer_email: str,
    candidate_name: str,
    candidate_email: str,
    vacancy_title: str,
    match_score: int,
    language: str = "nl",
) -> None:
    score_color = "#059669" if match_score >= 70 else "#d97706" if match_score >= 40 else "#dc2626"
    score_bg    = "#d1fae5"  if match_score >= 70 else "#fef3c7"  if match_score >= 40 else "#fee2e2"
    score_label = (
        get_string("application_score_strong", language)
        if match_score >= 70
        else get_string("application_score_good", language)
        if match_score >= 40
        else get_string("application_score_limited", language)
    )

    html = f"""
<!DOCTYPE html>
<html lang="{language}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#0f766e;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">ItsPeanuts AI</div>
      <div style="font-size:14px;color:#ccfbf1;margin-top:4px;">{get_string("new_applicant_header_sub", language)}</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        {get_string("new_applicant_heading", language).format(vacancy_title=vacancy_title)}
      </h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 24px;">
        {get_string("new_applicant_intro", language)}
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:12px;width:40%;">{get_string("new_applicant_col_candidate", language)}</td>
            <td style="font-size:14px;font-weight:600;color:#111827;padding-bottom:12px;">{candidate_name}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:12px;">{get_string("new_applicant_col_email", language)}</td>
            <td style="font-size:14px;color:#374151;padding-bottom:12px;">{candidate_email}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">{get_string("new_applicant_col_score", language)}</td>
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
        {get_string("new_applicant_cta", language)}
      </a>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        {get_string("new_applicant_footer", language)}
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=employer_email,
        subject=get_string("new_applicant_subject", language).format(
            candidate_name=candidate_name, vacancy_title=vacancy_title
        ),
        html=html,
    )


# ── Werkgever: claim-notificatie (vacature gescraped, claim je gratis account) ─

def send_claim_notification(
    employer_email: str,
    vacancy_title: str,
    company_name: str,
    claim_url: str,
    language: str = "nl",
) -> None:
    html = f"""
<!DOCTYPE html>
<html lang="{language}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#0f766e;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">ItsPeanuts AI</div>
      <div style="font-size:14px;color:#ccfbf1;margin-top:4px;">{get_string("claim_header_sub", language)}</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 12px;">
        {get_string("claim_heading", language).format(company_name=company_name)}
      </h1>
      <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
        {get_string("claim_intro", language).format(vacancy_title=vacancy_title)}
      </p>

      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
        <div style="font-size:14px;color:#065f46;font-weight:600;margin-bottom:6px;">
          {get_string("claim_free_label", language)}
        </div>
        <div style="font-size:13px;color:#374151;line-height:1.6;">
          {get_string("claim_free_body", language)}
        </div>
      </div>

      <a href="{claim_url}"
         style="display:inline-block;padding:14px 32px;background:#0f766e;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        {get_string("claim_cta", language)}
      </a>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.6;">
        {get_string("claim_footer", language)}
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=employer_email,
        subject=get_string("claim_subject", language).format(vacancy_title=vacancy_title),
        html=html,
    )


# ── Kandidaat: status update (aangenomen / afgewezen) ────────────────────────

def send_status_update_email(
    candidate_email: str,
    candidate_name: str,
    vacancy_title: str,
    new_status: str,  # "shortlisted" | "interview" | "hired" | "rejected"
    language: str = "nl",
) -> None:
    """Stuur kandidaat een e-mail als hun sollicitatiestatus wijzigt."""
    if new_status == "shortlisted":
        header_bg = "#7C3AED"
        header_sub = get_string("status_shortlisted_header_sub", language)
        heading = get_string("status_shortlisted_heading", language)
        body = f"""
        <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
          {get_string("status_shortlisted_intro", language).format(candidate_name=candidate_name)}
        </p>
        <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
          <div style="font-size:12px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">{get_string("status_position_label", language)}</div>
          <div style="font-size:18px;font-weight:700;color:#111827;">{vacancy_title}</div>
        </div>
        <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 28px;">
          {get_string("status_shortlisted_body", language)}
        </p>
        """
        link_color = "#7C3AED"
        subject = get_string("status_shortlisted_subject", language).format(vacancy_title=vacancy_title)
    elif new_status == "interview":
        header_bg = "#d97706"
        header_sub = get_string("status_interview_header_sub", language)
        heading = get_string("status_interview_heading", language)
        body = f"""
        <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
          {get_string("status_interview_intro", language).format(candidate_name=candidate_name)}
        </p>
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
          <div style="font-size:12px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">{get_string("status_position_label", language)}</div>
          <div style="font-size:18px;font-weight:700;color:#111827;">{vacancy_title}</div>
        </div>
        <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 28px;">
          {get_string("status_interview_body", language)}
        </p>
        """
        link_color = "#d97706"
        subject = get_string("status_interview_subject", language).format(vacancy_title=vacancy_title)
    elif new_status == "hired":
        header_bg = "#059669"
        header_sub = get_string("status_hired_header_sub", language)
        heading = get_string("status_hired_heading", language)
        body = f"""
        <p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
          {get_string("status_hired_intro", language).format(candidate_name=candidate_name, vacancy_title=vacancy_title)}
        </p>
        <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 28px;">
          {get_string("status_hired_body", language)}
        </p>
        """
        link_color = "#059669"
        subject = get_string("status_hired_subject", language).format(vacancy_title=vacancy_title)
    else:  # rejected
        header_bg = "#6b7280"
        header_sub = get_string("status_rejected_header_sub", language)
        heading = get_string("status_rejected_heading", language)
        body = f"""
        <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 28px;">
          {get_string("status_rejected_body", language).format(candidate_name=candidate_name, vacancy_title=vacancy_title)}
        </p>
        """
        link_color = "#6b7280"
        subject = get_string("status_rejected_subject", language).format(vacancy_title=vacancy_title)

    html = f"""
<!DOCTYPE html>
<html lang="{language}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:{header_bg};padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">ItsPeanuts AI</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.75);margin-top:4px;">{header_sub}</div>
    </div>
    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">{heading}</h1>
      {body}
      <a href="{FRONTEND_URL}/candidate/sollicitaties"
         style="display:inline-block;padding:13px 28px;background:{link_color};color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
        {get_string("status_cta", language)}
      </a>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        {get_string("status_footer", language)}
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(to=candidate_email, subject=subject, html=html)


# ── Werkgever: team-uitnodiging ───────────────────────────────────────────────

def send_team_invite_email(
    to_email: str,
    full_name: str,
    inviter_name: str,
    org_name: str,
    temp_password: str,
    language: str = "nl",
) -> None:
    """Welkomstmail voor nieuw toegevoegd teamlid."""
    html = f"""
<!DOCTYPE html>
<html lang="{language}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#0f766e;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">ItsPeanuts AI</div>
      <div style="font-size:14px;color:#ccfbf1;margin-top:4px;">{get_string("team_invite_header_sub", language)}</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        {get_string("team_invite_heading", language).format(full_name=full_name)}
      </h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 24px;">
        {get_string("team_invite_intro", language).format(inviter_name=inviter_name, org_name=org_name)}
      </p>

      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <div style="font-size:12px;color:#0f766e;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">{get_string("team_invite_credentials_label", language)}</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:8px;width:40%;">{get_string("team_invite_email_label", language)}</td>
            <td style="font-size:14px;font-weight:600;color:#111827;padding-bottom:8px;">{to_email}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#6b7280;">{get_string("team_invite_password_label", language)}</td>
            <td style="font-size:14px;font-weight:700;color:#0f766e;font-family:monospace;">{temp_password}</td>
          </tr>
        </table>
      </div>

      <p style="font-size:13px;color:#6b7280;margin:0 0 20px;">
        {get_string("team_invite_password_note", language)}
      </p>

      <a href="{FRONTEND_URL}/employer"
         style="display:inline-block;padding:13px 28px;background:#0f766e;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
        {get_string("team_invite_cta", language)}
      </a>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        {get_string("team_invite_footer", language)}
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=to_email,
        subject=get_string("team_invite_subject", language).format(org_name=org_name),
        html=html,
    )


# ── Werkgever: e-mail verificatie ────────────────────────────────────────────

def send_verification_email(
    employer_email: str,
    full_name: str,
    verify_url: str,
    language: str = "nl",
) -> None:
    """Stuur werkgever een verificatiemail na registratie."""
    html = f"""
<!DOCTYPE html>
<html lang="{language}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#7C3AED;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">VorzaIQ</div>
      <div style="font-size:14px;color:#e9d5ff;margin-top:4px;">{get_string("verification_header_sub", language)}</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        {get_string("verification_heading", language).format(full_name=full_name)}
      </h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
        {get_string("verification_body", language)}
      </p>

      <a href="{verify_url}"
         style="display:inline-block;padding:14px 32px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        {get_string("verification_cta", language)}
      </a>

      <p style="font-size:13px;color:#6b7280;margin:28px 0 0;line-height:1.6;">
        {get_string("verification_link_note", language)}<br>
        <span style="font-size:12px;color:#9ca3af;word-break:break-all;">{verify_url}</span>
      </p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        {get_string("verification_footer", language)}
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=employer_email,
        subject=get_string("verification_subject", language),
        html=html,
    )


# ── Wachtwoord reset ──────────────────────────────────────────────────────────

def send_password_reset_email(
    to_email: str,
    full_name: str,
    reset_url: str,
    language: str = "nl",
) -> None:
    """Stuur een wachtwoord-reset link naar de gebruiker."""
    html = f"""
<!DOCTYPE html>
<html lang="{language}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#7C3AED;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">VorzaIQ</div>
      <div style="font-size:14px;color:#e9d5ff;margin-top:4px;">{get_string("reset_header_sub", language)}</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        {get_string("reset_heading", language).format(full_name=full_name)}
      </h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
        {get_string("reset_body", language)}
      </p>

      <a href="{reset_url}"
         style="display:inline-block;padding:14px 32px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        {get_string("reset_cta", language)}
      </a>

      <p style="font-size:13px;color:#6b7280;margin:28px 0 0;line-height:1.6;">
        {get_string("reset_validity", language)}<br><br>
        {get_string("reset_link_note", language)}<br>
        <span style="font-size:12px;color:#9ca3af;word-break:break-all;">{reset_url}</span>
      </p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        {get_string("reset_footer", language)}
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=to_email,
        subject=get_string("reset_subject", language),
        html=html,
    )


# ── Admin: nieuwe promotie-betaling ontvangen ─────────────────────────────────

def send_promotion_notification(
    vacancy_title: str,
    employer_name: str,
    employer_email: str,
    duration_days: int,
    total_price: float,
    promotion_id: int,
) -> None:
    """Stuur admin een melding zodra een werkgever een promotie heeft betaald."""
    html = f"""
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#7C3AED;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">VorzaIQ</div>
      <div style="font-size:14px;color:#e9d5ff;margin-top:4px;">🚀 Nieuwe promotie-betaling ontvangen</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        Actie vereist: campagnes instellen
      </h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">
        Er is een betaalde promotieaanvraag ontvangen. Stel de campagnes in op alle platforms.
      </p>

      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:12px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:10px;width:40%;">Vacature</td>
            <td style="font-size:14px;font-weight:700;color:#111827;padding-bottom:10px;">{vacancy_title}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:10px;">Werkgever</td>
            <td style="font-size:14px;color:#374151;padding-bottom:10px;">{employer_name} ({employer_email})</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:10px;">Duur</td>
            <td style="font-size:14px;color:#374151;padding-bottom:10px;">{duration_days} dagen</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;padding-bottom:10px;">Bedrag</td>
            <td style="font-size:15px;font-weight:800;color:#059669;padding-bottom:10px;">€{total_price:.0f} ontvangen</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#7c3aed;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Platforms</td>
            <td style="font-size:14px;color:#374151;">Facebook · Instagram · Google · TikTok · LinkedIn</td>
          </tr>
        </table>
      </div>

      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:13px;color:#92400e;font-weight:600;margin-bottom:6px;">⚡ Actie vereist</div>
        <ol style="font-size:13px;color:#78350f;margin:0;padding-left:18px;line-height:1.8;">
          <li>Stel campagnes in op Facebook Business Manager</li>
          <li>Maak Google Ads campagne aan</li>
          <li>Zet LinkedIn Campaign Manager op</li>
          <li>Stel TikTok for Business campagne in</li>
          <li>Markeer promotie #{promotion_id} als "active" in admin panel</li>
        </ol>
      </div>

      <p style="font-size:12px;color:#9ca3af;margin:0;">
        Promotie ID: #{promotion_id} · Ga naar het admin panel voor details.
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=ADMIN_EMAIL,
        subject=f"🚀 Nieuwe promotie betaald: {vacancy_title} — €{total_price:.0f} voor {duration_days} dagen",
        html=html,
    )


# ── Factuur / Invoice ─────────────────────────────────────────────────────────

_PLAN_LABELS = {
    "normaal": {"nl": "Normaal abonnement", "en": "Standard subscription", "de": "Standard-Abonnement", "fr": "Abonnement Standard", "es": "Suscripción Estándar"},
    "premium": {"nl": "Premium abonnement", "en": "Premium subscription", "de": "Premium-Abonnement", "fr": "Abonnement Premium", "es": "Suscripción Premium"},
    "per_vacature": {"nl": "Vacature plaatsing (pay-per-use)", "en": "Vacancy posting (pay-per-use)", "de": "Stellenausschreibung (pay-per-use)", "fr": "Publication d'offre (pay-per-use)", "es": "Publicación de vacante (pay-per-use)"},
}

_INTERVAL_LABELS = {
    "month": {"nl": "maandelijks", "en": "monthly", "de": "monatlich", "fr": "mensuel", "es": "mensual"},
    "year":  {"nl": "jaarlijks",   "en": "yearly",  "de": "jährlich",  "fr": "annuel",  "es": "anual"},
}

_INV_STRINGS = {
    "invoice_subject": {
        "nl": "Uw factuur #{invoice_number} — VorzaIQ",
        "en": "Your invoice #{invoice_number} — VorzaIQ",
        "de": "Ihre Rechnung #{invoice_number} — VorzaIQ",
        "fr": "Votre facture #{invoice_number} — VorzaIQ",
        "es": "Su factura #{invoice_number} — VorzaIQ",
    },
    "invoice_heading": {
        "nl": "Factuur",
        "en": "Invoice",
        "de": "Rechnung",
        "fr": "Facture",
        "es": "Factura",
    },
    "invoice_thank_you": {
        "nl": "Bedankt voor uw betaling! Hieronder vindt u uw factuur.",
        "en": "Thank you for your payment! Please find your invoice below.",
        "de": "Vielen Dank für Ihre Zahlung! Nachfolgend finden Sie Ihre Rechnung.",
        "fr": "Merci pour votre paiement ! Vous trouverez votre facture ci-dessous.",
        "es": "¡Gracias por su pago! A continuación encontrará su factura.",
    },
    "invoice_number_label": {
        "nl": "Factuurnummer", "en": "Invoice number", "de": "Rechnungsnummer", "fr": "Numéro de facture", "es": "Número de factura",
    },
    "invoice_date_label": {
        "nl": "Factuurdatum", "en": "Invoice date", "de": "Rechnungsdatum", "fr": "Date de facture", "es": "Fecha de factura",
    },
    "invoice_to_label": {
        "nl": "Factuur aan", "en": "Bill to", "de": "Rechnung an", "fr": "Facturé à", "es": "Facturado a",
    },
    "invoice_description_label": {
        "nl": "Omschrijving", "en": "Description", "de": "Beschreibung", "fr": "Description", "es": "Descripción",
    },
    "invoice_amount_label": {
        "nl": "Bedrag (incl. BTW)", "en": "Amount (incl. VAT)", "de": "Betrag (inkl. MwSt.)", "fr": "Montant (TVA incl.)", "es": "Importe (IVA incl.)",
    },
    "invoice_footer": {
        "nl": "VorzaIQ · KvK: [KvK-nummer] · BTW: NL[BTW-nummer] · vorzaiq.com",
        "en": "VorzaIQ · CoC: [CoC-number] · VAT: NL[VAT-number] · vorzaiq.com",
        "de": "VorzaIQ · Handelsregister: [Nummer] · USt.: NL[Nummer] · vorzaiq.com",
        "fr": "VorzaIQ · RCS : [Numéro] · TVA : NL[Numéro] · vorzaiq.com",
        "es": "VorzaIQ · Reg. Mercantil: [Número] · IVA: NL[Número] · vorzaiq.com",
    },
}


def send_invoice_email(
    employer_email: str,
    employer_name: str,
    invoice_number: str,
    plan: str,
    interval: str | None,
    amount_total: float,
    invoice_date: str,
    language: str = "nl",
) -> None:
    """Stuur factuur naar werkgever (en optioneel boekhouder) na succesvolle betaling."""

    def s(key: str) -> str:
        return _INV_STRINGS.get(key, {}).get(language) or _INV_STRINGS.get(key, {}).get("nl", "")

    plan_label = _PLAN_LABELS.get(plan, {}).get(language) or plan
    if interval and interval in _INTERVAL_LABELS:
        plan_label += f" ({_INTERVAL_LABELS[interval].get(language, interval)})"

    subject = s("invoice_subject").replace("{invoice_number}", invoice_number)

    html = f"""<!DOCTYPE html>
<html lang="{language}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#7c3aed;padding:32px 36px;">
      <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">VorzaIQ</div>
      <div style="font-size:13px;color:#ddd6fe;margin-top:4px;">vorzaiq.com</div>
    </div>

    <!-- Body -->
    <div style="padding:32px 36px;">
      <h1 style="font-size:24px;font-weight:700;color:#111827;margin:0 0 8px;">{s("invoice_heading")} #{invoice_number}</h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 28px;">{s("invoice_thank_you")}</p>

      <!-- Meta tabel -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="font-size:13px;color:#6b7280;padding:6px 0;width:40%;">{s("invoice_number_label")}</td>
          <td style="font-size:13px;color:#111827;font-weight:600;">{invoice_number}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#6b7280;padding:6px 0;">{s("invoice_date_label")}</td>
          <td style="font-size:13px;color:#111827;">{invoice_date}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#6b7280;padding:6px 0;">{s("invoice_to_label")}</td>
          <td style="font-size:13px;color:#111827;">{employer_name}<br><span style="color:#6b7280;">{employer_email}</span></td>
        </tr>
      </table>

      <!-- Factuurregels -->
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="text-align:left;padding:12px 16px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">{s("invoice_description_label")}</th>
            <th style="text-align:right;padding:12px 16px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">{s("invoice_amount_label")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:14px 16px;font-size:14px;color:#374151;border-top:1px solid #e5e7eb;">{plan_label}</td>
            <td style="padding:14px 16px;font-size:14px;color:#374151;font-weight:700;text-align:right;border-top:1px solid #e5e7eb;">€{amount_total:.2f}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background:#7c3aed;">
            <td style="padding:14px 16px;font-size:15px;font-weight:700;color:#ffffff;">Totaal</td>
            <td style="padding:14px 16px;font-size:15px;font-weight:700;color:#ffffff;text-align:right;">€{amount_total:.2f}</td>
          </tr>
        </tfoot>
      </table>

    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 36px;text-align:center;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">{s("invoice_footer")}</p>
    </div>

  </div>
</body>
</html>"""

    _send(to=employer_email, subject=subject, html=html, from_email=INVOICE_FROM_EMAIL)

    if BOOKKEEPER_EMAIL and BOOKKEEPER_EMAIL != employer_email:
        _send(to=BOOKKEEPER_EMAIL, subject=f"[Kopie boekhouder] {subject}", html=html, from_email=INVOICE_FROM_EMAIL)


# ── Werkgever: interview afgerond → beoordeel kandidaat ────────────────────

def send_interview_completed_notification(
    employer_email: str,
    candidate_name: str,
    vacancy_title: str,
    interview_score: int,
    deadline_str: str,
    language: str = "nl",
) -> None:
    """Stuur werkgever een melding dat een kandidaat het interview heeft afgerond."""
    score_color = "#059669" if interview_score >= 70 else "#d97706" if interview_score >= 40 else "#dc2626"

    html = f"""
<!DOCTYPE html>
<html lang="{language}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#0f766e;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">VorzaIQ</div>
      <div style="font-size:14px;color:#ccfbf1;margin-top:4px;">{get_string("interview_done_header_sub", language)}</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        {get_string("interview_done_heading", language).format(candidate_name=candidate_name)}
      </h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
        {get_string("interview_done_intro", language).format(vacancy_title=vacancy_title)}
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px;">
        <div style="width:56px;height:56px;border-radius:50%;background:{score_color};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;">
          {interview_score}%
        </div>
        <div>
          <div style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">{get_string("interview_done_score_label", language)}</div>
          <div style="font-size:18px;font-weight:700;color:#111827;">{candidate_name}</div>
        </div>
      </div>

      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <p style="font-size:14px;color:#92400e;margin:0;line-height:1.5;">
          {get_string("interview_done_deadline", language).format(deadline=deadline_str)}
        </p>
      </div>

      <a href="{FRONTEND_URL}/employer"
         style="display:inline-block;padding:13px 28px;background:#0f766e;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
        {get_string("interview_done_cta", language)}
      </a>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        {get_string("interview_done_footer", language)}
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=employer_email,
        subject=get_string("interview_done_subject", language).format(
            candidate_name=candidate_name, vacancy_title=vacancy_title,
        ),
        html=html,
    )


# ── Werkgever: herinnering om te reageren ──────────────────────────────────

def send_employer_review_reminder(
    employer_email: str,
    candidate_name: str,
    vacancy_title: str,
    days_waiting: int,
    language: str = "nl",
) -> None:
    """Stuur werkgever een herinnering dat een kandidaat wacht op reactie."""
    html = f"""
<!DOCTYPE html>
<html lang="{language}">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:#d97706;padding:28px 32px;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">VorzaIQ</div>
      <div style="font-size:14px;color:#fef3c7;margin-top:4px;">{get_string("reminder_header_sub", language)}</div>
    </div>

    <div style="padding:32px;">
      <h1 style="font-size:20px;font-weight:700;color:#111827;margin:0 0 8px;">
        {get_string("reminder_heading", language).format(candidate_name=candidate_name, days=days_waiting)}
      </h1>
      <p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
        {get_string("reminder_intro", language).format(vacancy_title=vacancy_title)}
      </p>

      <a href="{FRONTEND_URL}/employer"
         style="display:inline-block;padding:13px 28px;background:#d97706;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">
        {get_string("reminder_cta", language)}
      </a>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        {get_string("reminder_footer", language)}
      </p>
    </div>
  </div>
</body>
</html>
"""
    _send(
        to=employer_email,
        subject=get_string("reminder_subject", language).format(
            candidate_name=candidate_name, vacancy_title=vacancy_title,
        ),
        html=html,
    )
