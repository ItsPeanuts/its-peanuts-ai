import type { Metadata } from "next";
import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Actievoorwaarden Winactie JBL Boombox 4",
  description:
    "Actievoorwaarden voor de winactie JBL Boombox 4 van VorzaIQ. Solliciteer via vorzaiq.com en maak kans op een JBL Boombox 4 t.w.v. €450.",
  alternates: { canonical: "https://www.vorzaiq.com/actievoorwaarden" },
};

const sections = [
  {
    title: "1. Organisator",
    content:
      "Deze winactie wordt georganiseerd door VorzaIQ, ingeschreven bij de Kamer van Koophandel onder nummer 78546338, gevestigd in Zeeland. Door deel te nemen ga je akkoord met deze actievoorwaarden.",
  },
  {
    title: "2. Actieperiode",
    content:
      "De actie loopt van 18 oktober 2026 tot en met 30 november 2026 23:59 uur. Deelnames die na dit tijdstip binnenkomen doen niet mee.",
  },
  {
    title: "3. Deelname",
    content:
      "Je doet automatisch mee aan de winactie wanneer je in de actieperiode je cv uploadt op vorzaiq.com en solliciteert op een vacature. Deelname is gratis. Per persoon doe je eenmaal mee, ongeacht het aantal sollicitaties.",
  },
  {
    title: "4. Voorwaarden voor deelname",
    content:
      "Deelname staat open voor iedereen van 18 jaar en ouder met een woonadres in Nederland of België. Medewerkers van VorzaIQ en direct betrokkenen bij deze actie zijn uitgesloten van deelname.",
  },
  {
    title: "5. De prijs",
    content:
      "De prijs is één JBL Boombox 4 met een waarde van ongeveer 450 euro. De prijs is niet inwisselbaar voor geld of andere producten en is niet overdraagbaar.",
  },
  {
    title: "6. Trekking en bekendmaking",
    content:
      "De winnaar wordt na afloop van de actieperiode op 1 december 2026 op onpartijdige wijze door loting bepaald uit alle geldige deelnames. De winnaar krijgt binnen vijf werkdagen persoonlijk bericht via het e-mailadres dat bij de aanmelding is gebruikt. Reageert de winnaar niet binnen zeven dagen, dan vervalt het recht op de prijs en wordt een nieuwe winnaar geloot.",
  },
  {
    title: "7. Verzending",
    content:
      "De prijs wordt kosteloos verzonden naar een adres in Nederland of België dat de winnaar opgeeft.",
  },
  {
    title: "8. Persoonsgegevens",
    content:
      "VorzaIQ verwerkt de gegevens van deelnemers uitsluitend voor het uitvoeren van deze actie en in overeenstemming met de AVG en ons privacybeleid. Je gegevens worden niet voor deze actie aan derden verstrekt, behoudens wat nodig is om de prijs te bezorgen.",
  },
  {
    title: "9. Geen sponsoring door derden",
    content:
      "Deze actie wordt op geen enkele wijze gesponsord, onderschreven of beheerd door Meta (Facebook en Instagram) of door JBL. Je stelt deze partijen niet aansprakelijk in verband met deze actie.",
  },
  {
    title: "10. Slotbepalingen",
    content:
      "VorzaIQ mag de actie tussentijds aanpassen of beëindigen bij onvoorziene omstandigheden, zonder dat hieruit aansprakelijkheid voortvloeit. Over de uitslag kan niet worden gecorrespondeerd. Op deze actie is Nederlands recht van toepassing.",
  },
];

export default function ActievoorwaardenPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-purple-700 no-underline"
          >
            VorzaIQ
          </Link>
          <div className="flex gap-4 text-sm">
            <Link
              href="/vacatures"
              className="text-gray-600 hover:text-purple-600 no-underline"
            >
              Vacatures
            </Link>
            <Link
              href="/candidate/login"
              className="text-purple-600 font-semibold no-underline"
            >
              Inloggen
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full mb-4">
            WINACTIE
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Actievoorwaarden Winactie JBL Boombox 4
          </h1>
          <p className="text-sm text-gray-500">
            Actieperiode: 18 oktober 2026 t/m 30 november 2026
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-8">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-base font-bold text-gray-900 mb-2">
                {section.title}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Doe mee: upload je CV en solliciteer op een vacature
          </p>
          <Link
            href="/vacatures"
            className="inline-block bg-purple-600 text-white font-bold text-sm px-6 py-3 rounded-xl no-underline hover:bg-purple-700 transition-colors"
          >
            Bekijk vacatures
          </Link>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
