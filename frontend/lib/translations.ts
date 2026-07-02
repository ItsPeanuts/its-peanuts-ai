export type Lang = "nl" | "en" | "de" | "fr" | "es";

export type TranslationSet = {
  nav: {
    vacancies: string;
    candidates: string;
    employers: string;
    login: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    searchJob: string;
    searchLocation: string;
    searchBtn: string;
    recentJobs: string;
    viewAll: string;
  };
  jobs: {
    searchPlaceholder: string;
    locationPlaceholder: string;
    searchBtn: string;
    filtersBtn: string;
    filters: string;
    clearAll: string;
    datePosted: string;
    today: string;
    last3days: string;
    lastWeek: string;
    lastMonth: string;
    employmentType: string;
    fulltime: string;
    parttime: string;
    freelance: string;
    zzp: string;
    stage: string;
    tijdelijk: string;
    workLocation: string;
    remote: string;
    hybride: string;
    opLocatie: string;
    hoursPerWeek: string;
    salary: string;
    vacancyLanguage: string;
    langNl: string;
    langEn: string;
    perWeek: string;
    loading: string;
    found: string;
    vacancy: string;
    vacancies: string;
    allVacancies: string;
    allVacanciesSub: string;
    noResults: string;
    noResultsHint: string;
    removeFilters: string;
    applyBtn: string;
    profileCta: string;
    profileCtaSub: string;
    startNow: string;
    minSalary: string;
    maxSalary: string;
  };
  page: {
    categories: string;
    allCategories: string;
    locationUnknown: string;
    ctaTitle: string;
    ctaSubtitle: string;
    ctaCreateAccount: string;
    lisaLabel: string;
    lisaTitle: string;
    lisaSubtitle: string;
  };
  subscription: {
    subscriptionActivated: string;
    subscriptionActivatedSub: string;
    freeMonthBadge: string;
    freeMonthRegNotice: string;
    trialTitle: string;
    trialSub: string;
    startFree: string;
    transparentPricing: string;
    title: string;
    subtitle: string;
    monthly: string;
    yearly: string;
    yearDiscount: string;
    perMonth: string;
    perYear: string;
    approxPerMonth: string;
    mostPopular: string;
    loading: string;
    cta: string;
    starterFeatures: string[];
    growthFeatures: string[];
    scaleFeatures: string[];
    payPerVacancyLabel: string;
    payPerVacancyPrice: string;
    payPerVacancyDesc: string;
    postVacancyBtn: string;
    payPerVacancyTags: string[];
    whyTitle: string;
    whyQuote: string;
    compPlatform: string;
    compCost: string;
    compUnit: string;
    compAiLabel: string;
    youBadge: string;
    compRows: Array<{ label: string; cost: string; unit: string }>;
    faqTitle: string;
    faqs: Array<{ q: string; a: string }>;
    contactText: string;
    contactLink: string;
  };
  common: {
    loading: string;
    save: string;
    cancel: string;
    back: string;
    next: string;
    submit: string;
    close: string;
    error: string;
    success: string;
    yes: string;
    no: string;
    or: string;
  };
  candidate: {
    dashboard: string;
    myApplications: string;
    myCV: string;
    myProfile: string;
    noApplications: string;
    noApplicationsSub: string;
    browseJobs: string;
    statusPending: string;
    statusReview: string;
    statusApproved: string;
    statusRejected: string;
    statusInterview: string;
    statusOffer: string;
    aiScore: string;
    aiAnalysis: string;
    chatWithLisa: string;
    uploadCV: string;
    uploadCVSub: string;
    matchScore: string;
    viewDetail: string;
    appliedOn: string;
    interviewScheduled: string;
    logout: string;
    profileComplete: string;
    profileIncompleteSub: string;
  };
  employer: {
    dashboard: string;
    myVacancies: string;
    applicants: string;
    analytics: string;
    newVacancy: string;
    statusActive: string;
    statusPaused: string;
    statusClosed: string;
    postJob: string;
    editVacancy: string;
    deleteVacancy: string;
    viewApplicants: string;
    noVacancies: string;
    noApplicants: string;
    logout: string;
    intakeQuestions: string;
    settings: string;
  };
  terms: {
    title: string;
    lastUpdated: string;
    sections: Array<{ title: string; content: string; items?: string[] }>;
  };
  privacy: {
    title: string;
    lastUpdated: string;
    sections: Array<{ title: string; content: string; items?: string[] }>;
    dataTable?: Array<{ purpose: string; basis: string }>;
  };
};

// ─── Nederlands ──────────────────────────────────────────────────────────────

