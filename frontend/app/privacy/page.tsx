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
          Laatst bijgewerkt: juli 2026
        </p>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "32px", display: "flex", flexDirection: "column", gap: 32 }}>

          <Section title="1. Wie zijn wij">
            VorzaIQ is een AI-gedreven recruitmentplatform dat werkgevers en kandidaten met elkaar verbindt.
            <br /><br />
            <strong>Verwerkingsverantwoordelijke:</strong><br />
            VorzaIQ<br />
            Zeeland, Nederland<br />
            KVK-nummer: 78546338<br />
            E-mail: <a href="mailto:privacy@vorzaiq.com" style={{ color: "#7C3AED" }}>privacy@vorzaiq.com</a>
            <br /><br />
            Voor alle vragen over dit privacybeleid of de verwerking van je persoonsgegevens kun je
            contact opnemen via bovenstaand e-mailadres.
          </Section>

          <Section title="2. Welke gegevens wij verwerken">
            <strong>Van kandidaten:</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Naam, e-mailadres en telefoonnummer</Li>
              <Li>CV en de daarin opgenomen gegevens (werkervaring, opleiding, vaardigheden)</Li>
              <Li>Antwoorden die je geeft tijdens het screeningsgesprek met onze AI-recruiter Lisa</Li>
              <Li>Matchresultaten tussen jouw profiel en vacatures</Li>
            </ul>
            <br />
            <strong>Van werkgevers:</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Bedrijfsnaam, contactpersoon, e-mailadres en telefoonnummer</Li>
              <Li>Vacatureteksten en functie-eisen</Li>
              <Li>Facturatie- en abonnementsgegevens</Li>
            </ul>
            <br />
            <strong>Technische gegevens:</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Serverlogs (IP-adres, tijdstip, opgevraagde pagina&apos;s) ten behoeve van beveiliging en foutopsporing</Li>
            </ul>
          </Section>

          <Section title="3. Bijzondere persoonsgegevens">
            Wij vragen niet om bijzondere persoonsgegevens (zoals gegevens over gezondheid, religie,
            etnische afkomst of politieke voorkeur) en verzoeken je deze niet in je CV of gesprekken
            op te nemen. Een pasfoto in je CV is niet nodig en raden wij af. Mocht je toch bijzondere
            gegevens delen, dan worden deze niet gebruikt in de matching of beoordeling.
          </Section>

          <Section title="4. Waarvoor wij je gegevens gebruiken">
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700, color: "#111827" }}>Doel</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontWeight: 700, color: "#111827" }}>Grondslag</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Het matchen van kandidaten met vacatures", "Uitvoering van de overeenkomst"],
                    ["Het voeren van AI-screeningsgesprekken", "Uitvoering van de overeenkomst"],
                    ["Het delen van je profiel en gespreksresultaten met de werkgever bij wie je solliciteert", "Uitvoering van de overeenkomst"],
                    ["Facturatie en administratie", "Wettelijke verplichting"],
                    ["Beveiliging van het platform", "Gerechtvaardigd belang"],
                    ["Service-e-mails over je account of sollicitatie", "Uitvoering van de overeenkomst"],
                  ].map(([doel, grondslag], i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 12px", color: "#374151" }}>{doel}</td>
                      <td style={{ padding: "8px 12px", color: "#6b7280" }}>{grondslag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <br />
            Wij verkopen je gegevens nooit aan derden en gebruiken ze niet voor advertentiedoeleinden.
          </Section>

          <Section title="5. Geautomatiseerde verwerking en profilering">
            VorzaIQ maakt gebruik van AI om je CV te analyseren, screeningsgesprekken te voeren en een
            matchscore te berekenen tussen jouw profiel en een vacature. Dit is een vorm van profilering
            in de zin van de AVG.
            <br /><br />
            <strong>Belangrijk om te weten:</strong>
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>De AI-matchscore en het gespreksverslag zijn een <strong>hulpmiddel</strong> voor de werkgever. De uiteindelijke beslissing om je wel of niet uit te nodigen of aan te nemen wordt altijd genomen door een mens bij de werkgever, niet door de AI.</Li>
              <Li>De matchscore is gebaseerd op de aansluiting tussen je werkervaring, opleiding, vaardigheden en de functie-eisen in de vacature.</Li>
              <Li>Je hebt het recht om je standpunt kenbaar te maken, de uitkomst te betwisten en menselijke tussenkomst te vragen. Neem hiervoor contact op via <a href="mailto:privacy@vorzaiq.com" style={{ color: "#7C3AED" }}>privacy@vorzaiq.com</a> of rechtstreeks met de werkgever.</Li>
              <Li>Wanneer je een gesprek voert met Lisa, praat je met een AI-systeem. Dit wordt altijd duidelijk aangegeven.</Li>
            </ul>
          </Section>

          <Section title="6. Met wie wij gegevens delen">
            <strong>Werkgevers:</strong> wanneer je solliciteert op een vacature, delen wij je profiel,
            CV en de resultaten van het screeningsgesprek met de betreffende werkgever. De werkgever is
            voor de verdere verwerking zelf verwerkingsverantwoordelijke.
            <br /><br />
            <strong>Verwerkers:</strong> wij schakelen dienstverleners in die gegevens namens ons verwerken, waaronder:
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li><strong>AI-dienstverleners</strong> (o.a. OpenAI) voor het analyseren van CV&apos;s en het voeren van gesprekken. Met deze partijen is een verwerkersovereenkomst gesloten. Voor zover gegevens buiten de Europese Economische Ruimte worden verwerkt, gebeurt dit op basis van passende waarborgen, zoals het EU-US Data Privacy Framework en/of de standaardcontractbepalingen van de Europese Commissie. Jouw gegevens worden door deze partijen niet gebruikt om hun modellen te trainen.</Li>
              <Li><strong>Hostingpartijen</strong> binnen de EU voor de opslag van gegevens.</Li>
              <Li><strong>Betaaldienstverleners</strong> voor de afhandeling van abonnementsbetalingen (alleen werkgeversgegevens).</Li>
            </ul>
            <br />
            Wij delen gegevens verder alleen als een wettelijke verplichting ons daartoe dwingt.
          </Section>

          <Section title="7. Hoe lang wij gegevens bewaren">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li><strong>Kandidaatprofielen:</strong> zolang je account actief is. Na verwijdering van je account worden je gegevens binnen 30 dagen gewist; back-ups worden binnen 90 dagen overschreven.</Li>
              <Li><strong>Sollicitatiegegevens bij een werkgever:</strong> de werkgever hanteert eigen bewaartermijnen (richtlijn: 4 weken na afronding van de procedure, of tot 1 jaar met jouw toestemming).</Li>
              <Li><strong>Facturatiegegevens van werkgevers:</strong> 7 jaar, conform de fiscale bewaarplicht.</Li>
              <Li><strong>Serverlogs:</strong> maximaal 90 dagen.</Li>
            </ul>
          </Section>

          <Section title="8. Jouw rechten">
            Je hebt op grond van de AVG recht op:
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li><strong>Inzage</strong> in de gegevens die wij van je verwerken</Li>
              <Li><strong>Rectificatie</strong> van onjuiste gegevens</Li>
              <Li><strong>Verwijdering</strong> van je gegevens</Li>
              <Li><strong>Beperking</strong> van de verwerking</Li>
              <Li><strong>Overdraagbaarheid</strong> van je gegevens (dataportabiliteit)</Li>
              <Li><strong>Bezwaar</strong> tegen verwerking op basis van gerechtvaardigd belang</Li>
              <Li><strong>Menselijke tussenkomst</strong> bij geautomatiseerde verwerking (zie artikel 5)</Li>
            </ul>
            <br />
            Stuur je verzoek naar{" "}
            <a href="mailto:privacy@vorzaiq.com" style={{ color: "#7C3AED" }}>privacy@vorzaiq.com</a>.
            Wij reageren binnen &eacute;&eacute;n maand. Bij complexe verzoeken kan deze termijn met twee
            maanden worden verlengd; daarover informeren wij je tijdig.
            <br /><br />
            Ben je het niet eens met hoe wij met je gegevens omgaan, dan kun je een klacht indienen bij de{" "}
            <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" style={{ color: "#7C3AED" }}>
              Autoriteit Persoonsgegevens
            </a>.
          </Section>

          <Section title="9. Cookies en lokale opslag">
            VorzaIQ gebruikt geen tracking- of advertentiecookies. Wij gebruiken uitsluitend
            functionele lokale opslag (localStorage) die noodzakelijk is om ingelogd te blijven
            en het platform te laten werken. Hiervoor is geen toestemming vereist.
          </Section>

          <Section title="10. Beveiliging">
            Wij nemen passende technische en organisatorische maatregelen om je gegevens te beschermen,
            waaronder versleutelde verbindingen (TLS), versleutelde opslag, toegangsbeperking en logging.
          </Section>

          <Section title="11. Wijzigingen">
            Wij kunnen dit privacybeleid aanpassen. Bij belangrijke wijzigingen informeren wij
            accounthouders per e-mail. De meest actuele versie staat altijd op{" "}
            <a href="/privacy" style={{ color: "#7C3AED" }}>vorzaiq.com/privacy</a>.
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
