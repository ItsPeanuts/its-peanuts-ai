"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getIntegrationsStatus, IntegrationStatus, IntegrationsStatusResponse } from "@/lib/api";
import { clearSession, getToken, getRole } from "@/lib/session";

function StatusIcon({ ok, configured }: { ok: boolean; configured: boolean }) {
  if (!configured) return <span className="text-lg">⚙️</span>;
  if (ok) return <span className="text-lg">✅</span>;
  return <span className="text-lg">❌</span>;
}

function StatusBadge({ ok, configured }: { ok: boolean; configured: boolean }) {
  if (!configured)
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Niet ingesteld</span>;
  if (ok)
    return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">Verbonden</span>;
  return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">Fout</span>;
}

function IntegrationCard({ integration, onRetest }: { integration: IntegrationStatus; onRetest: () => void }) {
  const [showDetails, setShowDetails] = useState(false);
  const borderColor = !integration.configured ? "#e5e7eb" : integration.ok ? "#bbf7d0" : "#fecaca";
  const bgColor = !integration.configured ? "#f9fafb" : integration.ok ? "#f0fdf4" : "#fff5f5";

  return (
    <div
      className="rounded-2xl border-2 p-5 transition-all"
      style={{ borderColor, background: bgColor }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <StatusIcon ok={integration.ok} configured={integration.configured} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm mb-1">{integration.name}</div>
            <div className="text-xs text-gray-600 leading-relaxed">{integration.message}</div>
            {integration.details && (
              <div className="mt-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  {showDetails ? "Verberg details" : "Zie details"}
                </button>
                {showDetails && (
                  <div className="mt-2 text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-500 leading-relaxed whitespace-pre-wrap">
                    {integration.details}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge ok={integration.ok} configured={integration.configured} />
        </div>
      </div>
    </div>
  );
}

const SETUP_GUIDES: Record<string, { title: string; steps: string[]; link: string; linkLabel: string }> = {
  openai: {
    title: "OpenAI instellen (Lisa AI recruiter)",
    steps: [
      "Ga naar https://platform.openai.com/api-keys",
      "Klik op 'Create new secret key'",
      "Kopieer de sleutel",
      "Ga naar Render → Backend service → Environment",
      "Voeg toe: OPENAI_API_KEY = [jouw sleutel]",
      "Klik Save → backend herstart automatisch",
    ],
    link: "https://platform.openai.com/api-keys",
    linkLabel: "OpenAI API keys →",
  },
  microsoft_graph: {
    title: "Microsoft Graph instellen (Teams meetings + agenda)",
    steps: [
      "Ga naar https://portal.azure.com → Azure Active Directory → App registrations",
      "Klik 'New registration' → geef naam: 'VorzaIQ Lisa'",
      "Kopieer Application (client) ID → MS_CLIENT_ID",
      "Kopieer Directory (tenant) ID → MS_TENANT_ID",
      "Ga naar Certificates & secrets → New client secret → kopieer → MS_CLIENT_SECRET",
      "Ga naar API permissions → Add: Calendars.ReadWrite + OnlineMeetings.ReadWrite (Application)",
      "Klik 'Grant admin consent'",
      "Stel in Render ook in: MS_ORGANIZER_EMAIL = het e-mailadres voor meetings (bijv. lisa@jouwbedrijf.nl)",
    ],
    link: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    linkLabel: "Azure App registrations →",
  },
  teams_bot: {
    title: "Teams Bot instellen (Lisa virtueel in Teams)",
    steps: [
      "Ga naar https://dev.botframework.com → Create a bot",
      "Of via Azure Portal → Bot Services → Create",
      "Kopieer Microsoft App ID → TEAMS_BOT_APP_ID",
      "Genereer een wachtwoord → TEAMS_BOT_APP_PASSWORD",
      "Stel de Messaging Endpoint in: https://its-peanuts-backend.onrender.com/teams/webhook",
      "Voeg de bot toe aan Teams via het Teams App manifest",
    ],
    link: "https://dev.botframework.com",
    linkLabel: "Bot Framework →",
  },
  crm: {
    title: "HubSpot CRM instellen",
    steps: [
      "Ga naar https://app.hubspot.com/private-apps",
      "Klik 'Create a private app' → geef naam: 'VorzaIQ'",
      "Ga naar Scopes → voeg toe: crm.objects.contacts.write + crm.objects.deals.write + crm.objects.notes.write",
      "Klik 'Create app' → kopieer het token",
      "Stel in Render in: CRM_PROVIDER = hubspot",
      "Stel in Render in: CRM_API_KEY = [token]",
      "Optioneel: CRM_PORTAL_ID = jouw HubSpot account ID (voor directe contact-links)",
    ],
    link: "https://app.hubspot.com/private-apps",
    linkLabel: "HubSpot Private Apps →",
  },
  crm_pipedrive: {
    title: "Pipedrive CRM instellen",
    steps: [
      "Ga naar https://app.pipedrive.com/settings/api",
      "Kopieer jouw persoonlijke API token",
      "Stel in Render in: CRM_PROVIDER = pipedrive",
      "Stel in Render in: CRM_API_KEY = [api token]",
      "Optioneel: CRM_PORTAL_ID = jouw Pipedrive bedrijfsdomein (bijv. mijnbedrijf) voor directe contact-links",
      "Kandidaten worden automatisch als 'Person' aangemaakt, sollicitaties als 'Deal'",
    ],
    link: "https://app.pipedrive.com/settings/api",
    linkLabel: "Pipedrive API instellingen →",
  },
};

export default function IntegratiesPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [status, setStatus] = useState<IntegrationsStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [retesting, setRetesting] = useState(false);
  const [error, setError] = useState("");
  const [openGuide, setOpenGuide] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { router.replace("/employer/login"); return; }
    if (role && role !== "employer" && role !== "admin") { router.replace("/candidate"); return; }
    loadStatus();
  }, [token, role, router]);

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      const s = await getIntegrationsStatus(token!);
      setStatus(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Status ophalen mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function handleRetest() {
    setRetesting(true);
    await loadStatus();
    setRetesting(false);
  }

  const integrations = status
    ? [
        { key: "openai", data: status.openai },
        { key: "microsoft_graph", data: status.microsoft_graph },
        { key: "teams_bot", data: status.teams_bot },
        { key: "crm", data: status.crm },
      ]
    : [];

  const allOk = integrations.length > 0 && integrations.every((i) => i.data.ok);
  const okCount = integrations.filter((i) => i.data.ok).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <nav className="bg-white border-b border-gray-200 h-14 flex items-center px-6 gap-4">
        <Link href="/employer" className="flex items-center gap-2 no-underline">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: "#0DA89E" }}>V</div>
          <span className="font-bold text-gray-900 text-sm">VorzaIQ</span>
        </Link>
        <span className="text-gray-300 text-lg">/</span>
        <span className="text-sm font-medium text-gray-600">Integraties</span>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/employer" className="text-sm text-gray-500 hover:text-gray-700 no-underline">
            ← Terug naar dashboard
          </Link>
          <button
            onClick={() => { clearSession(); router.push("/"); }}
            className="text-sm text-red-500 hover:text-red-600"
          >
            Uitloggen
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Integraties & Credentials</h1>
            <p className="text-gray-500 text-sm">
              Beheer de koppelingen met OpenAI, Microsoft Teams en je CRM systeem.
              Klik op een integratie voor de stap-voor-stap setup instructies.
            </p>
          </div>
          <button
            onClick={handleRetest}
            disabled={loading || retesting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            {retesting ? "Testen..." : "↺ Hertest alles"}
          </button>
        </div>

        {/* Score banner */}
        {!loading && status && (
          <div
            className="rounded-2xl px-6 py-4 mb-6 flex items-center justify-between"
            style={{
              background: allOk ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" : "linear-gradient(135deg, #f8fafc, #f1f5f9)",
              border: allOk ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
            }}
          >
            <div>
              <div className="font-bold text-gray-900">{okCount} van {integrations.length} integraties actief</div>
              <div className="text-sm text-gray-500 mt-0.5">
                {allOk
                  ? "Alle systemen zijn verbonden en operationeel."
                  : "Voltooi de setup voor alle functies."}
              </div>
            </div>
            <div
              className="text-3xl font-black"
              style={{ color: allOk ? "#059669" : okCount > 0 ? "#d97706" : "#9ca3af" }}
            >
              {okCount}/{integrations.length}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-6">{error}</div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map(({ key, data }) => (
              <div key={key}>
                <IntegrationCard integration={data} onRetest={handleRetest} />

                {/* Setup gids — uitklapbaar */}
                {!data.ok && (() => {
                  const guideKeys = key === "crm"
                    ? ["crm", "crm_pipedrive"]
                    : [key];
                  return guideKeys.filter((k) => SETUP_GUIDES[k]).map((guideKey) => (
                    <div key={guideKey} className="ml-4 mt-1">
                      <button
                        onClick={() => setOpenGuide(openGuide === guideKey ? null : guideKey)}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                      >
                        {openGuide === guideKey ? "▴" : "▾"} {SETUP_GUIDES[guideKey].title}
                      </button>

                      {openGuide === guideKey && (
                        <div className="mt-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                          <ol className="space-y-2 mb-4">
                            {SETUP_GUIDES[guideKey].steps.map((step, idx) => (
                              <li key={idx} className="flex gap-3 text-sm text-gray-700">
                                <span
                                  className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                                  style={{ background: "#0DA89E" }}
                                >
                                  {idx + 1}
                                </span>
                                <span className="leading-relaxed">{step}</span>
                              </li>
                            ))}
                          </ol>
                          <a
                            href={SETUP_GUIDES[guideKey].link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white no-underline hover:opacity-90 transition"
                            style={{ background: "#0DA89E" }}
                          >
                            {SETUP_GUIDES[guideKey].linkLabel}
                          </a>
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            ))}
          </div>
        )}

        {/* Render instructie */}
        <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-6">
          <h2 className="font-bold text-gray-900 mb-3">Credentials instellen in Render</h2>
          <p className="text-sm text-gray-500 mb-4">
            Alle API sleutels worden als omgevingsvariabelen ingesteld in het Render dashboard.
            Ze worden nooit opgeslagen in de code.
          </p>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ background: "#0DA89E" }}>1</span>
              <span>Ga naar <strong>render.com/dashboard</strong> → selecteer <strong>its-peanuts-backend</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ background: "#0DA89E" }}>2</span>
              <span>Klik op <strong>Environment</strong> in het linkermenu</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ background: "#0DA89E" }}>3</span>
              <span>Voeg de variabele toe via <strong>Add Environment Variable</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ background: "#0DA89E" }}>4</span>
              <span>Klik <strong>Save Changes</strong> — de backend herstart automatisch</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white" style={{ background: "#0DA89E" }}>5</span>
              <span>Kom terug naar deze pagina en klik <strong>↺ Hertest alles</strong> om te verifiëren</span>
            </li>
          </ol>
          <a
            href="https://render.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white no-underline hover:opacity-90 transition"
            style={{ background: "#6366f1" }}
          >
            Ga naar Render dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