const nl: TranslationSet = {
  nav: {
    vacancies: "Vacatures",
    candidates: "Kandidaten",
    employers: "Werkgevers",
    login: "Inloggen",
  },
  hero: {
    badge: "AI-powered recruitment platform",
    title: "Vind jouw perfecte baan",
    subtitle: "Upload je CV en ontvang direct een AI-matchscore voor elke vacature.",
    searchJob: "Functietitel of trefwoord...",
    searchLocation: "Stad of regio",
    searchBtn: "Zoeken",
    recentJobs: "Recente vacatures",
    viewAll: "Bekijk alle vacatures",
  },
  jobs: {
    searchPlaceholder: "Functie, trefwoord of bedrijf...",
    locationPlaceholder: "Stad of regio...",
    searchBtn: "Zoeken",
    filtersBtn: "Filters",
    filters: "Filters",
    clearAll: "Wis alles",
    datePosted: "Datum geplaatst",
    today: "Vandaag",
    last3days: "Afgelopen 3 dagen",
    lastWeek: "Afgelopen week",
    lastMonth: "Afgelopen maand",
    employmentType: "Dienstverband",
    fulltime: "Fulltime",
    parttime: "Parttime",
    freelance: "Freelance",
    zzp: "ZZP / Opdracht",
    stage: "Stage",
    tijdelijk: "Tijdelijk",
    workLocation: "Werklocatie",
    remote: "Remote",
    hybride: "Hybride",
    opLocatie: "Op locatie",
    hoursPerWeek: "Uren per week",
    salary: "Salaris (per maand)",
    vacancyLanguage: "Taal vacature",
    langNl: "Nederlands",
    langEn: "Engels",
    perWeek: "u/week",
    loading: "Laden...",
    found: "gevonden",
    vacancy: "vacature",
    vacancies: "vacatures",
    allVacancies: "Alle vacatures",
    allVacanciesSub: "Vind je volgende baan met AI-matching. Upload je CV één keer, krijg directe matches.",
    noResults: "Geen vacatures gevonden",
    noResultsHint: "Pas je zoekopdracht of filters aan",
    removeFilters: "Verwijder alle filters",
    applyBtn: "Solliciteer",
    profileCta: "Maak je profiel compleet",
    profileCtaSub: "Upload je CV en ontvang automatisch AI-matches.",
    startNow: "Start nu",
    minSalary: "Min",
    maxSalary: "Max",
  },
  page: {
    categories: "Categorieën",
    allCategories: "Alle categorieën →",
    locationUnknown: "Locatie onbekend",
    ctaTitle: "Klaar om te starten?",
    ctaSubtitle: "Maak een gratis account, upload je CV en ontvang AI-matches op maat.",
    ctaCreateAccount: "Upload je CV gratis",
    lisaLabel: "Hoe het werkt",
    lisaTitle: "Maak kennis met Lisa",
    lisaSubtitle: "Upload je CV en zoek zelf niet meer naar vacatures. Druk in je portaal op 'Analyseer mijn matches' en ontvang de vacatures die het beste bij jouw CV passen. Solliciteer je? Dan neemt Lisa, onze AI-recruiter, direct 24/7 het eerste gesprek met je af.",
  },
  subscription: {
    subscriptionActivated: "Abonnement geactiveerd!",
    subscriptionActivatedSub: "Je plan is bijgewerkt. Alle features zijn nu beschikbaar.",
    freeMonthBadge: "1 maand gratis",
    freeMonthRegNotice: "Eerste maand Growth gratis — daarna €149/maand",
    trialTitle: "Eerste maand Growth gratis",
    trialSub: "Probeer het Growth pakket volledig gratis. Na je gratis maand wordt €149/maand automatisch afgeschreven.",
    startFree: "Start gratis met Growth →",
    transparentPricing: "Transparante prijzen",
    title: "Kies het plan dat bij je past",
    subtitle: "Van één vacature tot onbeperkt werven — altijd inclusief AI-matching.",
    monthly: "Maandelijks",
    yearly: "Jaarlijks",
    yearDiscount: "−16%",
    perMonth: "/mnd",
    perYear: "/jaar",
    approxPerMonth: "≈ €{amount}/mnd bij jaarlijkse betaling",
    mostPopular: "Meest populair",
    loading: "Bezig...",
    cta: "Nu starten →",
    starterFeatures: [
      "1 actieve vacature",
      "AI-matching & pre-screening",
      "Kandidaatoverzicht dashboard",
      "Chatbot Lisa (kandidaten)",
      "E-mail notificaties",
      "Prioriteit in zoekresultaten",
      "Meerdere vacatures",
      "Virtuele Lisa video-interview",
      "Geavanceerde analytics",
      "Dedicated support",
    ],
    growthFeatures: [
      "5 actieve vacatures",
      "AI-matching & pre-screening",
      "Kandidaatoverzicht dashboard",
      "Chatbot Lisa (kandidaten)",
      "E-mail notificaties",
      "Prioriteit in zoekresultaten",
      "CRM integratie",
      "Virtuele Lisa video-interview",
      "Geavanceerde analytics",
      "Dedicated support",
    ],
    scaleFeatures: [
      "Onbeperkte vacatures",
      "AI-matching & pre-screening",
      "Kandidaatoverzicht dashboard",
      "Chatbot Lisa (kandidaten)",
      "E-mail notificaties",
      "Prioriteit in zoekresultaten",
      "CRM integratie",
      "Virtuele Lisa video-interview",
      "Geavanceerde analytics",
      "Dedicated support",
    ],
    payPerVacancyLabel: "Pay-per-vacature",
    payPerVacancyPrice: "€89 per vacature",
    payPerVacancyDesc: "30 dagen actief · inclusief AI-matching · geen abonnement nodig",
    postVacancyBtn: "Vacature plaatsen →",
    payPerVacancyTags: ["AI pre-screening", "Kandidaatdashboard", "E-mail notificaties", "30 dagen zichtbaar"],
    whyTitle: "Waarom VorzaIQ?",
    whyQuote: "",
    compPlatform: "Platform",
    compCost: "Kosten",
    compUnit: "Eenheid",
    compAiLabel: "AI-matching",
    youBadge: "Jij",
    compRows: [
      { label: "Indeed gesponsord", cost: "€200 – €400", unit: "per vacature" },
      { label: "LinkedIn Jobs", cost: "€210 – €300", unit: "per maand (1 vacature)" },
      { label: "VorzaIQ Starter", cost: "€49", unit: "per maand incl. AI-matching" },
    ],
    faqTitle: "Veelgestelde vragen",
    faqs: [
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
        a: "We accepteren iDEAL, creditcard en SEPA incasso via Stripe. Alle betalingen zijn beveiligd.",
      },
      {
        q: "Wat als ik meer vacatures nodig heb dan mijn plan?",
        a: "Je kunt losse vacatures bijkopen voor €89 per stuk (30 dagen actief, inclusief AI-matching), of upgraden naar een hoger plan.",
      },
    ],
    contactText: "Vragen over een abonnement?",
    contactLink: "Neem contact op",
  },
  common: {
    loading: "Laden...",
    save: "Opslaan",
    cancel: "Annuleren",
    back: "Terug",
    next: "Volgende",
    submit: "Versturen",
    close: "Sluiten",
    error: "Er is iets misgegaan",
    success: "Gelukt!",
    yes: "Ja",
    no: "Nee",
    or: "of",
  },
  candidate: {
    dashboard: "Mijn dashboard",
    myApplications: "Mijn sollicitaties",
    myCV: "Mijn CV",
    myProfile: "Mijn profiel",
    noApplications: "Nog geen sollicitaties",
    noApplicationsSub: "Vind vacatures die bij jou passen en solliciteer direct.",
    browseJobs: "Bekijk vacatures",
    statusPending: "In behandeling",
    statusReview: "In beoordeling",
    statusApproved: "Goedgekeurd",
    statusRejected: "Afgewezen",
    statusInterview: "Interview gepland",
    statusOffer: "Aanbod ontvangen",
    aiScore: "AI Matchscore",
    aiAnalysis: "AI Analyse",
    chatWithLisa: "Chat met Lisa",
    uploadCV: "Upload je CV",
    uploadCVSub: "Ontvang automatisch AI-matches voor elke vacature.",
    matchScore: "Matchscore",
    viewDetail: "Bekijk detail",
    appliedOn: "Gesolliciteerd op",
    interviewScheduled: "Interview gepland",
    logout: "Uitloggen",
    profileComplete: "Profiel compleet",
    profileIncompleteSub: "Upload je CV om je kansen te vergroten.",
  },
  employer: {
    dashboard: "Dashboard",
    myVacancies: "Mijn vacatures",
    applicants: "Sollicitanten",
    analytics: "Analytics",
    newVacancy: "Nieuwe vacature",
    statusActive: "Actief",
    statusPaused: "Gepauzeerd",
    statusClosed: "Gesloten",
    postJob: "Vacature plaatsen",
    editVacancy: "Bewerken",
    deleteVacancy: "Verwijderen",
    viewApplicants: "Bekijk sollicitanten",
    noVacancies: "Nog geen vacatures geplaatst",
    noApplicants: "Nog geen sollicitanten",
    logout: "Uitloggen",
    intakeQuestions: "Intakevragen",
    settings: "Instellingen",
  },
  terms: {
    title: "Algemene Voorwaarden",
    lastUpdated: "Laatst bijgewerkt: juli 2026",
    sections: [
      { title: "1. Wie wij zijn", content: "Deze voorwaarden zijn van toepassing op het gebruik van het platform VorzaIQ (vorzaiq.com), aangeboden door:\n\nVorzaIQ\nZeeland, Nederland\nKVK-nummer: 78546338\nE-mail: info@vorzaiq.com" },
      { title: "2. De dienst", content: "VorzaIQ is een AI-gedreven recruitmentplatform. Werkgevers kunnen vacatures plaatsen en kandidaten laten voorscreenen door onze AI-recruiter \"Lisa\". Kandidaten kunnen kosteloos een profiel aanmaken, hun CV matchen met vacatures en solliciteren." },
      { title: "3. Accounts", content: "", items: ["Je bent zelf verantwoordelijk voor de juistheid van de gegevens in je account en voor het vertrouwelijk houden van je inloggegevens.", "Je mag het platform niet gebruiken voor onrechtmatige doeleinden, waaronder het plaatsen van misleidende vacatures of discriminerende functie-eisen.", "Wij mogen accounts opschorten of beëindigen bij misbruik of schending van deze voorwaarden."] },
      { title: "4. Abonnementen en tarieven (werkgevers)", content: "", items: ["VorzaIQ biedt de abonnementen Starter, Growth en Scale, en daarnaast de mogelijkheid om per vacature te betalen. De actuele tarieven staan op vorzaiq.com/abonnementen.", "Abonnementen worden aangegaan per maand en worden telkens stilzwijgend met één maand verlengd, tenzij tijdig opgezegd.", "Opzeggen kan op elk moment via je accountinstellingen of per e-mail, met inachtneming van een opzegtermijn van maximaal één maand.", "Prijswijzigingen worden minimaal 30 dagen van tevoren aangekondigd. Bij een prijsverhoging heb je het recht om per de ingangsdatum op te zeggen.", "Bij een gratis proefperiode gaat het betaalde abonnement pas in na afloop van de proefperiode. Wij sturen uiterlijk drie dagen voor het einde van de proefperiode een herinnering per e-mail. Je kunt tijdens de proefperiode kosteloos opzeggen; er wordt dan niets in rekening gebracht."] },
      { title: "5. Herroepingsrecht", content: "Sluit je een abonnement af als consument of als natuurlijk persoon die niet hoofdzakelijk handelt in de uitoefening van een beroep of bedrijf, dan heb je het recht om de overeenkomst binnen 14 dagen na het sluiten daarvan zonder opgave van redenen te ontbinden. Als je verzoekt om de dienst direct te laten ingaan, ben je bij herroeping een evenredige vergoeding verschuldigd voor de periode waarin de dienst al is geleverd.\n\nVoor zakelijke afnemers (rechtspersonen en ondernemers die handelen in de uitoefening van hun bedrijf) geldt geen herroepingsrecht." },
      { title: "6. Betaling", content: "Betaling verloopt via onze betaaldienstverlener. Facturen worden digitaal verstrekt. Bij uitblijvende betaling kunnen wij de toegang tot het platform opschorten nadat een betalingsherinnering is verstuurd." },
      { title: "7. Gebruik van AI", content: "", items: ["De screeningsgesprekken op VorzaIQ worden gevoerd door een AI-systeem. Dit wordt voorafgaand aan elk gesprek duidelijk aan de kandidaat gemeld.", "AI-uitkomsten (matchscores, gespreksverslagen, samenvattingen) zijn hulpmiddelen ter ondersteuning van het wervingsproces. Zij vormen geen zelfstandig aannamebesluit.", "De werkgever is verplicht om beslissingen over kandidaten altijd door een mens te laten nemen en de AI-uitkomsten daarbij kritisch te beoordelen. De werkgever mag kandidaten niet uitsluitend op basis van een geautomatiseerde uitkomst afwijzen.", "De werkgever staat ervoor in dat functie-eisen en selectiecriteria niet in strijd zijn met gelijkebehandelingswetgeving."] },
      { title: "8. Persoonsgegevens en verwerkersrol", content: "", items: ["Voor de gegevens van kandidaten die via het platform bij een werkgever terechtkomen, is de werkgever zelf verwerkingsverantwoordelijke in de zin van de AVG.", "Voor zover VorzaIQ persoonsgegevens verwerkt in opdracht van de werkgever, treedt VorzaIQ op als verwerker. Op verzoek sluiten wij hiervoor een verwerkersovereenkomst.", "Op de verwerking van persoonsgegevens door VorzaIQ als verantwoordelijke is ons privacybeleid van toepassing."] },
      { title: "9. Beschikbaarheid en onderhoud", content: "Wij streven naar een zo hoog mogelijke beschikbaarheid van het platform, maar garanderen geen ononderbroken werking. Gepland onderhoud kondigen wij waar mogelijk vooraf aan." },
      { title: "10. Intellectuele eigendom", content: "Alle rechten op het platform, de software, de AI-modellen en de content van VorzaIQ berusten bij VorzaIQ of haar licentiegevers. Werkgevers behouden de rechten op hun eigen vacatureteksten en bedrijfsmateriaal; kandidaten behouden de rechten op hun eigen CV." },
      { title: "11. Aansprakelijkheid", content: "", items: ["VorzaIQ spant zich in om accurate matchresultaten en gespreksverslagen te leveren, maar garandeert niet dat deze foutloos of volledig zijn.", "VorzaIQ is niet aansprakelijk voor aannamebeslissingen van werkgevers of voor de inhoud van vacatures en CV's die door gebruikers zijn geplaatst.", "De totale aansprakelijkheid van VorzaIQ is per gebeurtenis beperkt tot het bedrag dat de werkgever in de drie maanden voorafgaand aan de gebeurtenis aan VorzaIQ heeft betaald. Deze beperking geldt niet bij opzet of bewuste roekeloosheid van VorzaIQ, of voor zover de wet beperking niet toestaat.", "Voor kandidaten is het gebruik van het platform kosteloos; aansprakelijkheid jegens kandidaten is beperkt tot hetgeen dwingend recht voorschrijft."] },
      { title: "12. Wijzigingen van deze voorwaarden", content: "Wij kunnen deze voorwaarden wijzigen. Wijzigingen worden minimaal 30 dagen voor inwerkingtreding aangekondigd via e-mail of het platform. Ben je het niet eens met een wijziging, dan kun je het abonnement per de ingangsdatum opzeggen." },
      { title: "13. Toepasselijk recht en geschillen", content: "Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in het arrondissement waar VorzaIQ is gevestigd, tenzij dwingend recht anders bepaalt." },
    ],
  },
  privacy: {
    title: "Privacybeleid",
    lastUpdated: "Laatst bijgewerkt: juli 2026",
    dataTable: [
      { purpose: "Het matchen van kandidaten met vacatures", basis: "Uitvoering van de overeenkomst" },
      { purpose: "Het voeren van AI-screeningsgesprekken", basis: "Uitvoering van de overeenkomst" },
      { purpose: "Het delen van je profiel en gespreksresultaten met de werkgever bij wie je solliciteert", basis: "Uitvoering van de overeenkomst" },
      { purpose: "Facturatie en administratie", basis: "Wettelijke verplichting" },
      { purpose: "Beveiliging van het platform", basis: "Gerechtvaardigd belang" },
      { purpose: "Service-e-mails over je account of sollicitatie", basis: "Uitvoering van de overeenkomst" },
    ],
    sections: [
      { title: "1. Wie zijn wij", content: "VorzaIQ is een AI-gedreven recruitmentplatform dat werkgevers en kandidaten met elkaar verbindt.\n\nVerwerkingsverantwoordelijke:\nVorzaIQ\nZeeland, Nederland\nKVK-nummer: 78546338\nE-mail: privacy@vorzaiq.com\n\nVoor alle vragen over dit privacybeleid of de verwerking van je persoonsgegevens kun je contact opnemen via bovenstaand e-mailadres." },
      { title: "2. Welke gegevens wij verwerken", content: "Van kandidaten:", items: ["Naam, e-mailadres en telefoonnummer", "CV en de daarin opgenomen gegevens (werkervaring, opleiding, vaardigheden)", "Antwoorden die je geeft tijdens het screeningsgesprek met onze AI-recruiter Lisa", "Matchresultaten tussen jouw profiel en vacatures", "Van werkgevers: bedrijfsnaam, contactpersoon, e-mailadres en telefoonnummer; vacatureteksten en functie-eisen; facturatie- en abonnementsgegevens.", "Technische gegevens: serverlogs (IP-adres, tijdstip, opgevraagde pagina's) ten behoeve van beveiliging en foutopsporing."] },
      { title: "3. Bijzondere persoonsgegevens", content: "Wij vragen niet om bijzondere persoonsgegevens (zoals gegevens over gezondheid, religie, etnische afkomst of politieke voorkeur) en verzoeken je deze niet in je CV of gesprekken op te nemen. Een pasfoto in je CV is niet nodig en raden wij af. Mocht je toch bijzondere gegevens delen, dan worden deze niet gebruikt in de matching of beoordeling." },
      { title: "4. Waarvoor wij je gegevens gebruiken", content: "Wij verkopen je gegevens nooit aan derden en gebruiken ze niet voor advertentiedoeleinden." },
      { title: "5. Geautomatiseerde verwerking en profilering", content: "VorzaIQ maakt gebruik van AI om je CV te analyseren, screeningsgesprekken te voeren en een matchscore te berekenen tussen jouw profiel en een vacature. Dit is een vorm van profilering in de zin van de AVG.", items: ["De AI-matchscore en het gespreksverslag zijn een hulpmiddel voor de werkgever. De uiteindelijke beslissing wordt altijd genomen door een mens bij de werkgever, niet door de AI.", "De matchscore is gebaseerd op de aansluiting tussen je werkervaring, opleiding, vaardigheden en de functie-eisen in de vacature.", "Je hebt het recht om je standpunt kenbaar te maken, de uitkomst te betwisten en menselijke tussenkomst te vragen via privacy@vorzaiq.com of rechtstreeks met de werkgever.", "Wanneer je een gesprek voert met Lisa, praat je met een AI-systeem. Dit wordt altijd duidelijk aangegeven."] },
      { title: "6. Met wie wij gegevens delen", content: "Werkgevers: wanneer je solliciteert op een vacature, delen wij je profiel, CV en de resultaten van het screeningsgesprek met de betreffende werkgever.\n\nVerwerkers: wij schakelen dienstverleners in die gegevens namens ons verwerken.", items: ["AI-dienstverleners (o.a. OpenAI) voor het analyseren van CV's en het voeren van gesprekken. Met deze partijen is een verwerkersovereenkomst gesloten. Voor zover gegevens buiten de Europese Economische Ruimte worden verwerkt, gebeurt dit op basis van passende waarborgen, zoals het EU-US Data Privacy Framework en/of de standaardcontractbepalingen van de Europese Commissie. Jouw gegevens worden door deze partijen niet gebruikt om hun modellen te trainen.", "Hostingpartijen binnen de EU voor de opslag van gegevens.", "Betaaldienstverleners voor de afhandeling van abonnementsbetalingen (alleen werkgeversgegevens)."] },
      { title: "7. Hoe lang wij gegevens bewaren", content: "", items: ["Kandidaatprofielen: zolang je account actief is. Na verwijdering binnen 30 dagen gewist; back-ups binnen 90 dagen overschreven.", "Sollicitatiegegevens: de werkgever hanteert eigen bewaartermijnen (richtlijn: 4 weken na afronding, of tot 1 jaar met toestemming).", "Facturatiegegevens van werkgevers: 7 jaar, conform de fiscale bewaarplicht.", "Serverlogs: maximaal 90 dagen."] },
      { title: "8. Jouw rechten", content: "Je hebt op grond van de AVG recht op:", items: ["Inzage in de gegevens die wij van je verwerken", "Rectificatie van onjuiste gegevens", "Verwijdering van je gegevens", "Beperking van de verwerking", "Overdraagbaarheid van je gegevens (dataportabiliteit)", "Bezwaar tegen verwerking op basis van gerechtvaardigd belang", "Menselijke tussenkomst bij geautomatiseerde verwerking (zie artikel 5)", "Stuur je verzoek naar privacy@vorzaiq.com. Wij reageren binnen één maand. Bij complexe verzoeken kan deze termijn met twee maanden worden verlengd; daarover informeren wij je tijdig.", "Ben je het niet eens met hoe wij met je gegevens omgaan, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl)."] },
      { title: "9. Cookies en lokale opslag", content: "VorzaIQ gebruikt geen tracking- of advertentiecookies. Wij gebruiken uitsluitend functionele lokale opslag (localStorage) die noodzakelijk is om ingelogd te blijven en het platform te laten werken. Hiervoor is geen toestemming vereist." },
      { title: "10. Beveiliging", content: "Wij nemen passende technische en organisatorische maatregelen om je gegevens te beschermen, waaronder versleutelde verbindingen (TLS), versleutelde opslag, toegangsbeperking en logging." },
      { title: "11. Wijzigingen", content: "Wij kunnen dit privacybeleid aanpassen. Bij belangrijke wijzigingen informeren wij accounthouders per e-mail. De meest actuele versie staat altijd op vorzaiq.com/privacy." },
    ],
  },
};

