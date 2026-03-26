"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getToken, getRole } from "@/lib/session";
import { createCheckoutSession } from "@/lib/api";
import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const PLANS = [
  {
    id: "starter",
    planKey: null as string | null,  // Geen LS variant — gratis proefperiode
    name: "Starter",
    priceMonth: 49,
    priceYear: 490,
    color: "#2563eb",
    bg: "#fff",
    border: "#bfdbfe",
    badge: null as string | null,
    highlight: false,
    features: [
      { text: "1 actieve vacature", ok: true },
      { text: "AI-matching & pre-screening", ok: true },
      { text: "Kandidaatoverzicht dashboard", ok: true },
      { text: "Chatbot Lisa (kandidaten)", ok: true },
      { text: "E-mail notificaties", ok: true },
      { text: "Prioriteit in zoekresultaten", ok: false },
      { text: "Meerdere vacatures", ok: false },
      { text: "Virtuele Lisa video-interview", ok: false },
      { text: "Geavanceerde analytics", ok: false },
      { text: "Dedicated support", ok: false },
    ],
    cta: "1 vacature gratis proberen",
    ctaHref: "/employer/login",
  },
  {
    id: "growth",
    planKey: "normaal",
    name: "Growth",
    priceMonth: 149,
    priceYear: 1490,
    color: "#7C3AED",
    bg: "linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)",
    border: "#7C3AED",
    badge: "Meest populair",
    highlight: true,
    features: [
      { text: "5 actieve vacatures", ok: true },
      { text: "AI-matching & pre-screening", ok: true },
      { text: "Kandidaatoverzicht dashboard", ok: true },
      { text: "Chatbot Lisa (kandidaten)", ok: true },
      { text: "E-mail notificaties", ok: true },
      { text: "Prioriteit in zoekresultaten", ok: true },
      { text: "CRM integratie", ok: true },
      { text: "Virtuele Lisa video-interview", ok: false },
      { text: "Geavanceerde analytics", ok: false },
      { text: "Dedicated support", ok: false },
    ],
    cta: "Nu starten →",
    ctaHref: "/employer/login",
  },
  {
    id: "scale",
    planKey: "premium",
    name: "Scale",
    priceMonth: 349,
    priceYear: 3490,
    color: "#111827",
    bg: "#111827",
    border: "#111827",
    badge: null as string | null,
    highlight: false,
    features: [
      { text: "Onbeperkte vacatures", ok: true },
      { text: "AI-matching & pre-screening", ok: true },
      { text: "Kandidaatoverzicht dashboard", ok: true },
      { text: "Chatbot Lisa (kandidaten)", ok: true },
      { text: "E-mail notificaties", ok: true },
      { text: "Prioriteit in zoekresultaten", ok: true },
      { text: "CRM integratie", ok: true },
      { text: "Virtuele Lisa video-interview", ok: true },
      { text: "Geavanceerde analytics", ok: true },
      { text: "Dedicated support", ok: true },
    ],
    cta: "Nu starten →",
    ctaHref: "/employer/login",
  },
];

const COMPARE_ROWS = [
  {
    label: "Indeed gesponsord",
    cost: "€200 – €400",
    unit: "per vacature",
    ai: false,
    color: "#6b7280",
  },
  {
    label: "LinkedIn Jobs",
    cost: "€210 – €300",
    unit: "per maand (1 vacature)",
    ai: false,
    color: "#0A66C2",
  },
  {
    label: "VorzaIQ Starter",
    cost: "€49",
    unit: "per maand incl. AI-matching",
    ai: true,
    color: "#7C3AED",
    highlight: true,
  },
];

const FAQS = [
  {
    q: "Kan ik op elk moment opzeggen?",
    a: "Ja, je kunt maandelijks opzeggen. Je start met 1 vacature gratis voor 30 dagen — daarna kies je een betaald plan.",
  },
  {
    q: "Wat is AI-matching precies?",
    a: "VorzaIQ analyseert automatisch het CV van elke sollicitant en geeft een matchscore (0–100) op basis van de vacaturetekst. Je ziet direct wie het beste past.",
  },
  {
    q: "Welke betaalmethoden accepteren jullie?",
    a: "We accepteren iDEAL, creditcard en SEPA incasso via LemonSqueezy. Alle betalingen zijn beveiligd.",
  },
  {
    q: "Wat als ik meer vacatures nodig heb dan mijn plan?",
    a: "Je kunt losse vacatures bijkopen voor €89 per stuk (30 dagen actief, inclusief AI-matching), of upgraden naar een hoger plan.",
  },
];

function AbonnementenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [billing, setBilling] = useState<"month" | "year">("month");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  const success = searchParams?.get("success") === "1";

  async function handleSubscribe(plan: typeof PLANS[0]) {
    // Starter: geen LS variant, stuur naar registratie/login
    if (!plan.planKey) {
      router.push(token ? "/employer" : plan.ctaHref);
      return;
    }
    if (!token) {
      router.push(plan.ctaHref);
      return;
    }
    setLoadingPlan(plan.id);
    setError("");
    try {
      const { checkout_url } = await createCheckoutSession(token, plan.planKey, billing);
      window.location.href = checkout_url;
    } catch (e: unknown) {
      setError((e as Error)?.message || "Kon betaling niet starten");
      setLoadingPlan(null);
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <PublicNav />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 80px" }}>

        {/* Succes banner */}
        {success && (
          <div style={{ background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 12, padding: "16px 20px", marginBottom: 40, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>✓</span>
            <div>
              <div style={{ fontWeight: 700, color: "#065f46" }}>Abonnement geactiveerd!</div>
              <div style={{ fontSize: 14, color: "#047857" }}>Je plan is bijgewerkt. Alle features zijn nu beschikbaar.</div>
            </div>
          </div>
        )}

        {/* Trial banner */}
        <div style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)", borderRadius: 16, padding: "20px 28px", marginBottom: 52, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ color: "#fff" }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Probeer gratis — 1 vacature, 30 dagen</div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>Start vandaag en ontdek hoe AI jouw werving versnelt. Geen creditcard nodig.</div>
          </div>
          <Link
            href="/employer/login"
            style={{ background: "#fff", color: "#7C3AED", fontWeight: 700, fontSize: 14, padding: "11px 24px", borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Gratis starten →
          </Link>
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
            Transparante prijzen
          </p>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: "#111827", margin: "0 0 14px", lineHeight: 1.1 }}>
            Kies het plan dat bij je past
          </h1>
          <p style={{ fontSize: 17, color: "#6b7280", margin: "0 auto 32px", maxWidth: 520, lineHeight: 1.6 }}>
            Van één vacature tot onbeperkt werven — altijd inclusief AI-matching.
          </p>

          {/* Billing toggle */}
          <div style={{ display: "inline-flex", background: "#f3f4f6", borderRadius: 10, padding: 4, gap: 4 }}>
            {(["month", "year"] as const).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 600,
                  background: billing === b ? "#fff" : "transparent",
                  color: billing === b ? "#111827" : "#6b7280",
                  boxShadow: billing === b ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {b === "month" ? "Maandelijks" : (
                  <>Jaarlijks <span style={{ background: "#d1fae5", color: "#065f46", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, marginLeft: 4 }}>−16%</span></>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 10, padding: "12px 16px", marginBottom: 24, textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Plan kaarten */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 60 }}>
          {PLANS.map(plan => {
            const price = billing === "month" ? plan.priceMonth : plan.priceYear;
            const isLoading = loadingPlan === plan.id;
            const isDark = plan.id === "scale";

            return (
              <div
                key={plan.id}
                id={plan.id}
                style={{
                  background: plan.bg,
                  border: `2px solid ${plan.border}`,
                  borderRadius: 20,
                  padding: "32px 28px",
                  position: "relative",
                  boxShadow: plan.highlight ? "0 8px 32px rgba(124,58,237,0.18)" : "0 2px 8px rgba(0,0,0,0.06)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {plan.badge && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                    color: "#fff", padding: "4px 16px", borderRadius: 20,
                    fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                  }}>
                    {plan.badge}
                  </div>
                )}

                <div style={{ fontWeight: 800, fontSize: 20, color: isDark ? "#fff" : plan.color, marginBottom: 6 }}>
                  {plan.name}
                </div>

                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 44, fontWeight: 900, color: isDark ? "#fff" : "#111827", lineHeight: 1 }}>
                    €{price.toLocaleString("nl-NL")}
                  </span>
                  <span style={{ fontSize: 15, color: isDark ? "rgba(255,255,255,0.6)" : "#6b7280", marginLeft: 4 }}>
                    /{billing === "month" ? "mnd" : "jaar"}
                  </span>
                </div>
                {billing === "year" && (
                  <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.5)" : "#9ca3af", marginBottom: 4 }}>
                    ≈ €{Math.round(price / 12)}/mnd bij jaarlijkse betaling
                  </div>
                )}

                <div style={{ height: 1, background: isDark ? "rgba(255,255,255,0.12)" : plan.border, margin: "20px 0" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 28, flex: 1 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                        background: f.ok ? (plan.highlight ? "#ede9fe" : isDark ? "rgba(255,255,255,0.1)" : "#dbeafe") : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700,
                        color: f.ok ? (isDark ? "#fff" : plan.color) : isDark ? "rgba(255,255,255,0.25)" : "#d1d5db",
                        border: f.ok ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "#e5e7eb"}`,
                      }}>
                        {f.ok ? "✓" : "−"}
                      </div>
                      <span style={{ fontSize: 13, color: f.ok ? (isDark ? "#fff" : "#374151") : isDark ? "rgba(255,255,255,0.35)" : "#9ca3af" }}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isLoading}
                  style={{
                    width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                    fontSize: 14, fontWeight: 700, cursor: isLoading ? "not-allowed" : "pointer",
                    opacity: isLoading ? 0.7 : 1,
                    transition: "opacity 0.15s",
                    ...(plan.highlight
                      ? { background: "linear-gradient(135deg, #7C3AED, #6D28D9)", color: "#fff" }
                      : isDark
                      ? { background: "#fff", color: "#111827" }
                      : { background: "#f3f4f6", color: "#374151" }),
                  }}
                >
                  {isLoading ? "Bezig..." : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Pay-per-vacature */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "28px 32px", marginBottom: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
              Pay-per-vacature
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#111827", marginBottom: 4 }}>
              €89 <span style={{ fontSize: 15, fontWeight: 500, color: "#6b7280" }}>per vacature</span>
            </div>
            <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
              30 dagen actief · inclusief AI-matching · geen abonnement nodig
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["AI pre-screening", "Kandidaatdashboard", "E-mail notificaties", "30 dagen zichtbaar"].map(f => (
              <span key={f} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 100, background: "#f5f3ff", color: "#6D28D9", fontWeight: 500 }}>
                {f}
              </span>
            ))}
          </div>
          <Link
            href={token ? "/employer" : "/employer/login"}
            style={{ background: "#7C3AED", color: "#fff", fontWeight: 700, fontSize: 14, padding: "11px 24px", borderRadius: 10, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Vacature plaatsen →
          </Link>
        </div>

        {/* Vergelijking */}
        <div style={{ marginBottom: 64 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
              Waarom VorzaIQ?
            </h2>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#7C3AED", fontStyle: "italic" }}>
              "Bij Indeed betaal je voor klikken. Bij VorzaIQ betaal je voor matches."
            </p>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 200px 100px", padding: "12px 24px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>Platform</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>Kosten</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>Eenheid</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>AI-matching</div>
            </div>

            {COMPARE_ROWS.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 140px 200px 100px",
                  padding: "16px 24px",
                  borderBottom: i < COMPARE_ROWS.length - 1 ? "1px solid #f3f4f6" : "none",
                  background: row.highlight ? "#f5f3ff" : "#fff",
                }}
              >
                <div style={{ fontWeight: 700, color: row.highlight ? "#7C3AED" : "#374151", fontSize: 14 }}>
                  {row.label}
                  {row.highlight && <span style={{ marginLeft: 8, fontSize: 11, background: "#ede9fe", color: "#7C3AED", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>Jij</span>}
                </div>
                <div style={{ fontWeight: 800, color: row.highlight ? "#7C3AED" : "#111827", fontSize: 15 }}>{row.cost}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{row.unit}</div>
                <div style={{ fontSize: 18 }}>{row.ai ? "✅" : "❌"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#111827", textAlign: "center", marginBottom: 32 }}>
            Veelgestelde vragen
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 860, margin: "0 auto" }}>
            {FAQS.map((item, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e5e7eb" }}>
                <div style={{ fontWeight: 700, color: "#111827", marginBottom: 8, fontSize: 14 }}>{item.q}</div>
                <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
          Vragen over een abonnement?{" "}
          <a href="mailto:sales@vorzaiq.nl" style={{ color: "#7C3AED", textDecoration: "none", fontWeight: 600 }}>
            Neem contact op
          </a>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

export default function AbonnementenPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ color: "#6b7280", fontSize: 14 }}>Laden...</div>
      </div>
    }>
      <AbonnementenContent />
    </Suspense>
  );
}
