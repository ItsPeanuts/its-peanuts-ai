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
          Laatst bijgewerkt: juli 2026
        </p>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "32px", display: "flex", flexDirection: "column", gap: 32 }}>

          <Section title="1. Wie wij zijn">
            Deze voorwaarden zijn van toepassing op het gebruik van het platform VorzaIQ (
            <a href="https://vorzaiq.com" style={{ color: "#7C3AED" }}>vorzaiq.com</a>), aangeboden door:
            <br /><br />
            <strong>VorzaIQ</strong><br />
            Zeeland, Nederland<br />
            KVK-nummer: 78546338<br />
            E-mail: <a href="mailto:info@vorzaiq.com" style={{ color: "#7C3AED" }}>info@vorzaiq.com</a>
          </Section>

          <Section title="2. De dienst">
            VorzaIQ is een AI-gedreven recruitmentplatform. Werkgevers kunnen vacatures plaatsen en
            kandidaten laten voorscreenen door onze AI-recruiter &quot;Lisa&quot;. Kandidaten kunnen kosteloos
            een profiel aanmaken, hun CV matchen met vacatures en solliciteren.
          </Section>

          <Section title="3. Accounts">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Je bent zelf verantwoordelijk voor de juistheid van de gegevens in je account en voor het vertrouwelijk houden van je inloggegevens.</Li>
              <Li>Je mag het platform niet gebruiken voor onrechtmatige doeleinden, waaronder het plaatsen van misleidende vacatures of discriminerende functie-eisen.</Li>
              <Li>Wij mogen accounts opschorten of be&euml;indigen bij misbruik of schending van deze voorwaarden.</Li>
            </ul>
          </Section>

          <Section title="4. Abonnementen en tarieven (werkgevers)">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>VorzaIQ biedt de abonnementen <strong>Starter</strong>, <strong>Growth</strong> en <strong>Scale</strong>, en daarnaast de mogelijkheid om per vacature te betalen. De actuele tarieven en inbegrepen functionaliteit staan op <a href="/abonnementen" style={{ color: "#7C3AED" }}>vorzaiq.com/abonnementen</a>.</Li>
              <Li>Abonnementen worden aangegaan per maand en worden telkens stilzwijgend met &eacute;&eacute;n maand verlengd, tenzij tijdig opgezegd.</Li>
              <Li>Opzeggen kan op elk moment via je accountinstellingen of per e-mail, met inachtneming van een opzegtermijn van maximaal &eacute;&eacute;n maand. Na opzegging blijft het abonnement actief tot het einde van de lopende periode.</Li>
              <Li>Prijswijzigingen worden minimaal 30 dagen van tevoren aangekondigd. Bij een prijsverhoging heb je het recht om per de ingangsdatum op te zeggen.</Li>
            </ul>
          </Section>

          <Section title="5. Herroepingsrecht">
            Sluit je een abonnement af als consument of als natuurlijk persoon die niet hoofdzakelijk
            handelt in de uitoefening van een beroep of bedrijf, dan heb je het recht om de overeenkomst
            binnen 14 dagen na het sluiten daarvan zonder opgave van redenen te ontbinden. Als je verzoekt
            om de dienst direct te laten ingaan, ben je bij herroeping een evenredige vergoeding
            verschuldigd voor de periode waarin de dienst al is geleverd.
            <br /><br />
            Voor zakelijke afnemers (rechtspersonen en ondernemers die handelen in de uitoefening van hun
            bedrijf) geldt geen herroepingsrecht.
          </Section>

          <Section title="6. Betaling">
            Betaling verloopt via onze betaaldienstverlener. Facturen worden digitaal verstrekt.
            Bij uitblijvende betaling kunnen wij de toegang tot het platform opschorten nadat een
            betalingsherinnering is verstuurd.
          </Section>

          <Section title="7. Gebruik van AI">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>De screeningsgesprekken op VorzaIQ worden gevoerd door een AI-systeem. Dit wordt voorafgaand aan elk gesprek duidelijk aan de kandidaat gemeld.</Li>
              <Li>AI-uitkomsten (matchscores, gespreksverslagen, samenvattingen) zijn hulpmiddelen ter ondersteuning van het wervingsproces. Zij vormen geen zelfstandig aannamebesluit.</Li>
              <Li><strong>De werkgever is verplicht om beslissingen over kandidaten (afwijzen, uitnodigen, aannemen) altijd door een mens te laten nemen en de AI-uitkomsten daarbij kritisch te beoordelen.</strong> De werkgever mag kandidaten niet uitsluitend op basis van een geautomatiseerde uitkomst afwijzen.</Li>
              <Li>De werkgever staat ervoor in dat functie-eisen en selectiecriteria niet in strijd zijn met gelijkebehandelingswetgeving.</Li>
            </ul>
          </Section>

          <Section title="8. Persoonsgegevens en verwerkersrol">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>Voor de gegevens van kandidaten die via het platform bij een werkgever terechtkomen, is de werkgever zelf verwerkingsverantwoordelijke in de zin van de AVG.</Li>
              <Li>Voor zover VorzaIQ persoonsgegevens verwerkt in opdracht van de werkgever, treedt VorzaIQ op als verwerker. Op verzoek sluiten wij hiervoor een verwerkersovereenkomst; deze maakt onderdeel uit van deze voorwaarden.</Li>
              <Li>Op de verwerking van persoonsgegevens door VorzaIQ als verantwoordelijke is ons <a href="/privacy" style={{ color: "#7C3AED" }}>privacybeleid</a> van toepassing.</Li>
            </ul>
          </Section>

          <Section title="9. Beschikbaarheid en onderhoud">
            Wij streven naar een zo hoog mogelijke beschikbaarheid van het platform, maar garanderen
            geen ononderbroken werking. Gepland onderhoud kondigen wij waar mogelijk vooraf aan.
          </Section>

          <Section title="10. Intellectuele eigendom">
            Alle rechten op het platform, de software, de AI-modellen en de content van VorzaIQ berusten
            bij VorzaIQ of haar licentiegevers. Werkgevers behouden de rechten op hun eigen vacatureteksten
            en bedrijfsmateriaal; kandidaten behouden de rechten op hun eigen CV.
          </Section>

          <Section title="11. Aansprakelijkheid">
            <ul style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <Li>VorzaIQ spant zich in om accurate matchresultaten en gespreksverslagen te leveren, maar garandeert niet dat deze foutloos of volledig zijn.</Li>
              <Li>VorzaIQ is niet aansprakelijk voor aannamebeslissingen van werkgevers of voor de inhoud van vacatures en CV&apos;s die door gebruikers zijn geplaatst.</Li>
              <Li>De totale aansprakelijkheid van VorzaIQ is per gebeurtenis beperkt tot het bedrag dat de werkgever in de drie maanden voorafgaand aan de gebeurtenis aan VorzaIQ heeft betaald. Deze beperking geldt niet bij opzet of bewuste roekeloosheid van VorzaIQ, of voor zover de wet beperking niet toestaat.</Li>
              <Li>Voor kandidaten is het gebruik van het platform kosteloos; aansprakelijkheid jegens kandidaten is beperkt tot hetgeen dwingend recht voorschrijft.</Li>
            </ul>
          </Section>

          <Section title="12. Wijzigingen van deze voorwaarden">
            Wij kunnen deze voorwaarden wijzigen. Wijzigingen worden minimaal 30 dagen voor
            inwerkingtreding aangekondigd via e-mail of het platform. Ben je het niet eens met een
            wijziging, dan kun je het abonnement per de ingangsdatum opzeggen.
          </Section>

          <Section title="13. Toepasselijk recht en geschillen">
            Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd
            aan de bevoegde rechter in het arrondissement waar VorzaIQ is gevestigd, tenzij dwingend
            recht anders bepaalt.
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
