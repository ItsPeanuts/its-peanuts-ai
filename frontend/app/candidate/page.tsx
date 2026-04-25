"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { me, getMyApplications, getMyInterviews, getRecommendations, ApplicationWithDetails, InterviewSession, RecommendationOut } from "@/lib/api";
import { clearSession, getToken, getRole } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";

function StatusBadge({ status }: { status: string }) {
  const { lang } = useLanguage();

  const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    applied:     { label: { nl: "In behandeling", en: "Pending", de: "In Bearbeitung", fr: "En attente", es: "Pendiente" }[lang] ?? "In behandeling", color: "#6b7280", bg: "#f3f4f6" },
    shortlisted: { label: { nl: "Geselecteerd",   en: "Shortlisted", de: "Vorausgewählt", fr: "Présélectionné", es: "Preseleccionado" }[lang] ?? "Geselecteerd", color: "#1d4ed8", bg: "#dbeafe" },
    interview:   { label: { nl: "Interview",      en: "Interview", de: "Interview", fr: "Entretien", es: "Entrevista" }[lang] ?? "Interview", color: "#d97706", bg: "#fef3c7" },
    hired:       { label: { nl: "Aangenomen",     en: "Hired", de: "Eingestellt", fr: "Embauché", es: "Contratado" }[lang] ?? "Aangenomen", color: "#059669", bg: "#d1fae5" },
    rejected:    { label: { nl: "Afgewezen",      en: "Rejected", de: "Abgelehnt", fr: "Refusé", es: "Rechazado" }[lang] ?? "Afgewezen", color: "#dc2626", bg: "#fee2e2" },
  };

  const s = STATUS_LABELS[status] ?? { label: status, color: "#374151", bg: "#f3f4f6" };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>;
  const color = score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";
  const bg    = score >= 70 ? "#d1fae5" : score >= 40 ? "#fef3c7" : "#fee2e2";
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, color, background: bg, border: `1px solid ${color}` }}>
      {score}%
    </span>
  );
}

