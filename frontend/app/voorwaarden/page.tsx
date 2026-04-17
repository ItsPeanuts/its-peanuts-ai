import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Algemene Voorwaarden — VorzaIQ",
  description: "Algemene voorwaarden voor het gebruik van VorzaIQ.",
};

export default function VoorwaardenPage() {
  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh" }}>
      <PublicNav />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          Algemene Voorwaarden
        </h1>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 40 }}>
          Laatste update: 17 april 2026
        </p>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "32px", display: "flex", flexDirection: "column", gap: 32 }}>

          <Section title="1. Definities">
            <strong>VorzaIQ</strong> — het AI-gedreven recruitment platform van It&apos;s Peanuts AI, gevestigd in Nederland, bereikbaar via{" "}
            <a href="https://vorzaiq.com" style={{ color: "#7C3AED" }}>vorzaiq.com</a>.<br /><br />
            <strong>Werkgever</strong> — een gebruiker die vacatures plaatst en sollicitanten beheert via het platform.<br />
            <strong>Kandidaat</strong> — een gebruiker die solliciteert op vacatures via het platform.<br />
            <strong>Diensten</strong> — alle functionaliteiten van VorzaIQ, inclusief vacatureplaatsing, AI-matching, pre-screening, chatbot Lisa en CV-tools.
          </Section>

          <Section title="2. Toepasselijkheid">
            Deze algemene voorwaarden zijn van toepassing op elk gebruik van het VorzaIQ platform,
            inclusief het aanmaken van een account, het plaatsen van vacatures, het indienen van
            sollicitaties en het gebruik van AI-functionaliteiten. Door gebruik te maken van VorzaIQ
            ga je akkoord met deze voorwaarden.
          </Section>

          <Section title="3. Account en registratie">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Je bent verantwoordelijk voor het vertrouwelijk houden van je inloggegevens.</Li>
              <Li>Alle activiteiten onder jouw account zijn jouw verantwoordelijkheid.</Li>
              <Li>Je verstrekt correcte en actuele informatie bij registratie.</Li>
              <Li>VorzaIQ behoudt het recht accounts te blokkeren of verwijderen bij misbruik.</Li>
            </ul>
          </Section>

          <Section title="4. Dienstverlening">
            VorzaIQ biedt een AI-gedreven platform voor het matchen van kandidaten aan vacatures.
            Onze diensten omvatten:
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Vacatureplaatsing en -beheer voor werkgevers</Li>
              <Li>AI-matching en pre-screening van sollicitanten</Li>
              <Li>CV-upload, AI-herschrijving en motivatiebriefgenerator</Li>
              <Li>Virtuele recruiter Lisa (chatbot)</Li>
              <Li>Interview scheduling en kandidaatenbeheer</Li>
            </ul>
            <br />
            VorzaIQ garandeert niet dat AI-resultaten (matchscores, herschrijvingen) foutloos zijn.
            AI-uitkomsten zijn ondersteunend en vervangen geen menselijk oordeel.
          </Section>

          <Section title="5. Abonnementen en betalingen">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Werkgevers kunnen kiezen uit verschillende abonnementen (Growth, Scale) of per vacature betalen.</Li>
              <Li>Nieuwe werkgevers ontvangen een gratis proefmaand op het Growth-pakket.</Li>
              <Li>Betalingen worden verwerkt via Stripe. Prijzen zijn exclusief BTW tenzij anders vermeld.</Li>
              <Li>Abonnementen worden automatisch verlengd tenzij je opzegt voor het einde van de lopende periode.</Li>
              <Li>Opzeggen kan op elk moment via je accountinstellingen. Na opzegging blijft je account actief tot het einde van de betaalde periode.</Li>
              <Li>Restitutie is niet mogelijk voor reeds betaalde periodes, tenzij wettelijk verplicht.</Li>
            </ul>
          </Section>

          <Section title="6. Gebruik door kandidaten">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Het gebruik van VorzaIQ is gratis voor kandidaten.</Li>
              <Li>Geüploade CV&apos;s en sollicitaties worden gedeeld met de werkgever van de betreffende vacature.</Li>
              <Li>AI-tools (CV-herschrijving, motivatiebrief) zijn hulpmiddelen — controleer de output altijd zelf.</Li>
              <Li>Je kunt je account en alle gegevens op elk moment verwijderen.</Li>
            </ul>
          </Section>

          <Section title="7. Intellectueel eigendom">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Het VorzaIQ platform, inclusief design, code en AI-modellen, is eigendom van It&apos;s Peanuts AI.</Li>
              <Li>Content die jij uploadt (CV&apos;s, vacatureteksten) blijft jouw eigendom.</Li>
              <Li>Door content te uploaden geef je VorzaIQ een licentie om deze te verwerken voor het leveren van de diensten.</Li>
            </ul>
          </Section>

          <Section title="8. Aansprakelijkheid">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>VorzaIQ streeft naar maximale beschikbaarheid maar garandeert geen 100% uptime.</Li>
              <Li>Wij zijn niet aansprakelijk voor beslissingen die worden genomen op basis van AI-resultaten.</Li>
              <Li>Onze totale aansprakelijkheid is beperkt tot het bedrag dat je in de afgelopen 12 maanden aan VorzaIQ hebt betaald.</Li>
              <Li>VorzaIQ is niet aansprakelijk voor indirecte schade, gevolgschade of gederfde winst.</Li>
            </ul>
          </Section>

          <Section title="9. Privacy">
            Wij verwerken persoonsgegevens conform de AVG (GDPR). Zie ons{" "}
            <a href="/privacy" style={{ color: "#7C3AED" }}>privacybeleid</a> voor volledige informatie
            over hoe wij omgaan met jouw gegevens.
          </Section>

          <Section title="10. Beëindiging">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Je kunt je account op elk moment verwijderen via je profielinstellingen.</Li>
              <Li>VorzaIQ kan je account opschorten of beëindigen bij overtreding van deze voorwaarden.</Li>
              <Li>Bij beëindiging worden je gegevens verwijderd conform ons privacybeleid.</Li>
            </ul>
          </Section>

          <Section title="11. Wijzigingen">
            VorzaIQ kan deze voorwaarden wijzigen. Bij ingrijpende wijzigingen informeren wij
            geregistreerde gebruikers per e-mail. Voortgezet gebruik na wijziging geldt als
            acceptatie van de nieuwe voorwaarden.
          </Section>

          <Section title="12. Toepasselijk recht">
            Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd
            aan de bevoegde rechter in Nederland.
          </Section>

          <Section title="13. Contact">
            Vragen over deze voorwaarden? Neem contact op via{" "}
            <a href="mailto:info@vorzaiq.com" style={{ color: "#7C3AED" }}>info@vorzaiq.com</a>.
          </Section>

        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 10 }}>
        {title}
      </h2>
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
        {children}
      </p>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
      {children}
    </li>
  );
}
