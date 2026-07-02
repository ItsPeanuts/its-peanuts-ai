"use client";

import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

const sections = [
  {
    title: "",
    content:
      "Bijlage 1 bij de Algemene Voorwaarden — versie juli 2026\n\nDeze verwerkersovereenkomst maakt integraal onderdeel uit van de Algemene Voorwaarden van VorzaIQ en wordt aangegaan tussen de werkgever die een account aanmaakt op vorzaiq.com (hierna: “Verwerkingsverantwoordelijke”) en VorzaIQ, KVK-nummer 78546338 (hierna: “Verwerker”), gezamenlijk de overeenkomst waarop deze bijlage van toepassing is aangeduid als de “Hoofdovereenkomst”.",
  },
  {
    title: "1. Onderwerp en duur",
    items: [
      "Verwerker verwerkt in opdracht van Verwerkingsverantwoordelijke persoonsgegevens van kandidaten in het kader van de recruitmentdiensten van het VorzaIQ-platform, zoals beschreven in de Hoofdovereenkomst.",
      "Deze verwerkersovereenkomst geldt zolang de Hoofdovereenkomst loopt en zolang Verwerker daarna nog persoonsgegevens onder zich heeft.",
    ],
  },
  {
    title: "2. Aard, doel en omvang van de verwerking",
    items: [
      "Doel: het werven en voorscreenen van kandidaten voor vacatures van Verwerkingsverantwoordelijke, waaronder CV-analyse, geautomatiseerde matching en het voeren van AI-screeningsgesprekken.",
      "Categorieën betrokkenen: kandidaten die solliciteren op vacatures van Verwerkingsverantwoordelijke of daarmee worden gematcht.",
      "Categorieën persoonsgegevens: naam, contactgegevens, CV-gegevens (werkervaring, opleiding, vaardigheden), antwoorden gegeven tijdens screeningsgesprekken, matchscores en gespreksverslagen.",
      "Verwerker verwerkt geen bijzondere categorieën persoonsgegevens in opdracht van Verwerkingsverantwoordelijke. Partijen ontmoedigen kandidaten actief om dergelijke gegevens te verstrekken; onbedoeld verstrekte bijzondere gegevens worden niet gebruikt in matching of beoordeling.",
    ],
  },
  {
    title: "3. Verplichtingen van Verwerker",
    items: [
      "Verwerker verwerkt de persoonsgegevens uitsluitend op basis van schriftelijke instructies van Verwerkingsverantwoordelijke. Het gebruik van het platform conform de Hoofdovereenkomst geldt als zodanige instructie. Verwerker informeert Verwerkingsverantwoordelijke onmiddellijk als een instructie naar zijn mening in strijd is met de AVG.",
      "Verwerker waarborgt dat personen die toegang hebben tot de persoonsgegevens zich hebben verbonden tot vertrouwelijkheid.",
      "Verwerker gebruikt de persoonsgegevens niet voor eigen doeleinden, verkoopt deze niet aan derden en gebruikt deze niet voor het trainen van AI-modellen.",
    ],
  },
  {
    title: "4. Beveiliging",
    items: [
      "Verwerker treft passende technische en organisatorische maatregelen conform artikel 32 AVG, waaronder: versleutelde verbindingen (TLS), versleutelde opslag, toegangsbeperking op basis van rollen, logging van toegang, en periodieke evaluatie van de beveiligingsmaatregelen.",
    ],
  },
  {
    title: "5. Subverwerkers",
    items: [
      "Verwerkingsverantwoordelijke geeft Verwerker algemene toestemming voor het inschakelen van subverwerkers. De actuele lijst van subverwerkers staat in Bijlage A.",
      "Verwerker legt aan subverwerkers dezelfde verplichtingen op als in deze verwerkersovereenkomst en blijft volledig aansprakelijk voor de nakoming daarvan door subverwerkers.",
      "Verwerker informeert Verwerkingsverantwoordelijke ten minste 30 dagen van tevoren over voorgenomen wijzigingen in de lijst van subverwerkers (via e-mail of het platform). Verwerkingsverantwoordelijke kan binnen die termijn schriftelijk bezwaar maken; als partijen geen oplossing vinden, kan Verwerkingsverantwoordelijke de Hoofdovereenkomst opzeggen tegen de datum waarop de wijziging ingaat.",
    ],
  },
  {
    title: "6. Doorgifte buiten de EER",
    items: [
      "Verwerking vindt plaats binnen de Europese Economische Ruimte, met uitzondering van de in Bijlage A vermelde subverwerkers buiten de EER. Doorgifte aan die subverwerkers vindt uitsluitend plaats op basis van passende waarborgen in de zin van hoofdstuk V AVG, zoals het EU-US Data Privacy Framework en/of de standaardcontractbepalingen van de Europese Commissie.",
    ],
  },
  {
    title: "7. Bijstand aan Verwerkingsverantwoordelijke",
    items: [
      "Verwerker verleent redelijke bijstand bij het beantwoorden van verzoeken van betrokkenen (inzage, rectificatie, verwijdering, bezwaar, dataportabiliteit, menselijke tussenkomst bij geautomatiseerde besluitvorming). Verzoeken die rechtstreeks bij Verwerker binnenkomen, worden onverwijld doorgestuurd aan Verwerkingsverantwoordelijke.",
      "Verwerker verleent redelijke bijstand bij gegevensbeschermingseffectbeoordelingen (DPIA’s) en voorafgaande raadpleging van de toezichthouder, voor zover deze betrekking hebben op de verwerking onder deze overeenkomst.",
    ],
  },
  {
    title: "8. Datalekken",
    items: [
      "Verwerker informeert Verwerkingsverantwoordelijke zonder onredelijke vertraging, en uiterlijk binnen 48 uur na ontdekking, over een inbreuk in verband met persoonsgegevens. De melding bevat ten minste: de aard van de inbreuk, de (vermoedelijke) categorieën en aantallen betrokkenen en gegevens, de waarschijnlijke gevolgen en de genomen of voorgestelde maatregelen.",
      "De beoordeling of een inbreuk gemeld moet worden aan de Autoriteit Persoonsgegevens en/of betrokkenen ligt bij Verwerkingsverantwoordelijke. Verwerker verleent daarbij redelijke medewerking.",
    ],
  },
  {
    title: "9. Audit en informatie",
    items: [
      "Verwerker stelt op verzoek alle informatie ter beschikking die redelijkerwijs nodig is om aan te tonen dat aan artikel 28 AVG wordt voldaan.",
      "Verwerkingsverantwoordelijke mag maximaal eenmaal per jaar, na schriftelijke aankondiging van ten minste 30 dagen, een audit (laten) uitvoeren, tijdens kantooruren en zonder onnodige verstoring van de bedrijfsvoering van Verwerker. Elke partij draagt de eigen kosten. Verwerker mag in plaats daarvan een recent onafhankelijk auditrapport of certificering overleggen als dat de gevraagde zekerheid biedt.",
    ],
  },
  {
    title: "10. Beëindiging en verwijdering",
    items: [
      "Na beëindiging van de Hoofdovereenkomst verwijdert Verwerker alle persoonsgegevens die onder deze overeenkomst zijn verwerkt binnen 30 dagen, tenzij Verwerkingsverantwoordelijke vóór die tijd schriftelijk om teruggave (export) verzoekt of een wettelijke bewaarplicht zich tegen verwijdering verzet. Back-ups worden binnen 90 dagen overschreven.",
      "Gegevens die kandidaten in hun eigen VorzaIQ-account bewaren, vallen buiten dit artikel; daarvoor is VorzaIQ zelfstandig verwerkingsverantwoordelijke conform haar privacybeleid.",
    ],
  },
  {
    title: "11. Aansprakelijkheid en rangorde",
    items: [
      "Op deze verwerkersovereenkomst is de aansprakelijkheidsregeling van de Hoofdovereenkomst van toepassing, behoudens voor zover dwingend recht (waaronder artikel 82 AVG) anders bepaalt.",
      "Bij strijdigheid tussen deze verwerkersovereenkomst en de Hoofdovereenkomst gaat deze verwerkersovereenkomst voor wat betreft de verwerking van persoonsgegevens.",
    ],
  },
  {
    title: "12. Toepasselijk recht",
    items: [
      "Op deze verwerkersovereenkomst is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter conform de Hoofdovereenkomst.",
    ],
  },
];