export default function CandidateDashboard() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role  = useMemo(() => getRole(), []);
  const { T, lang } = useLanguage();

  const [userName, setUserName]       = useState("");
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [interviews, setInterviews]   = useState<InterviewSession[]>([]);
  const [loading, setLoading]         = useState(true);

  // Lisa aanbevelingen
  const [recommendations, setRecommendations] = useState<RecommendationOut[]>([]);
  const [recoLoading, setRecoLoading]         = useState(false);
  const [recoLoaded, setRecoLoaded]           = useState(false);
  const [recoErr, setRecoErr]                 = useState<string | null>(null);

  const txt = {
    welcomeBack:       { nl: "Welkom terug", en: "Welcome back", de: "Willkommen zurück", fr: "Bienvenue", es: "Bienvenido" }[lang] ?? "Welkom terug",
    dashboardSub:      { nl: "Hier zie je al je sollicitatie-activiteit in een oogopslag.", en: "Here you can see all your application activity at a glance.", de: "Hier sehen Sie all Ihre Bewerbungsaktivitäten auf einen Blick.", fr: "Voici toutes vos activités de candidature en un coup d'œil.", es: "Aquí puedes ver toda tu actividad de solicitudes de un vistazo." }[lang] ?? "Hier zie je al je sollicitatie-activiteit in een oogopslag.",
    statTotal:         { nl: "Totaal", en: "Total", de: "Gesamt", fr: "Total", es: "Total" }[lang] ?? "Totaal",
    statInProgress:    { nl: "In behandeling", en: "In progress", de: "In Bearbeitung", fr: "En cours", es: "En proceso" }[lang] ?? "In behandeling",
    statInterview:     { nl: "Interview", en: "Interview", de: "Interview", fr: "Entretien", es: "Entrevista" }[lang] ?? "Interview",
    statAvgScore:      { nl: "Gem. AI-score", en: "Avg. AI score", de: "Ø KI-Score", fr: "Score IA moy.", es: "Puntuación IA" }[lang] ?? "Gem. AI-score",
    recentApps:        { nl: "Recente sollicitaties", en: "Recent applications", de: "Aktuelle Bewerbungen", fr: "Candidatures récentes", es: "Solicitudes recientes" }[lang] ?? "Recente sollicitaties",
    viewAll:           { nl: "Alle bekijken →", en: "View all →", de: "Alle anzeigen →", fr: "Tout voir →", es: "Ver todo →" }[lang] ?? "Alle bekijken →",
    noApplicationsSub: { nl: "Bekijk openstaande vacatures en solliciteer!", en: "Browse open jobs and apply!", de: "Aktuelle Stellenangebote ansehen und bewerben!", fr: "Parcourez les offres d'emploi et postulez!", es: "¡Busca vacantes abiertas y postúlate!" }[lang] ?? "Bekijk openstaande vacatures en solliciteer!",
    searchJobs:        { nl: "Zoek vacatures", en: "Search jobs", de: "Jobs suchen", fr: "Chercher des emplois", es: "Buscar empleos" }[lang] ?? "Zoek vacatures",
    locationUnknown:   { nl: "Locatie onbekend", en: "Location unknown", de: "Standort unbekannt", fr: "Lieu inconnu", es: "Ubicación desconocida" }[lang] ?? "Locatie onbekend",
    quickActions:      { nl: "Snelle acties", en: "Quick actions", de: "Schnellaktionen", fr: "Actions rapides", es: "Acciones rápidas" }[lang] ?? "Snelle acties",
    uploadCV:          T.candidate.uploadCV,
    allApplications:   { nl: "Alle sollicitaties", en: "All applications", de: "Alle Bewerbungen", fr: "Toutes les candidatures", es: "Todas las solicitudes" }[lang] ?? "Alle sollicitaties",
    profileSettings:   { nl: "Profiel & instellingen", en: "Profile & settings", de: "Profil & Einstellungen", fr: "Profil & paramètres", es: "Perfil & ajustes" }[lang] ?? "Profiel & instellingen",
    lisaRecommends:    { nl: "Lisa's aanbevelingen", en: "Lisa's recommendations", de: "Lisas Empfehlungen", fr: "Recommandations de Lisa", es: "Recomendaciones de Lisa" }[lang] ?? "Lisa's aanbevelingen",
    lisaDescription:   { nl: "Laat Lisa je CV vergelijken met openstaande vacatures en ontdek de beste matches.", en: "Let Lisa compare your CV with open jobs and discover the best matches.", de: "Lassen Sie Lisa Ihren Lebenslauf mit offenen Stellen vergleichen.", fr: "Laissez Lisa comparer votre CV avec les offres disponibles.", es: "Deja que Lisa compare tu CV con las vacantes disponibles." }[lang] ?? "Laat Lisa je CV vergelijken met openstaande vacatures en ontdek de beste matches.",
    analyzeMatches:    { nl: "Analyseer mijn matches", en: "Analyze my matches", de: "Meine Übereinstimmungen analysieren", fr: "Analyser mes correspondances", es: "Analizar mis coincidencias" }[lang] ?? "Analyseer mijn matches",
    lisaAnalyzing:     { nl: "Lisa analyseert...", en: "Lisa is analyzing...", de: "Lisa analysiert...", fr: "Lisa analyse...", es: "Lisa está analizando..." }[lang] ?? "Lisa analyseert...",
    lisaWait:          { nl: "Dit duurt even", en: "This might take a moment", de: "Dies dauert einen Moment", fr: "Cela peut prendre un moment", es: "Esto puede tomar un momento" }[lang] ?? "Dit duurt even",
    noMatches:         { nl: "Geen passende vacatures gevonden op dit moment.", en: "No matching jobs found at this moment.", de: "Derzeit keine passenden Stellen gefunden.", fr: "Aucun emploi correspondant trouvé pour le moment.", es: "No se encontraron empleos coincidentes en este momento." }[lang] ?? "Geen passende vacatures gevonden op dit moment.",
    viewVacancy:       { nl: "Bekijk vacature →", en: "View job →", de: "Stelle ansehen →", fr: "Voir l'offre →", es: "Ver vacante →" }[lang] ?? "Bekijk vacature →",
    reanalyze:         { nl: "Opnieuw analyseren", en: "Re-analyze", de: "Erneut analysieren", fr: "Réanalyser", es: "Reanalizar" }[lang] ?? "Opnieuw analyseren",
    scheduled:         { nl: "Ingepland", en: "Scheduled", de: "Geplant", fr: "Planifié", es: "Programado" }[lang] ?? "Ingepland",
    join:              { nl: "Deelnemen", en: "Join", de: "Beitreten", fr: "Rejoindre", es: "Unirse" }[lang] ?? "Deelnemen",
    teamsInterview:    { nl: "Teams gesprek", en: "Teams meeting", de: "Teams-Gespräch", fr: "Réunion Teams", es: "Reunión Teams" }[lang] ?? "Teams gesprek",
    phoneInterview:    { nl: "Telefonisch", en: "Phone call", de: "Telefonisch", fr: "Téléphonique", es: "Telefónica" }[lang] ?? "Telefonisch",
    inPersonInterview: { nl: "Live gesprek", en: "In-person", de: "Persönliches Gespräch", fr: "En personne", es: "En persona" }[lang] ?? "Live gesprek",
    meeting:           { nl: "Gesprek", en: "Meeting", de: "Gespräch", fr: "Entretien", es: "Entrevista" }[lang] ?? "Gesprek",
    navDashboard:      T.candidate.dashboard,
    navApplications:   T.candidate.myApplications,
    navCV:             T.candidate.myCV,
    navProfile:        T.candidate.myProfile,
    navJobs:           { nl: "Vacatures", en: "Jobs", de: "Stellen", fr: "Emplois", es: "Empleos" }[lang] ?? "Vacatures",
  };

  useEffect(() => {
    if (!token) { router.replace("/candidate/login"); return; }
    if (role && role !== "candidate" && role !== "admin") { router.replace("/employer"); return; }

    const loadData = async (initial = false) => {
      try {
        const [user, apps] = await Promise.all([me(token), getMyApplications(token)]);
        setUserName(user.full_name || user.email);
        setApplications(apps);
        try { setInterviews(await getMyInterviews(token)); } catch { /* geen gesprekken */ }
      } catch {
        if (initial) { clearSession(); router.replace("/candidate/login"); }
      } finally {
        if (initial) setLoading(false);
      }
    };

    loadData(true);
    const interval = setInterval(() => loadData(false), 30_000);
    return () => clearInterval(interval);
  }, [router, token, role]);

  const stats = {
    total:      applications.length,
    inProgress: applications.filter((a) => a.status === "applied" || a.status === "shortlisted").length,
    interview:  applications.filter((a) => a.status === "interview").length,
    avgScore: (() => {
      const scored = applications.filter((a) => a.match_score !== null);
      if (!scored.length) return null;
      return Math.round(scored.reduce((s, a) => s + (a.match_score ?? 0), 0) / scored.length);
    })(),
  };

  async function handleGetRecommendations() {
    if (!token || recoLoading) return;
    setRecoLoading(true);
    setRecoErr(null);
    try {
      const recs = await getRecommendations(token);
      setRecommendations(recs);
      setRecoLoaded(true);
    } catch (e: unknown) {
      setRecoErr(e instanceof Error ? e.message : { nl: "Ophalen mislukt", en: "Failed to fetch", de: "Abrufen fehlgeschlagen", fr: "Échec de la récupération", es: "Error al obtener" }[lang] ?? "Ophalen mislukt");
    } finally {
      setRecoLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>{T.common.loading}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>

      {/* Sub-nav */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div className="candidate-subnav" style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", height: 48, display: "flex", alignItems: "center", gap: 4 }}>
          {[
            { label: txt.navDashboard,    href: "/candidate" },
            { label: txt.navApplications, href: "/candidate/sollicitaties" },
            { label: txt.navCV,           href: "/candidate/cv" },
            { label: txt.navProfile,      href: "/candidate/profiel" },
            { label: txt.navJobs,         href: "/vacatures" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, color: "#6b7280", textDecoration: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#7C3AED"; (e.currentTarget as HTMLElement).style.background = "#f0fdfa"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6b7280"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {item.label}
            </Link>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{userName}</span>
            <button
              onClick={() => { clearSession(); router.push("/"); }}
              style={{ fontSize: 13, fontWeight: 500, color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}
            >
              {T.candidate.logout}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

        {/* Welkomst header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
            {txt.welcomeBack}, {userName.split(" ")[0]}
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
            {txt.dashboardSub}
          </p>
        </div>

        {/* Stats */}
        <div className="candidate-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: txt.statTotal,      value: stats.total,      color: "#7C3AED" },
            { label: txt.statInProgress, value: stats.inProgress, color: "#d97706" },
            { label: txt.statInterview,  value: stats.interview,  color: "#7c3aed" },
            { label: txt.statAvgScore,   value: stats.avgScore !== null ? `${stats.avgScore}%` : "—", color: "#059669" },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Geplande gesprekken */}
        {interviews.length > 0 && (
          <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 8 }}>
            {interviews.map((iv) => {
              const dt = new Date(iv.scheduled_at);
              const typeLabel = {
                teams:     txt.teamsInterview,
                phone:     txt.phoneInterview,
                in_person: txt.inPersonInterview,
              }[iv.interview_type] || iv.interview_type;
              return (
                <div
                  key={iv.id}
                  style={{ background: "#fff", border: "1px solid #ccfbf1", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                      {typeLabel} — {iv.vacancy_title || txt.meeting}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {dt.toLocaleDateString(lang === "nl" ? "nl-NL" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}
                      {" · "}{dt.toLocaleTimeString(lang === "nl" ? "nl-NL" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}{iv.duration_minutes} min
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, background: "#f0fdfa", color: "#7C3AED" }}>
                      {txt.scheduled}
                    </span>
                    {iv.teams_join_url && (
                      <a
                        href={iv.teams_join_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#fff", background: "#0078d4", textDecoration: "none" }}
                      >
                        {txt.join}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Hoofd grid */}
        <div className="candidate-main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>

          {/* Recente sollicitaties */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{txt.recentApps}</h2>
              <Link href="/candidate/sollicitaties" style={{ fontSize: 12, color: "#7C3AED", fontWeight: 600, textDecoration: "none" }}>
                {txt.viewAll}
              </Link>
            </div>

            {applications.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, background: "#f3f4f6", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <svg width="22" height="22" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p style={{ fontWeight: 600, color: "#374151", fontSize: 14, margin: "0 0 4px" }}>{T.candidate.noApplications}</p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 16px" }}>{txt.noApplicationsSub}</p>
                <Link
                  href="/vacatures"
                  style={{ display: "inline-block", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", background: "#7C3AED", textDecoration: "none" }}
                >
                  {txt.searchJobs}
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {applications.slice(0, 5).map((app) => {
                  const isTerminal = app.status === "rejected" || app.status === "auto_rejected" || app.status === "hired";
                  const incomplete = !isTerminal && (!app.chat_completed || (app.interview_required && !app.interview_completed));
                  return (
                    <Link
                      key={app.application_id}
                      href={`/candidate/sollicitaties/${app.application_id}`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: incomplete ? "#fffbeb" : "#f9fafb", borderRadius: 10, border: incomplete ? "1px solid #fcd34d" : "1px solid transparent", textDecoration: "none" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = incomplete ? "#f59e0b" : "#ccfbf1"; (e.currentTarget as HTMLElement).style.background = incomplete ? "#fef3c7" : "#f0fdfa"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = incomplete ? "#fcd34d" : "transparent"; (e.currentTarget as HTMLElement).style.background = incomplete ? "#fffbeb" : "#f9fafb"; }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{app.vacancy_title}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                          {app.vacancy_location || txt.locationUnknown} · {new Date(app.created_at).toLocaleDateString(lang === "nl" ? "nl-NL" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB")}
                        </div>
                        {incomplete && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#d97706", marginTop: 4 }}>
                            {{ nl: "Actie vereist", en: "Action required", de: "Aktion erforderlich", fr: "Action requise", es: "Acción requerida" }[lang] ?? "Actie vereist"} — {!app.chat_completed ? "chat met Lisa" : "video-interview"}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <ScoreBadge score={app.match_score} />
                        <StatusBadge status={app.status} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Snelle acties */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px" }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 14px" }}>{txt.quickActions}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link
                  href="/vacatures"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#fff", background: "#7C3AED", textDecoration: "none" }}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  {txt.searchJobs}
                </Link>
                <Link
                  href="/candidate/cv"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#7C3AED", background: "#f0fdfa", textDecoration: "none" }}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  {txt.uploadCV}
                </Link>
                <Link
                  href="/candidate/sollicitaties"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#374151", background: "#f9fafb", textDecoration: "none" }}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  {txt.allApplications}
                </Link>
                <Link
                  href="/candidate/profiel"
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500, color: "#374151", background: "#f9fafb", textDecoration: "none" }}
                >
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {txt.profileSettings}
                </Link>
              </div>
            </div>

            {/* Lisa aanbevelingen */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>L</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{txt.lisaRecommends}</div>
              </div>

              {!recoLoaded && !recoLoading && (
                <>
                  <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, margin: "0 0 14px" }}>
                    {txt.lisaDescription}
                  </p>
                  <button
                    onClick={handleGetRecommendations}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#fff", background: "#7C3AED", border: "none", cursor: "pointer" }}
                  >
                    {txt.analyzeMatches}
                  </button>
                </>
              )}

              {recoLoading && (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 12, color: "#7C3AED", fontWeight: 500 }}>{txt.lisaAnalyzing}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{txt.lisaWait}</div>
                </div>
              )}

              {recoErr && (
                <div style={{ fontSize: 12, color: "#dc2626", background: "#fee2e2", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                  {recoErr}
                </div>
              )}

              {recoLoaded && recommendations.length === 0 && (
                <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "12px 0" }}>
                  {txt.noMatches}
                </div>
              )}

              {recoLoaded && recommendations.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {recommendations.map((r) => (
                    <div key={r.vacancy_id} style={{ background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb", padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1 }}>{r.title}</div>
                        <span style={{
                          flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
                          color: r.match_score >= 70 ? "#059669" : r.match_score >= 40 ? "#d97706" : "#dc2626",
                          background: r.match_score >= 70 ? "#d1fae5" : r.match_score >= 40 ? "#fef3c7" : "#fee2e2",
                        }}>
                          {r.match_score}%
                        </span>
                      </div>
                      {r.location && <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{r.location}</div>}
                      <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5, marginBottom: 8 }}>{r.reason}</div>
                      <Link
                        href={`/vacatures/${r.vacancy_id}`}
                        style={{ fontSize: 12, fontWeight: 600, color: "#7C3AED", textDecoration: "none" }}
                      >
                        {txt.viewVacancy}
                      </Link>
                    </div>
                  ))}
                  <button
                    onClick={handleGetRecommendations}
                    style={{ width: "100%", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 500, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", cursor: "pointer", marginTop: 2 }}
                  >
                    {txt.reanalyze}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