// ─── English ──────────────────────────────────────────────────────────────────

const en: TranslationSet = {
  nav: {
    vacancies: "Jobs",
    candidates: "Candidates",
    employers: "Employers",
    login: "Log in",
  },
  hero: {
    badge: "AI-powered recruitment platform",
    title: "Find your perfect job",
    subtitle: "Upload your CV and instantly receive an AI match score for every vacancy.",
    searchJob: "Job title or keyword...",
    searchLocation: "City or region",
    searchBtn: "Search",
    recentJobs: "Recent jobs",
    viewAll: "View all jobs",
  },
  jobs: {
    searchPlaceholder: "Function, keyword or company...",
    locationPlaceholder: "City or region...",
    searchBtn: "Search",
    filtersBtn: "Filters",
    filters: "Filters",
    clearAll: "Clear all",
    datePosted: "Date posted",
    today: "Today",
    last3days: "Last 3 days",
    lastWeek: "Last week",
    lastMonth: "Last month",
    employmentType: "Employment type",
    fulltime: "Full-time",
    parttime: "Part-time",
    freelance: "Freelance",
    zzp: "Freelance / Contract",
    stage: "Internship",
    tijdelijk: "Temporary",
    workLocation: "Work location",
    remote: "Remote",
    hybride: "Hybrid",
    opLocatie: "On-site",
    hoursPerWeek: "Hours per week",
    salary: "Salary (per month)",
    vacancyLanguage: "Vacancy language",
    langNl: "Dutch",
    langEn: "English",
    perWeek: "h/week",
    loading: "Loading...",
    found: "found",
    vacancy: "job",
    vacancies: "jobs",
    allVacancies: "All vacancies",
    allVacanciesSub: "Find your next job with AI matching. Upload your CV once and get instant matches.",
    noResults: "No jobs found",
    noResultsHint: "Adjust your search or filters",
    removeFilters: "Remove all filters",
    applyBtn: "Apply",
    profileCta: "Complete your profile",
    profileCtaSub: "Upload your CV and automatically receive AI matches.",
    startNow: "Get started",
    minSalary: "Min",
    maxSalary: "Max",
  },
  page: {
    categories: "Categories",
    allCategories: "All categories →",
    locationUnknown: "Location unknown",
    ctaTitle: "Ready to get started?",
    ctaSubtitle: "Create a free account, upload your CV and receive tailored AI matches.",
    ctaCreateAccount: "Upload your CV for free",
    lisaLabel: "How it works",
    lisaTitle: "Meet Lisa",
    lisaSubtitle: "Upload your CV and stop searching for jobs yourself. Click 'Analyse my matches' in your portal and receive the vacancies that best match your CV. Apply? Then Lisa, our AI recruiter, immediately conducts the first interview with you, 24/7.",
  },
  subscription: {
    subscriptionActivated: "Subscription activated!",
    subscriptionActivatedSub: "Your plan has been updated. All features are now available.",
    freeMonthBadge: "1 month free",
    freeMonthRegNotice: "First month of Growth free — then €149/month",
    trialTitle: "First month of Growth free",
    trialSub: "Try the Growth plan completely free. After your free month, €149/month is billed automatically.",
    startFree: "Start free with Growth →",
    transparentPricing: "Transparent pricing",
    title: "Choose the plan that suits you",
    subtitle: "From one job to unlimited hiring — always including AI matching.",
    monthly: "Monthly",
    yearly: "Yearly",
    yearDiscount: "−16%",
    perMonth: "/mo",
    perYear: "/yr",
    approxPerMonth: "≈ €{amount}/mo with annual billing",
    mostPopular: "Most popular",
    loading: "Loading...",
    cta: "Get started →",
    starterFeatures: [
      "1 active job posting",
      "AI matching & pre-screening",
      "Candidate overview dashboard",
      "Chatbot Lisa (candidates)",
      "Email notifications",
      "Priority in search results",
      "Multiple job postings",
      "Virtual Lisa video interview",
      "Advanced analytics",
      "Dedicated support",
    ],
    growthFeatures: [
      "5 active job postings",
      "AI matching & pre-screening",
      "Candidate overview dashboard",
      "Chatbot Lisa (candidates)",
      "Email notifications",
      "Priority in search results",
      "CRM integration",
      "Virtual Lisa video interview",
      "Advanced analytics",
      "Dedicated support",
    ],
    scaleFeatures: [
      "Unlimited job postings",
      "AI matching & pre-screening",
      "Candidate overview dashboard",
      "Chatbot Lisa (candidates)",
      "Email notifications",
      "Priority in search results",
      "CRM integration",
      "Virtual Lisa video interview",
      "Advanced analytics",
      "Dedicated support",
    ],
    payPerVacancyLabel: "Pay-per-job",
    payPerVacancyPrice: "€89 per job",
    payPerVacancyDesc: "30 days active · including AI matching · no subscription needed",
    postVacancyBtn: "Post job →",
    payPerVacancyTags: ["AI pre-screening", "Candidate dashboard", "Email notifications", "30 days visible"],
    whyTitle: "Why VorzaIQ?",
    whyQuote: "",
    compPlatform: "Platform",
    compCost: "Cost",
    compUnit: "Unit",
    compAiLabel: "AI matching",
    youBadge: "You",
    compRows: [
      { label: "Indeed sponsored", cost: "€200 – €400", unit: "per job posting" },
      { label: "LinkedIn Jobs", cost: "€210 – €300", unit: "per month (1 job)" },
      { label: "VorzaIQ Starter", cost: "€49", unit: "per month incl. AI matching" },
    ],
    faqTitle: "Frequently asked questions",
    faqs: [
      {
        q: "Can I cancel at any time?",
        a: "Yes, you can cancel monthly. You start with 1 free job posting for 30 days — then choose a paid plan.",
      },
      {
        q: "What exactly is AI matching?",
        a: "VorzaIQ automatically analyses every applicant's CV and provides a match score (0–100) based on the job description. You instantly see who fits best.",
      },
      {
        q: "Which payment methods do you accept?",
        a: "We accept credit card and SEPA direct debit via Stripe. All payments are secure.",
      },
      {
        q: "What if I need more job postings than my plan allows?",
        a: "You can buy individual job postings for €89 each (30 days active, including AI matching), or upgrade to a higher plan.",
      },
    ],
    contactText: "Questions about a subscription?",
    contactLink: "Contact us",
  },
  common: {
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    back: "Back",
    next: "Next",
    submit: "Submit",
    close: "Close",
    error: "Something went wrong",
    success: "Success!",
    yes: "Yes",
    no: "No",
    or: "or",
  },
  candidate: {
    dashboard: "My dashboard",
    myApplications: "My applications",
    myCV: "My CV",
    myProfile: "My profile",
    noApplications: "No applications yet",
    noApplicationsSub: "Find jobs that match your profile and apply directly.",
    browseJobs: "Browse jobs",
    statusPending: "Pending",
    statusReview: "Under review",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    statusInterview: "Interview scheduled",
    statusOffer: "Offer received",
    aiScore: "AI Match score",
    aiAnalysis: "AI Analysis",
    chatWithLisa: "Chat with Lisa",
    uploadCV: "Upload your CV",
    uploadCVSub: "Automatically receive AI matches for every job.",
    matchScore: "Match score",
    viewDetail: "View details",
    appliedOn: "Applied on",
    interviewScheduled: "Interview scheduled",
    logout: "Log out",
    profileComplete: "Profile complete",
    profileIncompleteSub: "Upload your CV to improve your chances.",
  },
  employer: {
    dashboard: "Dashboard",
    myVacancies: "My jobs",
    applicants: "Applicants",
    analytics: "Analytics",
    newVacancy: "New job",
    statusActive: "Active",
    statusPaused: "Paused",
    statusClosed: "Closed",
    postJob: "Post job",
    editVacancy: "Edit",
    deleteVacancy: "Delete",
    viewApplicants: "View applicants",
    noVacancies: "No jobs posted yet",
    noApplicants: "No applicants yet",
    logout: "Log out",
    intakeQuestions: "Intake questions",
    settings: "Settings",
  },
  terms: {
    title: "Terms and Conditions",
    lastUpdated: "Last updated: July 2026",
    sections: [
      { title: "1. Who we are", content: "These terms apply to the use of the VorzaIQ platform (vorzaiq.com), offered by:\n\nVorzaIQ\nZeeland, The Netherlands\nChamber of Commerce: 78546338\nEmail: info@vorzaiq.com" },
      { title: "2. The service", content: "VorzaIQ is an AI-powered recruitment platform. Employers can post vacancies and have candidates pre-screened by our AI recruiter \"Lisa\". Candidates can create a profile for free, match their CV with vacancies, and apply." },
      { title: "3. Accounts", content: "", items: ["You are responsible for the accuracy of your account information and for keeping your login credentials confidential.", "You may not use the platform for unlawful purposes, including posting misleading vacancies or discriminatory job requirements.", "We may suspend or terminate accounts in case of misuse or violation of these terms."] },
      { title: "4. Subscriptions and pricing (employers)", content: "", items: ["VorzaIQ offers the Starter, Growth, and Scale plans, as well as pay-per-vacancy. Current pricing is available at vorzaiq.com/abonnementen.", "Subscriptions are entered into on a monthly basis and are tacitly renewed each month unless cancelled in time.", "Cancellation is possible at any time via your account settings or by email, with a notice period of no more than one month.", "Price changes will be announced at least 30 days in advance. In case of a price increase, you have the right to cancel as of the effective date.", "With a free trial period, the paid subscription only starts after the trial period ends. We will send a reminder by email no later than three days before the end of the trial period. You can cancel free of charge during the trial period; nothing will be charged."] },
      { title: "5. Right of withdrawal", content: "If you take out a subscription as a consumer, you have the right to cancel the agreement within 14 days without giving reasons. If you request the service to start immediately, you owe a proportionate fee for the period in which the service was already provided.\n\nFor business customers, no right of withdrawal applies." },
      { title: "6. Payment", content: "Payment is processed through our payment service provider. Invoices are provided digitally. In case of non-payment, we may suspend access to the platform after sending a payment reminder." },
      { title: "7. Use of AI", content: "", items: ["The screening interviews on VorzaIQ are conducted by an AI system. This is clearly communicated to the candidate before each interview.", "AI outcomes (match scores, interview reports, summaries) are tools to support the recruitment process. They do not constitute an independent hiring decision.", "The employer is required to always have decisions about candidates made by a human and to critically evaluate the AI outcomes. The employer may not reject candidates solely based on an automated outcome.", "The employer warrants that job requirements and selection criteria do not violate equal treatment legislation."] },
      { title: "8. Personal data and processor role", content: "", items: ["For candidate data that reaches an employer through the platform, the employer is the data controller under the GDPR.", "Insofar as VorzaIQ processes personal data on behalf of the employer, VorzaIQ acts as a data processor. A data processing agreement can be concluded upon request.", "Our privacy policy applies to the processing of personal data by VorzaIQ as controller."] },
      { title: "9. Availability and maintenance", content: "We strive for the highest possible availability of the platform but do not guarantee uninterrupted operation. We announce planned maintenance in advance where possible." },
      { title: "10. Intellectual property", content: "All rights to the platform, software, AI models, and content of VorzaIQ belong to VorzaIQ or its licensors. Employers retain the rights to their own vacancy texts and company materials; candidates retain the rights to their own CV." },
      { title: "11. Liability", content: "", items: ["VorzaIQ endeavours to provide accurate match results and interview reports but does not guarantee that these are error-free or complete.", "VorzaIQ is not liable for hiring decisions made by employers or for the content of vacancies and CVs posted by users.", "VorzaIQ's total liability per event is limited to the amount the employer paid to VorzaIQ in the three months prior to the event. This limitation does not apply in cases of intent or deliberate recklessness by VorzaIQ, or insofar as the law does not permit limitation.", "For candidates, use of the platform is free of charge; liability towards candidates is limited to what mandatory law prescribes."] },
      { title: "12. Changes to these terms", content: "We may amend these terms. Changes will be announced at least 30 days before they take effect via email or the platform. If you disagree with a change, you may cancel your subscription as of the effective date." },
      { title: "13. Applicable law and disputes", content: "These terms are governed by Dutch law. Disputes will be submitted to the competent court in the district where VorzaIQ is established, unless mandatory law dictates otherwise." },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: July 2026",
    dataTable: [
      { purpose: "Matching candidates with vacancies", basis: "Performance of contract" },
      { purpose: "Conducting AI screening interviews", basis: "Performance of contract" },
      { purpose: "Sharing your profile and interview results with the employer you applied to", basis: "Performance of contract" },
      { purpose: "Invoicing and administration", basis: "Legal obligation" },
      { purpose: "Platform security", basis: "Legitimate interest" },
      { purpose: "Service emails about your account or application", basis: "Performance of contract" },
    ],
    sections: [
      { title: "1. Who we are", content: "VorzaIQ is an AI-powered recruitment platform that connects employers and candidates.\n\nData controller:\nVorzaIQ\nZeeland, The Netherlands\nChamber of Commerce: 78546338\nEmail: privacy@vorzaiq.com\n\nFor all questions about this privacy policy or the processing of your personal data, please contact us at the above email address." },
      { title: "2. What data we process", content: "From candidates:", items: ["Name, email address, and phone number", "CV and the information contained therein (work experience, education, skills)", "Answers you give during the screening interview with our AI recruiter Lisa", "Match results between your profile and vacancies", "From employers: company name, contact person, email address and phone number; vacancy texts and job requirements; invoicing and subscription data.", "Technical data: server logs (IP address, timestamp, pages requested) for security and troubleshooting."] },
      { title: "3. Special personal data", content: "We do not ask for special personal data (such as data about health, religion, ethnicity, or political preference) and request that you do not include these in your CV or interviews. A passport photo in your CV is not necessary and we advise against it. If you do share special data, it will not be used in matching or assessment." },
      { title: "4. Why we use your data", content: "We never sell your data to third parties and do not use it for advertising purposes." },
      { title: "5. Automated processing and profiling", content: "VorzaIQ uses AI to analyse your CV, conduct screening interviews, and calculate a match score between your profile and a vacancy. This is a form of profiling under the GDPR.", items: ["The AI match score and interview report are a tool for the employer. The final decision is always made by a human at the employer, not by the AI.", "The match score is based on the alignment between your work experience, education, skills, and the job requirements.", "You have the right to express your point of view, contest the outcome, and request human intervention via privacy@vorzaiq.com or directly with the employer.", "When you have a conversation with Lisa, you are talking to an AI system. This is always clearly indicated."] },
      { title: "6. Who we share data with", content: "Employers: when you apply for a vacancy, we share your profile, CV, and screening interview results with the relevant employer.\n\nProcessors: we engage service providers who process data on our behalf.", items: ["AI service providers (incl. OpenAI) for analysing CVs and conducting interviews. A data processing agreement has been concluded with these parties. Insofar as data is processed outside the European Economic Area, this is done on the basis of appropriate safeguards, such as the EU-US Data Privacy Framework and/or the European Commission's standard contractual clauses. Your data is not used by these parties to train their models.", "Hosting parties within the EU for data storage.", "Payment service providers for subscription payments (employer data only)."] },
      { title: "7. How long we retain data", content: "", items: ["Candidate profiles: as long as your account is active. After deletion, your data is erased within 30 days; backups are overwritten within 90 days.", "Application data: the employer maintains their own retention periods (guideline: 4 weeks after completion, or up to 1 year with consent).", "Employer invoicing data: 7 years, in accordance with tax retention obligations.", "Server logs: maximum 90 days."] },
      { title: "8. Your rights", content: "Under the GDPR, you have the right to:", items: ["Access the data we process about you", "Rectification of incorrect data", "Erasure of your data", "Restriction of processing", "Data portability", "Object to processing based on legitimate interest", "Human intervention in automated processing (see article 5)", "Send your request to privacy@vorzaiq.com. We will respond within one month. For complex requests, this period may be extended by two months; we will inform you in time.", "If you disagree with how we handle your data, you can file a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens, autoriteitpersoonsgegevens.nl)."] },
      { title: "9. Cookies and local storage", content: "VorzaIQ does not use tracking or advertising cookies. We only use functional local storage (localStorage) necessary to keep you logged in and for the platform to work. No consent is required for this." },
      { title: "10. Security", content: "We take appropriate technical and organisational measures to protect your data, including encrypted connections (TLS), encrypted storage, access restriction, and logging." },
      { title: "11. Changes", content: "We may update this privacy policy. For significant changes, we will inform account holders by email. The most current version is always available at vorzaiq.com/privacy." },
    ],
  },
};

// ─── Deutsch ──────────────────────────────────────────────────────────────────

const de: TranslationSet = {
  nav: {
    vacancies: "Jobs",
    candidates: "Kandidaten",
    employers: "Arbeitgeber",
    login: "Anmelden",
  },
  hero: {
    badge: "KI-gestützte Recruitingplattform",
    title: "Finde deinen perfekten Job",
    subtitle: "Lade deinen Lebenslauf hoch und erhalte sofort einen KI-Matchscore für jede Stelle.",
    searchJob: "Berufsbezeichnung oder Stichwort...",
    searchLocation: "Stadt oder Region",
    searchBtn: "Suchen",
    recentJobs: "Aktuelle Stellen",
    viewAll: "Alle Jobs anzeigen",
  },
  jobs: {
    searchPlaceholder: "Funktion, Stichwort oder Unternehmen...",
    locationPlaceholder: "Stadt oder Region...",
    searchBtn: "Suchen",
    filtersBtn: "Filter",
    filters: "Filter",
    clearAll: "Alle löschen",
    datePosted: "Datum der Veröffentlichung",
    today: "Heute",
    last3days: "Letzte 3 Tage",
    lastWeek: "Letzte Woche",
    lastMonth: "Letzter Monat",
    employmentType: "Beschäftigungsart",
    fulltime: "Vollzeit",
    parttime: "Teilzeit",
    freelance: "Freiberuflich",
    zzp: "Freelance / Auftragsarbeit",
    stage: "Praktikum",
    tijdelijk: "Befristet",
    workLocation: "Arbeitsort",
    remote: "Remote",
    hybride: "Hybrid",
    opLocatie: "Vor Ort",
    hoursPerWeek: "Stunden pro Woche",
    salary: "Gehalt (pro Monat)",
    vacancyLanguage: "Stellensprache",
    langNl: "Niederländisch",
    langEn: "Englisch",
    perWeek: "Std/Woche",
    loading: "Laden...",
    found: "gefunden",
    vacancy: "Stelle",
    vacancies: "Stellen",
    allVacancies: "Alle Stellenangebote",
    allVacanciesSub: "Finde deinen nächsten Job mit AI-Matching. Lade deinen Lebenslauf einmal hoch und erhalte sofortige Matches.",
    noResults: "Keine Stellen gefunden",
    noResultsHint: "Passe deine Suche oder Filter an",
    removeFilters: "Alle Filter entfernen",
    applyBtn: "Bewerben",
    profileCta: "Vervollständige dein Profil",
    profileCtaSub: "Lade deinen Lebenslauf hoch und erhalte automatisch KI-Matches.",
    startNow: "Jetzt starten",
    minSalary: "Min",
    maxSalary: "Max",
  },
  page: {
    categories: "Kategorien",
    allCategories: "Alle Kategorien →",
    locationUnknown: "Ort unbekannt",
    ctaTitle: "Bereit loszulegen?",
    ctaSubtitle: "Erstelle ein kostenloses Konto, lade deinen Lebenslauf hoch und erhalte KI-Matches.",
    ctaCreateAccount: "Lebenslauf kostenlos hochladen",
    lisaLabel: "So funktioniert's",
    lisaTitle: "Lerne Lisa kennen",
    lisaSubtitle: "Lade deinen Lebenslauf hoch und höre auf, selbst nach Stellen zu suchen. Klicke in deinem Portal auf 'Meine Matches analysieren' und erhalte die Stellen, die am besten zu deinem Lebenslauf passen. Bewirbst du dich? Dann führt Lisa, unsere KI-Recruiterin, sofort rund um die Uhr das erste Gespräch mit dir.",
  },
  subscription: {
    subscriptionActivated: "Abonnement aktiviert!",
    subscriptionActivatedSub: "Dein Plan wurde aktualisiert. Alle Funktionen sind jetzt verfügbar.",
    freeMonthBadge: "1 Monat kostenlos",
    freeMonthRegNotice: "Erster Monat Growth kostenlos — danach €149/Monat",
    trialTitle: "Erster Monat Growth kostenlos",
    trialSub: "Teste das Growth-Paket komplett kostenlos. Nach dem Gratismonat werden €149/Monat automatisch abgebucht.",
    startFree: "Kostenlos mit Growth starten →",
    transparentPricing: "Transparente Preise",
    title: "Wähle den passenden Plan",
    subtitle: "Von einer Stelle bis unbegrenztem Recruiting — immer inklusive KI-Matching.",
    monthly: "Monatlich",
    yearly: "Jährlich",
    yearDiscount: "−16%",
    perMonth: "/Monat",
    perYear: "/Jahr",
    approxPerMonth: "≈ €{amount}/Monat bei Jahresabrechnung",
    mostPopular: "Beliebtester Plan",
    loading: "Bitte warten...",
    cta: "Jetzt starten →",
    starterFeatures: [
      "1 aktive Stellenanzeige",
      "KI-Matching & Pre-Screening",
      "Kandidatenübersicht Dashboard",
      "Chatbot Lisa (Kandidaten)",
      "E-Mail-Benachrichtigungen",
      "Priorität in Suchergebnissen",
      "Mehrere Stellenanzeigen",
      "Virtuelles Lisa-Video-Interview",
      "Erweiterte Analysen",
      "Dedizierter Support",
    ],
    growthFeatures: [
      "5 aktive Stellenanzeigen",
      "KI-Matching & Pre-Screening",
      "Kandidatenübersicht Dashboard",
      "Chatbot Lisa (Kandidaten)",
      "E-Mail-Benachrichtigungen",
      "Priorität in Suchergebnissen",
      "CRM-Integration",
      "Virtuelles Lisa-Video-Interview",
      "Erweiterte Analysen",
      "Dedizierter Support",
    ],
    scaleFeatures: [
      "Unbegrenzte Stellenanzeigen",
      "KI-Matching & Pre-Screening",
      "Kandidatenübersicht Dashboard",
      "Chatbot Lisa (Kandidaten)",
      "E-Mail-Benachrichtigungen",
      "Priorität in Suchergebnissen",
      "CRM-Integration",
      "Virtuelles Lisa-Video-Interview",
      "Erweiterte Analysen",
      "Dedizierter Support",
    ],
    payPerVacancyLabel: "Pay-per-Stelle",
    payPerVacancyPrice: "€89 pro Stelle",
    payPerVacancyDesc: "30 Tage aktiv · inkl. KI-Matching · kein Abonnement erforderlich",
    postVacancyBtn: "Stelle veröffentlichen →",
    payPerVacancyTags: ["KI Pre-Screening", "Kandidaten-Dashboard", "E-Mail-Benachrichtigungen", "30 Tage sichtbar"],
    whyTitle: "Warum VorzaIQ?",
    whyQuote: "",
    compPlatform: "Plattform",
    compCost: "Kosten",
    compUnit: "Einheit",
    compAiLabel: "KI-Matching",
    youBadge: "Du",
    compRows: [
      { label: "Indeed gesponsert", cost: "€200 – €400", unit: "pro Stellenanzeige" },
      { label: "LinkedIn Jobs", cost: "€210 – €300", unit: "pro Monat (1 Stelle)" },
      { label: "VorzaIQ Starter", cost: "€49", unit: "pro Monat inkl. KI-Matching" },
    ],
    faqTitle: "Häufig gestellte Fragen",
    faqs: [
      {
        q: "Kann ich jederzeit kündigen?",
        a: "Ja, du kannst monatlich kündigen. Du startest mit 1 kostenlosen Stellenanzeige für 30 Tage — danach wählst du einen bezahlten Plan.",
      },
      {
        q: "Was ist KI-Matching genau?",
        a: "VorzaIQ analysiert automatisch den Lebenslauf jedes Bewerbers und gibt einen Matchscore (0–100) basierend auf dem Stellentext. Du siehst sofort, wer am besten passt.",
      },
      {
        q: "Welche Zahlungsmethoden akzeptiert ihr?",
        a: "Wir akzeptieren Kreditkarte und SEPA-Lastschrift über Stripe. Alle Zahlungen sind sicher.",
      },
      {
        q: "Was, wenn ich mehr Stellen benötige als mein Plan erlaubt?",
        a: "Du kannst einzelne Stellenanzeigen für €89 pro Stück kaufen (30 Tage aktiv, inkl. KI-Matching) oder auf einen höheren Plan upgraden.",
      },
    ],
    contactText: "Fragen zu einem Abonnement?",
    contactLink: "Kontakt aufnehmen",
  },
  common: {
    loading: "Laden...",
    save: "Speichern",
    cancel: "Abbrechen",
    back: "Zurück",
    next: "Weiter",
    submit: "Absenden",
    close: "Schließen",
    error: "Etwas ist schiefgelaufen",
    success: "Erfolgreich!",
    yes: "Ja",
    no: "Nein",
    or: "oder",
  },
  candidate: {
    dashboard: "Mein Dashboard",
    myApplications: "Meine Bewerbungen",
    myCV: "Mein Lebenslauf",
    myProfile: "Mein Profil",
    noApplications: "Noch keine Bewerbungen",
    noApplicationsSub: "Finde passende Jobs und bewirb dich direkt.",
    browseJobs: "Jobs durchsuchen",
    statusPending: "Ausstehend",
    statusReview: "In Prüfung",
    statusApproved: "Angenommen",
    statusRejected: "Abgelehnt",
    statusInterview: "Interview geplant",
    statusOffer: "Angebot erhalten",
    aiScore: "KI-Matchscore",
    aiAnalysis: "KI-Analyse",
    chatWithLisa: "Chat mit Lisa",
    uploadCV: "Lebenslauf hochladen",
    uploadCVSub: "Erhalte automatisch KI-Matches für jeden Job.",
    matchScore: "Matchscore",
    viewDetail: "Details anzeigen",
    appliedOn: "Beworben am",
    interviewScheduled: "Interview geplant",
    logout: "Abmelden",
    profileComplete: "Profil vollständig",
    profileIncompleteSub: "Lade deinen Lebenslauf hoch, um deine Chancen zu verbessern.",
  },
  employer: {
    dashboard: "Dashboard",
    myVacancies: "Meine Stellen",
    applicants: "Bewerber",
    analytics: "Analysen",
    newVacancy: "Neue Stelle",
    statusActive: "Aktiv",
    statusPaused: "Pausiert",
    statusClosed: "Geschlossen",
    postJob: "Stelle veröffentlichen",
    editVacancy: "Bearbeiten",
    deleteVacancy: "Löschen",
    viewApplicants: "Bewerber anzeigen",
    noVacancies: "Noch keine Stellen veröffentlicht",
    noApplicants: "Noch keine Bewerber",
    logout: "Abmelden",
    intakeQuestions: "Intake-Fragen",
    settings: "Einstellungen",
  },
  terms: en.terms,
  privacy: en.privacy,
};

// ─── Français ─────────────────────────────────────────────────────────────────

const fr: TranslationSet = {
  nav: {
    vacancies: "Emplois",
    candidates: "Candidats",
    employers: "Employeurs",
    login: "Connexion",
  },
  hero: {
    badge: "Plateforme de recrutement IA",
    title: "Trouvez votre emploi idéal",
    subtitle: "Téléchargez votre CV et recevez instantanément un score de correspondance IA pour chaque offre.",
    searchJob: "Titre du poste ou mot-clé...",
    searchLocation: "Ville ou région",
    searchBtn: "Rechercher",
    recentJobs: "Offres récentes",
    viewAll: "Voir toutes les offres",
  },
  jobs: {
    searchPlaceholder: "Fonction, mot-clé ou entreprise...",
    locationPlaceholder: "Ville ou région...",
    searchBtn: "Rechercher",
    filtersBtn: "Filtres",
    filters: "Filtres",
    clearAll: "Tout effacer",
    datePosted: "Date de publication",
    today: "Aujourd'hui",
    last3days: "3 derniers jours",
    lastWeek: "Semaine dernière",
    lastMonth: "Mois dernier",
    employmentType: "Type de contrat",
    fulltime: "Temps plein",
    parttime: "Temps partiel",
    freelance: "Freelance",
    zzp: "Freelance / Mission",
    stage: "Stage",
    tijdelijk: "Temporaire",
    workLocation: "Lieu de travail",
    remote: "Télétravail",
    hybride: "Hybride",
    opLocatie: "Sur site",
    hoursPerWeek: "Heures par semaine",
    salary: "Salaire (par mois)",
    vacancyLanguage: "Langue de l'offre",
    langNl: "Néerlandais",
    langEn: "Anglais",
    perWeek: "h/sem",
    loading: "Chargement...",
    found: "trouvé(s)",
    vacancy: "offre",
    vacancies: "offres",
    allVacancies: "Toutes les offres",
    allVacanciesSub: "Trouvez votre prochain emploi avec le matching IA. Uploadez votre CV une fois et obtenez des matches instantanés.",
    noResults: "Aucune offre trouvée",
    noResultsHint: "Ajustez votre recherche ou vos filtres",
    removeFilters: "Supprimer tous les filtres",
    applyBtn: "Postuler",
    profileCta: "Complétez votre profil",
    profileCtaSub: "Téléchargez votre CV et recevez automatiquement des correspondances IA.",
    startNow: "Commencer",
    minSalary: "Min",
    maxSalary: "Max",
  },
  page: {
    categories: "Catégories",
    allCategories: "Toutes les catégories →",
    locationUnknown: "Lieu inconnu",
    ctaTitle: "Prêt à commencer ?",
    ctaSubtitle: "Créez un compte gratuit, téléchargez votre CV et recevez des correspondances IA personnalisées.",
    ctaCreateAccount: "Téléchargez votre CV gratuitement",
    lisaLabel: "Comment ça marche",
    lisaTitle: "Découvrez Lisa",
    lisaSubtitle: "Téléchargez votre CV et arrêtez de chercher des offres vous-même. Cliquez sur 'Analyser mes correspondances' dans votre portail et recevez les postes qui correspondent le mieux à votre CV. Vous postulez ? Alors Lisa, notre recruteuse IA, mène immédiatement le premier entretien avec vous, 24h/24.",
  },
  subscription: {
    subscriptionActivated: "Abonnement activé !",
    subscriptionActivatedSub: "Votre plan a été mis à jour. Toutes les fonctionnalités sont maintenant disponibles.",
    freeMonthBadge: "1 mois gratuit",
    freeMonthRegNotice: "Premier mois Growth gratuit — puis €149/mois",
    trialTitle: "Premier mois Growth gratuit",
    trialSub: "Essayez le plan Growth entièrement gratuit. Après le mois gratuit, €149/mois est facturé automatiquement.",
    startFree: "Commencer gratuitement avec Growth →",
    transparentPricing: "Tarifs transparents",
    title: "Choisissez le plan qui vous convient",
    subtitle: "D'une offre à un recrutement illimité — toujours avec la correspondance IA.",
    monthly: "Mensuel",
    yearly: "Annuel",
    yearDiscount: "−16%",
    perMonth: "/mois",
    perYear: "/an",
    approxPerMonth: "≈ €{amount}/mois avec facturation annuelle",
    mostPopular: "Le plus populaire",
    loading: "Chargement...",
    cta: "Commencer →",
    starterFeatures: [
      "1 offre d'emploi active",
      "Correspondance IA & présélection",
      "Tableau de bord des candidats",
      "Chatbot Lisa (candidats)",
      "Notifications par e-mail",
      "Priorité dans les résultats",
      "Plusieurs offres d'emploi",
      "Interview vidéo Lisa virtuelle",
      "Analyses avancées",
      "Support dédié",
    ],
    growthFeatures: [
      "5 offres d'emploi actives",
      "Correspondance IA & présélection",
      "Tableau de bord des candidats",
      "Chatbot Lisa (candidats)",
      "Notifications par e-mail",
      "Priorité dans les résultats",
      "Intégration CRM",
      "Interview vidéo Lisa virtuelle",
      "Analyses avancées",
      "Support dédié",
    ],
    scaleFeatures: [
      "Offres d'emploi illimitées",
      "Correspondance IA & présélection",
      "Tableau de bord des candidats",
      "Chatbot Lisa (candidats)",
      "Notifications par e-mail",
      "Priorité dans les résultats",
      "Intégration CRM",
      "Interview vidéo Lisa virtuelle",
      "Analyses avancées",
      "Support dédié",
    ],
    payPerVacancyLabel: "Pay-par-offre",
    payPerVacancyPrice: "€89 par offre",
    payPerVacancyDesc: "30 jours actif · correspondance IA incluse · sans abonnement",
    postVacancyBtn: "Publier l'offre →",
    payPerVacancyTags: ["Présélection IA", "Tableau de bord", "Notifications e-mail", "30 jours visible"],
    whyTitle: "Pourquoi VorzaIQ ?",
    whyQuote: "",
    compPlatform: "Plateforme",
    compCost: "Coût",
    compUnit: "Unité",
    compAiLabel: "Correspondance IA",
    youBadge: "Vous",
    compRows: [
      { label: "Indeed sponsorisé", cost: "€200 – €400", unit: "par offre" },
      { label: "LinkedIn Jobs", cost: "€210 – €300", unit: "par mois (1 offre)" },
      { label: "VorzaIQ Starter", cost: "€49", unit: "par mois avec IA" },
    ],
    faqTitle: "Questions fréquentes",
    faqs: [
      {
        q: "Puis-je annuler à tout moment ?",
        a: "Oui, vous pouvez annuler mensuellement. Vous commencez avec 1 offre gratuite pendant 30 jours — puis choisissez un plan payant.",
      },
      {
        q: "Qu'est-ce que la correspondance IA exactement ?",
        a: "VorzaIQ analyse automatiquement le CV de chaque candidat et attribue un score (0–100) basé sur la description du poste. Vous voyez immédiatement qui correspond le mieux.",
      },
      {
        q: "Quels modes de paiement acceptez-vous ?",
        a: "Nous acceptons la carte bancaire et le prélèvement SEPA via Stripe. Tous les paiements sont sécurisés.",
      },
      {
        q: "Que faire si j'ai besoin de plus d'offres que mon plan ?",
        a: "Vous pouvez acheter des offres individuelles à €89 pièce (30 jours actif, avec IA), ou passer à un plan supérieur.",
      },
    ],
    contactText: "Des questions sur un abonnement ?",
    contactLink: "Nous contacter",
  },
  common: {
    loading: "Chargement...",
    save: "Enregistrer",
    cancel: "Annuler",
    back: "Retour",
    next: "Suivant",
    submit: "Envoyer",
    close: "Fermer",
    error: "Une erreur s'est produite",
    success: "Succès !",
    yes: "Oui",
    no: "Non",
    or: "ou",
  },
  candidate: {
    dashboard: "Mon tableau de bord",
    myApplications: "Mes candidatures",
    myCV: "Mon CV",
    myProfile: "Mon profil",
    noApplications: "Aucune candidature pour l'instant",
    noApplicationsSub: "Trouvez des offres correspondant à votre profil et postulez directement.",
    browseJobs: "Parcourir les offres",
    statusPending: "En attente",
    statusReview: "En cours d'examen",
    statusApproved: "Approuvé",
    statusRejected: "Refusé",
    statusInterview: "Entretien planifié",
    statusOffer: "Offre reçue",
    aiScore: "Score IA",
    aiAnalysis: "Analyse IA",
    chatWithLisa: "Discuter avec Lisa",
    uploadCV: "Télécharger votre CV",
    uploadCVSub: "Recevez automatiquement des correspondances IA pour chaque offre.",
    matchScore: "Score de correspondance",
    viewDetail: "Voir les détails",
    appliedOn: "Candidature le",
    interviewScheduled: "Entretien planifié",
    logout: "Déconnexion",
    profileComplete: "Profil complet",
    profileIncompleteSub: "Téléchargez votre CV pour améliorer vos chances.",
  },
  employer: {
    dashboard: "Tableau de bord",
    myVacancies: "Mes offres",
    applicants: "Candidats",
    analytics: "Analyses",
    newVacancy: "Nouvelle offre",
    statusActive: "Actif",
    statusPaused: "En pause",
    statusClosed: "Fermé",
    postJob: "Publier une offre",
    editVacancy: "Modifier",
    deleteVacancy: "Supprimer",
    viewApplicants: "Voir les candidats",
    noVacancies: "Aucune offre publiée",
    noApplicants: "Aucun candidat pour l'instant",
    logout: "Déconnexion",
    intakeQuestions: "Questions d'intake",
    settings: "Paramètres",
  },
  terms: en.terms,
  privacy: en.privacy,
};

// ─── Español ──────────────────────────────────────────────────────────────────

const es: TranslationSet = {
  nav: {
    vacancies: "Empleos",
    candidates: "Candidatos",
    employers: "Empleadores",
    login: "Iniciar sesión",
  },
  hero: {
    badge: "Plataforma de reclutamiento con IA",
    title: "Encuentra tu empleo perfecto",
    subtitle: "Sube tu CV y recibe al instante una puntuación de coincidencia IA para cada oferta.",
    searchJob: "Título del puesto o palabra clave...",
    searchLocation: "Ciudad o región",
    searchBtn: "Buscar",
    recentJobs: "Empleos recientes",
    viewAll: "Ver todos los empleos",
  },
  jobs: {
    searchPlaceholder: "Función, palabra clave o empresa...",
    locationPlaceholder: "Ciudad o región...",
    searchBtn: "Buscar",
    filtersBtn: "Filtros",
    filters: "Filtros",
    clearAll: "Borrar todo",
    datePosted: "Fecha de publicación",
    today: "Hoy",
    last3days: "Últimos 3 días",
    lastWeek: "Última semana",
    lastMonth: "Último mes",
    employmentType: "Tipo de contrato",
    fulltime: "Tiempo completo",
    parttime: "Tiempo parcial",
    freelance: "Freelance",
    zzp: "Freelance / Proyecto",
    stage: "Prácticas",
    tijdelijk: "Temporal",
    workLocation: "Lugar de trabajo",
    remote: "Remoto",
    hybride: "Híbrido",
    opLocatie: "Presencial",
    hoursPerWeek: "Horas por semana",
    salary: "Salario (por mes)",
    vacancyLanguage: "Idioma de la oferta",
    langNl: "Neerlandés",
    langEn: "Inglés",
    perWeek: "h/sem",
    loading: "Cargando...",
    found: "encontrado(s)",
    vacancy: "empleo",
    vacancies: "empleos",
    allVacancies: "Todas las ofertas",
    allVacanciesSub: "Encuentra tu próximo empleo con matching IA. Sube tu CV una vez y obtén matches instantáneos.",
    noResults: "No se encontraron empleos",
    noResultsHint: "Ajusta tu búsqueda o filtros",
    removeFilters: "Eliminar todos los filtros",
    applyBtn: "Postularse",
    profileCta: "Completa tu perfil",
    profileCtaSub: "Sube tu CV y recibe automáticamente coincidencias IA.",
    startNow: "Empezar ahora",
    minSalary: "Mín",
    maxSalary: "Máx",
  },
  page: {
    categories: "Categorías",
    allCategories: "Todas las categorías →",
    locationUnknown: "Ubicación desconocida",
    ctaTitle: "¿Listo para empezar?",
    ctaSubtitle: "Crea una cuenta gratis, sube tu CV y recibe coincidencias IA personalizadas.",
    ctaCreateAccount: "Sube tu CV gratis",
    lisaLabel: "Cómo funciona",
    lisaTitle: "Conoce a Lisa",
    lisaSubtitle: "Sube tu CV y deja de buscar vacantes tú mismo. Haz clic en 'Analizar mis coincidencias' en tu portal y recibe las vacantes que mejor se adapten a tu CV. ¿Te postulas? Entonces Lisa, nuestra reclutadora IA, realiza la primera entrevista contigo de inmediato, las 24 horas.",
  },
  subscription: {
    subscriptionActivated: "¡Suscripción activada!",
    subscriptionActivatedSub: "Tu plan ha sido actualizado. Todas las funciones están disponibles.",
    freeMonthBadge: "1 mes gratis",
    freeMonthRegNotice: "Primer mes Growth gratis — después €149/mes",
    trialTitle: "Primer mes Growth gratis",
    trialSub: "Prueba el plan Growth completamente gratis. Después del mes gratuito, se cobra €149/mes automáticamente.",
    startFree: "Empezar gratis con Growth →",
    transparentPricing: "Precios transparentes",
    title: "Elige el plan que más te conviene",
    subtitle: "Desde una oferta hasta reclutamiento ilimitado — siempre con coincidencia IA.",
    monthly: "Mensual",
    yearly: "Anual",
    yearDiscount: "−16%",
    perMonth: "/mes",
    perYear: "/año",
    approxPerMonth: "≈ €{amount}/mes con facturación anual",
    mostPopular: "Más popular",
    loading: "Cargando...",
    cta: "Empezar →",
    starterFeatures: [
      "1 oferta de empleo activa",
      "Coincidencia IA & preselección",
      "Panel de candidatos",
      "Chatbot Lisa (candidatos)",
      "Notificaciones por correo",
      "Prioridad en resultados",
      "Múltiples ofertas",
      "Entrevista de video Lisa virtual",
      "Análisis avanzados",
      "Soporte dedicado",
    ],
    growthFeatures: [
      "5 ofertas de empleo activas",
      "Coincidencia IA & preselección",
      "Panel de candidatos",
      "Chatbot Lisa (candidatos)",
      "Notificaciones por correo",
      "Prioridad en resultados",
      "Integración CRM",
      "Entrevista de video Lisa virtual",
      "Análisis avanzados",
      "Soporte dedicado",
    ],
    scaleFeatures: [
      "Ofertas ilimitadas",
      "Coincidencia IA & preselección",
      "Panel de candidatos",
      "Chatbot Lisa (candidatos)",
      "Notificaciones por correo",
      "Prioridad en resultados",
      "Integración CRM",
      "Entrevista de video Lisa virtual",
      "Análisis avanzados",
      "Soporte dedicado",
    ],
    payPerVacancyLabel: "Pago por oferta",
    payPerVacancyPrice: "€89 por oferta",
    payPerVacancyDesc: "30 días activo · con coincidencia IA · sin suscripción",
    postVacancyBtn: "Publicar oferta →",
    payPerVacancyTags: ["Preselección IA", "Panel de candidatos", "Notificaciones email", "30 días visible"],
    whyTitle: "¿Por qué VorzaIQ?",
    whyQuote: "",
    compPlatform: "Plataforma",
    compCost: "Coste",
    compUnit: "Unidad",
    compAiLabel: "Coincidencia IA",
    youBadge: "Tú",
    compRows: [
      { label: "Indeed patrocinado", cost: "€200 – €400", unit: "por oferta" },
      { label: "LinkedIn Jobs", cost: "€210 – €300", unit: "por mes (1 oferta)" },
      { label: "VorzaIQ Starter", cost: "€49", unit: "por mes con IA" },
    ],
    faqTitle: "Preguntas frecuentes",
    faqs: [
      {
        q: "¿Puedo cancelar en cualquier momento?",
        a: "Sí, puedes cancelar mensualmente. Empiezas con 1 oferta gratuita durante 30 días — luego eliges un plan de pago.",
      },
      {
        q: "¿Qué es exactamente la coincidencia IA?",
        a: "VorzaIQ analiza automáticamente el CV de cada candidato y da una puntuación (0–100) basada en la descripción del puesto. Ves al instante quién encaja mejor.",
      },
      {
        q: "¿Qué métodos de pago aceptáis?",
        a: "Aceptamos tarjeta de crédito y débito SEPA a través de Stripe. Todos los pagos son seguros.",
      },
      {
        q: "¿Qué pasa si necesito más ofertas de las que permite mi plan?",
        a: "Puedes comprar ofertas individuales a €89 cada una (30 días activo, con IA), o actualizar a un plan superior.",
      },
    ],
    contactText: "¿Preguntas sobre una suscripción?",
    contactLink: "Contáctanos",
  },
  common: {
    loading: "Cargando...",
    save: "Guardar",
    cancel: "Cancelar",
    back: "Atrás",
    next: "Siguiente",
    submit: "Enviar",
    close: "Cerrar",
    error: "Algo ha ido mal",
    success: "¡Éxito!",
    yes: "Sí",
    no: "No",
    or: "o",
  },
  candidate: {
    dashboard: "Mi panel",
    myApplications: "Mis candidaturas",
    myCV: "Mi CV",
    myProfile: "Mi perfil",
    noApplications: "Aún no hay candidaturas",
    noApplicationsSub: "Encuentra empleos que se adapten a tu perfil y postúlate directamente.",
    browseJobs: "Ver empleos",
    statusPending: "Pendiente",
    statusReview: "En revisión",
    statusApproved: "Aprobado",
    statusRejected: "Rechazado",
    statusInterview: "Entrevista programada",
    statusOffer: "Oferta recibida",
    aiScore: "Puntuación IA",
    aiAnalysis: "Análisis IA",
    chatWithLisa: "Chatear con Lisa",
    uploadCV: "Sube tu CV",
    uploadCVSub: "Recibe automáticamente coincidencias IA para cada oferta.",
    matchScore: "Puntuación de coincidencia",
    viewDetail: "Ver detalles",
    appliedOn: "Aplicado el",
    interviewScheduled: "Entrevista programada",
    logout: "Cerrar sesión",
    profileComplete: "Perfil completo",
    profileIncompleteSub: "Sube tu CV para mejorar tus posibilidades.",
  },
  employer: {
    dashboard: "Panel",
    myVacancies: "Mis ofertas",
    applicants: "Candidatos",
    analytics: "Análisis",
    newVacancy: "Nueva oferta",
    statusActive: "Activo",
    statusPaused: "Pausado",
    statusClosed: "Cerrado",
    postJob: "Publicar oferta",
    editVacancy: "Editar",
    deleteVacancy: "Eliminar",
    viewApplicants: "Ver candidatos",
    noVacancies: "Aún no hay ofertas publicadas",
    noApplicants: "Aún no hay candidatos",
    logout: "Cerrar sesión",
    intakeQuestions: "Preguntas de intake",
    settings: "Configuración",
  },
  terms: en.terms,
  privacy: en.privacy,
};

export const translations: Record<Lang, TranslationSet> = { nl, en, de, fr, es };
