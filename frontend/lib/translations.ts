export type Lang = "nl" | "en";

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
};

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
};

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
};

export const translations: Record<Lang, TranslationSet> = { nl, en };
