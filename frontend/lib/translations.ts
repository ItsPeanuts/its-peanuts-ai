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
    statsJobs: string;
    statsCompanies: string;
    statsCandidates: string;
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
    ctaCreateAccount: "Maak account aan",
    statsJobs: "vacatures",
    statsCompanies: "bedrijven",
    statsCandidates: "kandidaten",
  },
  subscription: {
    subscriptionActivated: "Abonnement geactiveerd!",
    subscriptionActivatedSub: "Je plan is bijgewerkt. Alle features zijn nu beschikbaar.",
    freeMonthBadge: "1 maand gratis",
    freeMonthRegNotice: "Eerste maand gratis — geen creditcard nodig",
    trialTitle: "Probeer gratis — 1 vacature, 30 dagen",
    trialSub: "Start vandaag en ontdek hoe AI jouw werving versnelt. Geen creditcard nodig.",
    startFree: "Gratis starten →",
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
    whyQuote: "\"Bij Indeed betaal je voor klikken. Bij VorzaIQ betaal je voor matches.\"",
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
    ctaCreateAccount: "Create account",
    statsJobs: "jobs",
    statsCompanies: "companies",
    statsCandidates: "candidates",
  },
  subscription: {
    subscriptionActivated: "Subscription activated!",
    subscriptionActivatedSub: "Your plan has been updated. All features are now available.",
    freeMonthBadge: "1 month free",
    freeMonthRegNotice: "First month free — no credit card required",
    trialTitle: "Try for free — 1 job, 30 days",
    trialSub: "Start today and discover how AI accelerates your recruitment. No credit card needed.",
    startFree: "Start for free →",
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
    whyQuote: "\"On Indeed you pay for clicks. On VorzaIQ you pay for matches.\"",
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
    ctaCreateAccount: "Konto erstellen",
    statsJobs: "Stellen",
    statsCompanies: "Unternehmen",
    statsCandidates: "Kandidaten",
  },
  subscription: {
    subscriptionActivated: "Abonnement aktiviert!",
    subscriptionActivatedSub: "Dein Plan wurde aktualisiert. Alle Funktionen sind jetzt verfügbar.",
    freeMonthBadge: "1 Monat kostenlos",
    freeMonthRegNotice: "Erster Monat kostenlos — keine Kreditkarte erforderlich",
    trialTitle: "Kostenlos testen — 1 Stelle, 30 Tage",
    trialSub: "Starte heute und entdecke, wie KI dein Recruiting beschleunigt. Keine Kreditkarte erforderlich.",
    startFree: "Kostenlos starten →",
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
    whyQuote: "\"Bei Indeed zahlst du für Klicks. Bei VorzaIQ zahlst du für Matches.\"",
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
    ctaCreateAccount: "Créer un compte",
    statsJobs: "offres",
    statsCompanies: "entreprises",
    statsCandidates: "candidats",
  },
  subscription: {
    subscriptionActivated: "Abonnement activé !",
    subscriptionActivatedSub: "Votre plan a été mis à jour. Toutes les fonctionnalités sont maintenant disponibles.",
    freeMonthBadge: "1 mois gratuit",
    freeMonthRegNotice: "Premier mois gratuit — sans carte bancaire",
    trialTitle: "Essai gratuit — 1 offre, 30 jours",
    trialSub: "Commencez aujourd'hui et découvrez comment l'IA accélère votre recrutement. Sans carte bancaire.",
    startFree: "Commencer gratuitement →",
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
    whyQuote: "\"Sur Indeed, vous payez pour des clics. Sur VorzaIQ, vous payez pour des correspondances.\"",
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
    ctaCreateAccount: "Crear cuenta",
    statsJobs: "empleos",
    statsCompanies: "empresas",
    statsCandidates: "candidatos",
  },
  subscription: {
    subscriptionActivated: "¡Suscripción activada!",
    subscriptionActivatedSub: "Tu plan ha sido actualizado. Todas las funciones están disponibles.",
    freeMonthBadge: "1 mes gratis",
    freeMonthRegNotice: "Primer mes gratis — sin tarjeta de crédito",
    trialTitle: "Prueba gratis — 1 empleo, 30 días",
    trialSub: "Empieza hoy y descubre cómo la IA acelera tu reclutamiento. Sin tarjeta de crédito.",
    startFree: "Empezar gratis →",
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
    whyQuote: "\"En Indeed pagas por clics. En VorzaIQ pagas por coincidencias.\"",
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
};

export const translations: Record<Lang, TranslationSet> = { nl, en, de, fr, es };
