"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getToken, getRole } from "@/lib/session";
import { createCheckoutSession } from "@/lib/api";

const PLANS = [
  {
    id: "gratis",
    name: "Gratis",
    priceMonth: 0,
    priceYear: 0,
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
    badge: null,
    features: [
      { text: "1 vacature per jaar", ok: true },
      { text: "2× chatbot Lisa", ok: true },
      { text: "AI pre-screening", ok: true },
      { text: "Kandidaten dashboard", ok: true },
      { text: "Onbeperkt chatbot Lisa", ok: false },
      { text: "10+ vacatures", ok: false },
      { text: "Teams interview planning", ok: false },
      { text: "Virtuele Lisa (avatar)", ok: false },
    ],
    cta: "Gratis starten",
    ctaStyle: "outline" as const,
  },
  {
    id: "normaal",
    name: "Normaal",
    priceMonth: 250,
    priceYear: 3000,
    color: "#0A66C2",
    bg: "#eff6ff",
    border: "#bfdbfe",
    badge: null,
    features: [
      { text: "10 vacatures per jaar", ok: true },
      { text: "Onbeperkt chatbot Lisa", ok: true },
      { text: "AI pre-screening", ok: true },
      { text: "Kandidaten dashboard", ok: true },
      { text: "Teams interview planning", ok: true },
      { text: "CRM integratie", ok: true },
      { text: "E-mail notificaties", ok: true },
      { text: "Virtuele Lisa (avatar)", ok: false },
    ],
    cta: "Abonneren",
    ctaStyle: "primary" as const,
  },
  {
    id: "premium",
    name: "Premium",
    priceMonth: 1000,
    priceYear: 12000,
    color: "#7c3aed",
    bg: "linear-gradient(135deg, #faf5ff, #ede9fe)",
    border: "#c4b5fd",
    badge: "Meest populair",
    features: [
      { text: "Onbeperkt vacatures", ok: true },
      { text: "Onbeperkt chatbot Lisa", ok: true },
      { text: "AI pre-screening", ok: true },
      { text: "Kandidaten dashboard", ok: true },
      { text: "Teams interview planning", ok: true },
      { text: "CRM integratie", ok: true },
      { text: "E-mail notificaties", ok: true },
      { text: "Virtuele Lisa (AI avatar interview)", ok: true },
    ],
    cta: "Abonneren",
    ctaStyle: "premium" as const,
  },
];

function AbonnementenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => getToken(), []);
  const role = useMemo(() => getRole(), []);

  const [billing, setBilling] = useState<"month" | "year">("month");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const success = searchParams?.get("success") === "1";

  async function handleSubscribe(planId: string) {
    if (planId === "gratis") {
      router.push(role === "employer" ? "/employer" : "/werkgever/registreer");
      return;
    }
    if (!token) {
      router.push("/werkgever/login");
      return;
    }
    setLoading(planId);
    setError("");
    try {
      const { checkout_url } = await createCheckoutSession(token, planId, billing);
      window.location.href = checkout_url;
    } catch (e: unknown) {
      setError((e as Error)?.message || "Kon betaling niet starten");
      setLoading(null);
    }
  }

  const savingPercent = Math.round((1 - (PLANS[2].priceYear / 12) / PLANS[2].priceMonth) * 100);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 60,
      }}>
        <a href="/" style={{ fontWeight: 800, fontSize: 20, color: "#0A66C2", textDecoration: "none" }}>
          ItsPeanuts AI
        </a>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {role === "employer" && (
            <a href="/employer" style={{ fontSize: 14, color: "#374151", textDecoration: "none", fontWeight: 500 }}>
              Dashboard
            </a>
          )}
          {!token && (
            <a href="/werkgever/login" style={{
              fontSize: 14, fontWeight: 600, color: "#fff",
              background: "#0A66C2", padding: "8px 16px", borderRadius: 8, textDecoration: "none",
            }}>
              Inloggen
            </a>
          )}
        </div>
      </nav>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        {/* Succes melding */}
        {success && (
          <div style={{
            background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 12,
            padding: "16px 20px", marginBottom: 32, display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ fontSize: 24 }}>✓</span>
            <div>
              <div style={{ fontWeight: 700, color: "#065f46" }}>Abonnement geactiveerd!</div>
              <div style={{ fontSize: 14, color: "#047857" }}>
                Je plan is bijgewerkt. Je kunt nu alle features van je abonnement gebruiken.
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-block", background: "#eff6ff", color: "#0A66C2",
            padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, marginBottom: 16,
          }}>
            Transparante prijzen
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, color: "#111827", margin: "0 0 12px", lineHeight: 1.1 }}>
            Kies het plan dat bij je past
          </h1>
          <p style={{ fontSize: 18, color: "#6b7280", margin: 0 }}>
            Van gratis starten tot volledig AI-gestuurde werving — voor elk budget een passend pakket.
          </p>

          {/* Billing toggle */}
          <div style={{
            display: "inline-flex", background: "#f3f4f6", borderRadius: 10,
            padding: 4, marginTop: 28, gap: 4,
          }}>
            {(["month", "year"] as const).map((b) => (
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
                  <span>
                    Jaarlijks{" "}
                    <span style={{
                      background: "#d1fae5", color: "#065f46",
                      fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 20, marginLeft: 4,
                    }}>
                      Bespaar {savingPercent}%
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{
            background: "#fee2e2", color: "#dc2626", borderRadius: 10,
            padding: "12px 16px", marginBottom: 24, textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {/* Plan kaarten */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {PLANS.map((plan) => {
            const price = billing === "month" ? plan.priceMonth : plan.priceYear;
            const monthlyEquiv = billing === "year" && plan.priceYear > 0
              ? Math.round(plan.priceYear / 12)
              : null;
            const isLoading = loading === plan.id;

            return (
              <div
                key={plan.id}
                id={plan.id}
                style={{
                  background: plan.bg,
                  border: `2px solid ${plan.id === "premium" ? "#7c3aed" : plan.border}`,
                  borderRadius: 20,
                  padding: "32px 28px",
                  position: "relative",
                  boxShadow: plan.id === "premium" ? "0 8px 32px rgba(124,58,237,0.15)" : "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    color: "#fff", padding: "4px 16px", borderRadius: 20,
                    fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                  }}>
                    {plan.badge}
                  </div>
                )}

                {/* Plan naam */}
                <div style={{ fontWeight: 800, fontSize: 20, color: plan.color, marginBottom: 8 }}>
                  {plan.name}
                </div>

                {/* Prijs */}
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: "#111827", lineHeight: 1 }}>
                    {price === 0 ? "Gratis" : `€${price.toLocaleString("nl-NL")}`}
                  </span>
                  {price > 0 && (
                    <span style={{ fontSize: 16, color: "#6b7280", marginLeft: 4 }}>
                      /{billing === "month" ? "mnd" : "jaar"}
                    </span>
                  )}
                </div>
                {monthlyEquiv && (
                  <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                    ≈ €{monthlyEquiv}/mnd bij jaarlijkse betaling
                  </div>
                )}

                <div style={{ height: 1, background: plan.border, margin: "20px 0" }} />

                {/* Features */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        background: f.ok ? (plan.id === "premium" ? "#ede9fe" : "#dbeafe") : "#f3f4f6",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700,
                        color: f.ok ? plan.color : "#9ca3af",
                      }}>
                        {f.ok ? "✓" : "✕"}
                      </div>
                      <span style={{
                        fontSize: 14, color: f.ok ? "#374151" : "#9ca3af",
                        textDecoration: f.ok ? "none" : "line-through",
                      }}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA knop */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isLoading}
                  style={{
                    width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                    fontSize: 15, fontWeight: 700, cursor: isLoading ? "not-allowed" : "pointer",
                    opacity: isLoading ? 0.7 : 1,
                    ...(plan.ctaStyle === "premium"
                      ? { background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff" }
                      : plan.ctaStyle === "primary"
                      ? { background: "#0A66C2", color: "#fff" }
                      : { background: "#fff", color: "#374151", border: "1.5px solid #d1d5db" }),
                  }}
                >
                  {isLoading ? "Bezig..." : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ / extra info */}
        <div style={{ marginTop: 64, textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
            Veelgestelde vragen
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 800, margin: "32px auto 0", textAlign: "left" }}>
            {[
              { q: "Kan ik tussentijds upgraden?", a: "Ja, je kunt op elk moment upgraden. Je betaalt pro-rato voor de rest van de maand." },
              { q: "Hoe werkt de Virtuele Lisa?", a: "Virtuele Lisa is een realistische AI avatar die video interviews afneemt. Kandidaten zien een pratende avatar en antwoorden via de microfoon." },
              { q: "Welke betaalmethoden accepteer je?", a: "We accepteren creditcard en iDEAL via Stripe. Alle betalingen zijn beveiligd." },
              { q: "Wat gebeurt er na mijn gratis plan?", a: "Je account blijft actief. Je kunt je bestaande vacature blijven zien, maar geen nieuwe aanmaken totdat je upgradet." },
            ].map((item, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ fontWeight: 700, color: "#111827", marginBottom: 8, fontSize: 15 }}>{item.q}</div>
                <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>{item.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{ textAlign: "center", marginTop: 48, color: "#9ca3af", fontSize: 14 }}>
          Vragen over een abonnement?{" "}
          <a href="mailto:info@itspeanuts.ai" style={{ color: "#0A66C2", textDecoration: "none", fontWeight: 600 }}>
            Neem contact op
          </a>
        </div>
      </main>
    </div>
  );
}

export default function AbonnementenPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}><div style={{ color: "#6b7280" }}>Laden...</div></div>}>
      <AbonnementenContent />
    </Suspense>
  );
}