const subprocessors = [
  {
    name: "OpenAI",
    service: "AI-analyse van CV’s en screeningsgesprekken",
    location: "Verenigde Staten / EU",
    safeguard: "EU-US Data Privacy Framework en/of standaardcontractbepalingen; verwerkersovereenkomst met verbod op modeltraining",
  },
  {
    name: "Hetzner Online GmbH",
    service: "Hosting, opslag en database",
    location: "Neurenberg, Duitsland (EU)",
    safeguard: "Niet van toepassing (verwerking binnen EER)",
  },
  {
    name: "Cloudflare, Inc.",
    service: "Netwerkverkeer, CDN en beveiliging (proxy)",
    location: "Wereldwijd (EU-datacenters primair)",
    safeguard: "Standaardcontractbepalingen / EU-US Data Privacy Framework",
  },
  {
    name: "Resend, Inc.",
    service: "Verzending van e-mailnotificaties (o.a. sollicitatiebevestigingen)",
    location: "Ierland, EU (eu-west-1)",
    safeguard: "Niet van toepassing (verwerking binnen EER)",
  },
];

export default function VerwerkersovereenkomstPage() {
  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh" }}>
      <PublicNav />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          Verwerkersovereenkomst
        </h1>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 40 }}>
          Versie: juli 2026
        </p>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "32px", display: "flex", flexDirection: "column", gap: 32 }}>
          {sections.map((section, i) => (
            <div key={i}>
              {section.title && (
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 10 }}>
                  {section.title}
                </h2>
              )}
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                {section.content && section.content.split("\n").map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < section.content!.split("\n").length - 1 && <br />}
                  </span>
                ))}
                {section.items && (
                  <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                    {section.items.map((item, k) => (
                      <li key={k} style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}

          {/* Bijlage A */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 10 }}>
              Bijlage A — Subverwerkers
            </h2>
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700, color: "#111827" }}>Subverwerker</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700, color: "#111827" }}>Dienst</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700, color: "#111827" }}>Locatie</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700, color: "#111827" }}>Waarborg</th>
                  </tr>
                </thead>
                <tbody>
                  {subprocessors.map((sp, r) => (
                    <tr key={r} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 12px", color: "#374151", fontWeight: 600 }}>{sp.name}</td>
                      <td style={{ padding: "8px 12px", color: "#374151" }}>{sp.service}</td>
                      <td style={{ padding: "8px 12px", color: "#6b7280" }}>{sp.location}</td>
                      <td style={{ padding: "8px 12px", color: "#6b7280" }}>{sp.safeguard}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 12, lineHeight: 1.5 }}>
              Deze lijst wordt actueel gehouden op vorzaiq.com/verwerkersovereenkomst. Wijzigingen worden conform artikel 5.3 aangekondigd.
            </p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
