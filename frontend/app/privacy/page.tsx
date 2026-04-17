import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Privacybeleid — VorzaIQ",
  description: "Hoe VorzaIQ omgaat met jouw persoonlijke gegevens.",
};

export default function PrivacyPage() {
  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh" }}>
      <PublicNav />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          Privacybeleid
        </h1>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 40 }}>
          Laatste update: 17 april 2026
        </p>

        <div className="privacy-card" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "32px", display: "flex", flexDirection: "column", gap: 32 }}>

          <Section title="1. Wie zijn wij?">
            VorzaIQ is een AI-gedreven recruitment platform van It&apos;s Peanuts AI, gevestigd in Nederland.
            Via ons platform koppelen wij werkzoekenden aan werkgevers op basis van slimme AI-matching.
            <br /><br />
            <strong>Contactgegevens:</strong><br />
            It&apos;s Peanuts AI<br />
            E-mail: <a href="mailto:privacy@vorzaiq.com" style={{ color: "#7C3AED" }}>privacy@vorzaiq.com</a>
          </Section>

          <Section title="2. Welke gegevens verzamelen wij?">
            Wij verwerken de volgende persoonsgegevens:
            <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Naam en e-mailadres (bij registratie)</Li>
              <Li>CV-inhoud die je zelf uploadt of invoert</Li>
              <Li>Sollicitatie-informatie (motivatiebrieven, antwoorden op intakevragen)</Li>
              <Li>AI-matchscores op basis van jouw CV en vacature-inhoud</Li>
              <Li>Technische gegevens: IP-adres, browsertype, paginabezoeken (via server logs)</Li>
            </ul>
          </Section>

          <Section title="3. Waarom verwerken wij jouw gegevens?">
            Wij gebruiken jouw gegevens voor:
            <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Het aanmaken en beheren van jouw account (grondslag: overeenkomst)</Li>
              <Li>AI-matching tussen jouw profiel en vacatures (grondslag: overeenkomst)</Li>
              <Li>Het doorsturen van jouw sollicitatie aan werkgevers (grondslag: overeenkomst)</Li>
              <Li>E-mailnotificaties over de voortgang van jouw sollicitatie (grondslag: gerechtvaardigd belang)</Li>
              <Li>Verbetering van ons platform (grondslag: gerechtvaardigd belang)</Li>
              <Li>Betaalverwerking voor werkgevers via Stripe (grondslag: overeenkomst)</Li>
            </ul>
          </Section>

          <Section title="4. Hoe lang bewaren wij jouw gegevens?">
            <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Accountgegevens: zolang je account actief is + 1 jaar na verwijdering</Li>
              <Li>CV-gegevens: zolang je account actief is</Li>
              <Li>Sollicitaties: 6 maanden na afronding van de procedure</Li>
              <Li>Server logs: maximaal 90 dagen</Li>
            </ul>
          </Section>

          <Section title="5. Delen wij jouw gegevens?">
            Wij verkopen jouw gegevens nooit aan derden. Wij delen gegevens uitsluitend met:
            <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li><strong>Werkgevers</strong> — alleen de gegevens die je expliciet instuurt via een sollicitatie</Li>
              <Li><strong>OpenAI</strong> — voor AI-functies zoals matchscores en CV-herschrijving (anoniem verwerkt waar mogelijk)</Li>
              <Li><strong>Resend</strong> — voor het verzenden van e-mailnotificaties</Li>
              <Li><strong>Stripe</strong> — voor betaalverwerking (alleen werkgeversdata)</Li>
              <Li><strong>Hetzner</strong> — serverhosting in Europa (GDPR-conform)</Li>
            </ul>
          </Section>

          <Section title="6. Jouw rechten">
            Als betrokkene heb je de volgende rechten onder de AVG (GDPR):
            <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li><strong>Inzage:</strong> je kunt opvragen welke gegevens wij van je hebben</Li>
              <Li><strong>Rectificatie:</strong> onjuiste gegevens laten corrigeren</Li>
              <Li><strong>Verwijdering:</strong> je account en gegevens laten verwijderen</Li>
              <Li><strong>Beperking:</strong> verwerking tijdelijk laten beperken</Li>
              <Li><strong>Bezwaar:</strong> bezwaar maken tegen verwerking op basis van gerechtvaardigd belang</Li>
              <Li><strong>Dataportabiliteit:</strong> jouw gegevens in een machine-leesbaar formaat opvragen</Li>
            </ul>
            <br />
            Stuur een verzoek naar{" "}
            <a href="mailto:privacy@vorzaiq.com" style={{ color: "#7C3AED" }}>privacy@vorzaiq.com</a>.
            Wij reageren binnen 30 dagen.
          </Section>

          <Section title="7. Beveiliging">
            Wij nemen passende technische en organisatorische maatregelen om jouw gegevens te beveiligen:
            <ul style={{ marginTop: 12, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>HTTPS-encryptie voor alle dataoverdracht</Li>
              <Li>Wachtwoorden worden gehashed opgeslagen (bcrypt)</Li>
              <Li>JWT-tokens met beperkte geldigheidsduur</Li>
              <Li>Serverhosting in beveiligde Europese datacenters</Li>
            </ul>
          </Section>

          <Section title="8. Cookies">
            VorzaIQ maakt geen gebruik van tracking cookies of advertentiecookies. Wij gebruiken
            uitsluitend functionele sessie-opslag (localStorage) om je ingelogd te houden.
          </Section>

          <Section title="9. Klachten">
            Heb je een klacht over hoe wij met jouw gegevens omgaan? Je kunt contact opnemen via{" "}
            <a href="mailto:privacy@vorzaiq.com" style={{ color: "#7C3AED" }}>privacy@vorzaiq.com</a>.
            Je hebt ook het recht een klacht in te dienen bij de{" "}
            <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" style={{ color: "#7C3AED" }}>
              Autoriteit Persoonsgegevens
            </a>.
          </Section>

          <Section title="10. Wijzigingen">
            Wij kunnen dit privacybeleid van tijd tot tijd aanpassen. De datum van de laatste
            update staat bovenaan deze pagina. Bij ingrijpende wijzigingen informeren wij
            geregistreerde gebruikers per e-mail.
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
