const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-backend.onrender.com";

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export async function login(email: string, password: string) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Login failed");
  return data as { access_token: string; token_type: string };
}

export async function me(token: string) {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Auth/me failed");
  return data as {
    id: number;
    email: string;
    full_name: string;
    role: "candidate" | "employer" | "admin";
    plan?: string | null;
  };
}

export async function listCandidateVacancies(token: string) {
  const res = await fetch(`${BASE}/candidate/vacancies`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Vacancies failed");
  return data as any[];
}

export async function uploadCV(token: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${BASE}/candidate/cv`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "CV upload failed");
  return data;
}

export async function analyzeVacancy(token: string, vacancyId: number) {
  const res = await fetch(`${BASE}/candidate/analyze/${vacancyId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });

  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Analyze failed");
  return data as {
    match_score: number;
    summary: string;
    strengths: string;
    gaps: string;
    suggested_questions: string;
  };
}

// ----------------------------
// Employer endpoints
// ----------------------------

export async function employerVacancies(token: string) {
  const res = await fetch(`${BASE}/employer/vacancies`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Vacancies load failed");
  return data as any[];
}

export async function createVacancy(
  token: string,
  payload: {
    title: string;
    location?: string;
    hours_per_week?: string;
    salary_range?: string;
    description?: string;
    interview_type?: string;
    employment_type?: string;
    work_location?: string;
  }
) {
  const res = await fetch(`${BASE}/employer/vacancies`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Create vacancy failed");
  return data;
}

// ----------------------------
// Publieke vacature types
// ----------------------------

export type PublicVacancy = {
  id: number;
  title: string;
  location: string | null;
  hours_per_week: string | null;
  salary_range: string | null;
  description: string | null;
  employment_type: string | null;
  work_location: string | null;
  language: string | null;
  created_at: string;
};

export type IntakeQuestion = {
  id: number;
  qtype: string;
  question: string;
  options_json: string | null;
};

export type PublicVacancyDetail = PublicVacancy & {
  intake_questions: IntakeQuestion[];
  interview_type: string;   // "chat" | "virtual" | "both"
  employer_plan: string;    // "gratis" | "normaal" | "premium"
};

// ----------------------------
// Publieke vacature endpoints
// ----------------------------

export async function listVacancies(params?: {
  q?: string;
  location?: string;
  employment_type?: string;
  work_location?: string;
  date_posted?: string;
  language?: string;
  skip?: number;
  limit?: number;
}): Promise<PublicVacancy[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.location) sp.set("location", params.location);
  if (params?.employment_type) sp.set("employment_type", params.employment_type);
  if (params?.work_location) sp.set("work_location", params.work_location);
  if (params?.language) sp.set("language", params.language);
  if (params?.date_posted) sp.set("date_posted", params.date_posted);
  if (params?.skip != null) sp.set("skip", String(params.skip));
  if (params?.limit != null) sp.set("limit", String(params.limit));
  const url = `${BASE}/vacancies${sp.size ? "?" + sp.toString() : ""}`;

  const res = await fetch(url);
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Kon vacatures niet laden");
  return data as PublicVacancy[];
}

export async function getVacancy(id: number): Promise<PublicVacancyDetail> {
  const res = await fetch(`${BASE}/vacancies/${id}`);
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Vacature niet gevonden");
  return data as PublicVacancyDetail;
}

export async function applyToVacancy(vacancyId: number, formData: FormData) {
  const res = await fetch(`${BASE}/vacancies/${vacancyId}/apply`, {
    method: "POST",
    body: formData,
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Sollicitatie mislukt");
  return data as {
    application_id: number;
    match_score: number;
    explanation: string;
    access_token: string;
    token_type: string;
  };
}

export async function applyToVacancyAuthenticated(
  token: string,
  vacancyId: number,
  payload: { motivation_letter?: string; intake_answers_json?: string }
) {
  const fd = new FormData();
  if (payload.motivation_letter) fd.append("motivation_letter", payload.motivation_letter);
  fd.append("intake_answers_json", payload.intake_answers_json ?? "[]");

  const res = await fetch(`${BASE}/vacancies/${vacancyId}/apply-authenticated`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Sollicitatie mislukt");
  return data as {
    application_id: number;
    match_score: number;
    explanation: string;
    access_token: string;
  };
}

export async function generateVacancy(
  token: string,
  prompt: string,
  website_url?: string
): Promise<{ title: string; location: string; hours_per_week: string; salary_range: string; description: string }> {
  const res = await fetch(`${BASE}/ai/generate-vacancy`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ prompt, website_url }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Genereren mislukt");
  return data;
}

export async function generateMotivationLetter(
  token: string,
  vacancyId: number
): Promise<string> {
  const res = await fetch(`${BASE}/ai/motivation-letter-for-vacancy/${vacancyId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Genereren mislukt");
  return data.letter as string;
}

// ----------------------------
// Kandidaten portaal endpoints
// ----------------------------

export type ApplicationWithDetails = {
  application_id: number;
  vacancy_id: number;
  vacancy_title: string;
  vacancy_location: string | null;
  status: string;
  created_at: string;
  match_score: number | null;
  ai_summary: string | null;
};

export type AIResult = {
  id: number;
  application_id: number;
  match_score: number | null;
  summary: string | null;
  strengths: string | null;
  gaps: string | null;
  suggested_questions: string | null;
};

export type CandidateCVOut = {
  id: number;
  source_filename: string | null;
  source_content_type: string | null;
  created_at: string;
  text_preview: string | null;
};

export async function getMyApplications(token: string): Promise<ApplicationWithDetails[]> {
  const res = await fetch(`${BASE}/candidate/my-applications`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Kon sollicitaties niet laden");
  return data as ApplicationWithDetails[];
}

export async function getApplicationAIResult(token: string, appId: number): Promise<AIResult> {
  const res = await fetch(`${BASE}/candidate/applications/${appId}/ai-result`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Geen AI-analyse beschikbaar");
  return data as AIResult;
}

export async function getCandidateCVs(token: string): Promise<CandidateCVOut[]> {
  const res = await fetch(`${BASE}/candidate/cvs`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Kon CV's niet laden");
  return data as CandidateCVOut[];
}

export async function getCVFullText(token: string, cvId: number): Promise<string> {
  const res = await fetch(`${BASE}/candidate/cv/${cvId}/text`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "CV tekst laden mislukt");
  return data.extracted_text as string;
}

export async function updateCVText(token: string, cvId: number, extractedText: string): Promise<CandidateCVOut> {
  const res = await fetch(`${BASE}/candidate/cv/${cvId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ extracted_text: extractedText }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Opslaan mislukt");
  return data as CandidateCVOut;
}

export async function register(email: string, password: string, fullName: string) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Registratie mislukt");
  return data as { access_token: string; token_type: string };
}

// ----------------------------
// Intakevragen endpoints
// ----------------------------

export type IntakeQuestionOut = {
  id: number;
  vacancy_id: number;
  qtype: string;
  question: string;
  options_json: string | null;
};

export async function listIntakeQuestions(token: string, vacancyId: number): Promise<IntakeQuestionOut[]> {
  const res = await fetch(`${BASE}/intake/vacancies/${vacancyId}/questions`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Laden mislukt");
  return data as IntakeQuestionOut[];
}

export async function createIntakeQuestion(
  token: string,
  vacancyId: number,
  payload: { qtype: string; question: string; options_json?: string }
): Promise<IntakeQuestionOut> {
  const res = await fetch(`${BASE}/intake/vacancies/${vacancyId}/questions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Aanmaken mislukt");
  return data as IntakeQuestionOut;
}

export async function deleteIntakeQuestion(token: string, vacancyId: number, questionId: number): Promise<void> {
  const res = await fetch(`${BASE}/intake/vacancies/${vacancyId}/questions/${questionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await parseJson(res);
    throw new Error(data?.detail || "Verwijderen mislukt");
  }
}

export type IntakeAnswerOut = {
  id: number;
  application_id: number;
  question_id: number;
  answer: string;
};

export async function getApplicationAnswers(token: string, applicationId: number): Promise<IntakeAnswerOut[]> {
  const res = await fetch(`${BASE}/intake/applications/${applicationId}/answers`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Laden mislukt");
  return data as IntakeAnswerOut[];
}

// ----------------------------
// Werkgever applicatie endpoints
// ----------------------------

export type ApplicationWithCandidate = {
  id: number;
  vacancy_id: number;
  status: string;
  created_at: string;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  match_score: number | null;
  ai_summary: string | null;
  ai_strengths: string | null;
  ai_gaps: string | null;
  ai_suggested_questions: string | null;
};

export async function getEmployerApplications(
  token: string,
  vacancy_id?: number
): Promise<ApplicationWithCandidate[]> {
  const url = `${BASE}/employer/applications${vacancy_id !== undefined ? `?vacancy_id=${vacancy_id}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Kon sollicitaties niet laden");
  return data as ApplicationWithCandidate[];
}

export type VideoInterviewSession = {
  id: number;
  status: string;
  score: number | null;
  transcript: Array<{ role: string; content: string; timestamp: string }> | null;
  followup_interview_id: number | null;
};

export async function getVideoInterviewSession(
  token: string,
  appId: number
): Promise<VideoInterviewSession | null> {
  const res = await fetch(`${BASE}/virtual-interview/session/${appId}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (res.status === 404) return null;
  const data = await parseJson(res);
  if (!res.ok) return null;
  return data as VideoInterviewSession;
}

export async function updateApplicationStatus(
  token: string,
  applicationId: number,
  status: string
): Promise<void> {
  const res = await fetch(`${BASE}/employer/applications/${applicationId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ status }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Status bijwerken mislukt");
}

// ----------------------------
// Recruiter chat endpoints
// ----------------------------

export type ChatMessage = {
  id: number;
  role: "recruiter" | "candidate";
  content: string;
  created_at: string;
};

export async function getChatMessages(token: string, appId: number): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE}/ai/recruiter/${appId}/messages`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Kon chatberichten niet laden");
  return data as ChatMessage[];
}

// ----------------------------
// Interview scheduler endpoints
// ----------------------------

export type InterviewSession = {
  id: number;
  application_id: number;
  scheduled_at: string;
  duration_minutes: number;
  interview_type: "teams" | "phone" | "in_person";
  teams_join_url: string | null;
  teams_organizer_email: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  candidate_name: string | null;
  candidate_email: string | null;
  vacancy_title: string | null;
};

export async function scheduleInterview(
  token: string,
  payload: {
    application_id: number;
    scheduled_at: string;
    duration_minutes?: number;
    interview_type?: string;
    notes?: string;
  }
): Promise<InterviewSession> {
  const res = await fetch(`${BASE}/interviews/schedule`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Interview inplannen mislukt");
  return data as InterviewSession;
}

export async function getInterviewsForApplication(
  token: string,
  appId: number
): Promise<InterviewSession[]> {
  const res = await fetch(`${BASE}/interviews/application/${appId}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Interviews laden mislukt");
  return data as InterviewSession[];
}

export async function getMyInterviews(token: string): Promise<InterviewSession[]> {
  const res = await fetch(`${BASE}/interviews/my`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Mijn gesprekken laden mislukt");
  return data as InterviewSession[];
}

// ----------------------------
// CRM integratie endpoints
// ----------------------------

export async function syncCandidateToCRM(
  token: string,
  candidateId: number,
  applicationId?: number
): Promise<{ sync_status: string; crm_contact_id?: string }> {
  const url = `${BASE}/crm/sync/${candidateId}${applicationId ? `?application_id=${applicationId}` : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "CRM sync mislukt");
  return data;
}

// ----------------------------
// Integraties status
// ----------------------------

export type IntegrationStatus = {
  name: string;
  configured: boolean;
  ok: boolean;
  message: string;
  details?: string | null;
};

export type IntegrationsStatusResponse = {
  openai: IntegrationStatus;
  microsoft_graph: IntegrationStatus;
  teams_bot: IntegrationStatus;
  crm: IntegrationStatus;
};

export async function getIntegrationsStatus(token: string): Promise<IntegrationsStatusResponse> {
  const res = await fetch(`${BASE}/integrations/status`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Status ophalen mislukt");
  return data as IntegrationsStatusResponse;
}

export async function createCheckoutSession(
  token: string,
  plan: string,
  interval: "month" | "year",
): Promise<{ checkout_url: string }> {
  const res = await fetch(`${BASE}/billing/checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ plan, interval }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Checkout aanmaken mislukt");
  return data as { checkout_url: string };
}

export async function createVacancyCheckout(token: string): Promise<{ checkout_url: string }> {
  const res = await fetch(`${BASE}/billing/vacancy-checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Checkout aanmaken mislukt");
  return data as { checkout_url: string };
}

export interface VacancyUpdatePayload {
  title: string;
  location?: string;
  hours_per_week?: string;
  salary_range?: string;
  description?: string;
  employment_type?: string;
  work_location?: string;
  interview_type?: string;
}

export async function updateVacancy(
  token: string,
  vacancyId: number,
  payload: VacancyUpdatePayload,
): Promise<{ id: number; title: string; status: string }> {
  const res = await fetch(`${BASE}/employer/vacancies/${vacancyId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Vacature bijwerken mislukt");
  return data;
}

export async function updateVacancyStatus(
  token: string,
  vacancyId: number,
  status: "concept" | "actief" | "offline",
): Promise<{ id: number; status: string }> {
  const res = await fetch(`${BASE}/employer/vacancies/${vacancyId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Status bijwerken mislukt");
  return data;
}

// ── Vacature Promoties ──────────────────────────────────────────────────────

export interface PromotionOut {
  id: number;
  vacancy_id: number;
  duration_days: number;
  total_price: number;
  status: "pending_payment" | "paid" | "active" | "completed" | "cancelled";
  platforms: string[];
  created_at: string;
  paid_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
}

export async function createPromotionCheckout(
  token: string,
  vacancyId: number,
  durationDays: 7 | 14 | 30,
): Promise<{ checkout_url: string }> {
  const res = await fetch(`${BASE}/promotions/vacancies/${vacancyId}/checkout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ duration_days: durationDays }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Promotie checkout aanmaken mislukt");
  return data as { checkout_url: string };
}

export async function listVacancyPromotions(
  token: string,
  vacancyId: number,
): Promise<PromotionOut[]> {
  const res = await fetch(`${BASE}/promotions/vacancies/${vacancyId}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Promoties ophalen mislukt");
  return data as PromotionOut[];
}

export async function deleteVacancy(token: string, vacancyId: number): Promise<void> {
  const res = await fetch(`${BASE}/employer/vacancies/${vacancyId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await parseJson(res);
    throw new Error(data?.detail || data?.raw || "Verwijderen mislukt");
  }
}

export async function deleteAccount(token: string): Promise<void> {
  const res = await fetch(`${BASE}/auth/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await parseJson(res);
    throw new Error(data?.detail || "Account verwijderen mislukt");
  }
}

export interface RecommendationOut {
  vacancy_id: number;
  title: string;
  location?: string | null;
  match_score: number;
  reason: string;
}

export async function getRecommendations(token: string): Promise<RecommendationOut[]> {
  const res = await fetch(`${BASE}/candidate/recommendations`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Aanbevelingen ophalen mislukt");
  return data as RecommendationOut[];
}

// ── Admin: Organisaties ───────────────────────────────────────────────────

export interface AdminOrganisation {
  id: number;
  name: string;
  user_count: number;
}

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  plan: string | null;
  org_id: number | null;
}

export async function getAdminOrganisations(token: string): Promise<AdminOrganisation[]> {
  const res = await fetch(`${BASE}/admin/organisations`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Organisaties ophalen mislukt");
  return data as AdminOrganisation[];
}

export async function createAdminOrganisation(token: string, name: string): Promise<AdminOrganisation> {
  const res = await fetch(`${BASE}/admin/organisations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Organisatie aanmaken mislukt");
  return data as AdminOrganisation;
}

export async function deleteAdminOrganisation(token: string, id: number): Promise<void> {
  const res = await fetch(`${BASE}/admin/organisations/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await parseJson(res);
    throw new Error(data?.detail || data?.raw || "Organisatie verwijderen mislukt");
  }
}

export async function getAdminUsers(token: string): Promise<AdminUser[]> {
  const res = await fetch(`${BASE}/admin/users`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Gebruikers ophalen mislukt");
  return data as AdminUser[];
}

export async function patchUserOrganisation(token: string, userId: number, orgId: number | null): Promise<AdminUser> {
  const res = await fetch(`${BASE}/admin/users/${userId}/organisation`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ org_id: orgId }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Organisatie koppeling mislukt");
  return data as AdminUser;
}

// ── Werkgever: team-beheer ────────────────────────────────────────────────────

export interface TeamMember {
  id: number;
  full_name: string;
  email: string;
  is_self: boolean;
}

export interface AddTeamMemberResponse extends TeamMember {
  temp_password: string;
}

export async function getTeamMembers(token: string): Promise<TeamMember[]> {
  const res = await fetch(`${BASE}/employer/team`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Team ophalen mislukt");
  return data as TeamMember[];
}

export async function addTeamMember(token: string, full_name: string, email: string): Promise<AddTeamMemberResponse> {
  const res = await fetch(`${BASE}/employer/team`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ full_name, email }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Teamlid toevoegen mislukt");
  return data as AddTeamMemberResponse;
}

export async function removeTeamMember(token: string, userId: number): Promise<void> {
  const res = await fetch(`${BASE}/employer/team/${userId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await parseJson(res);
    throw new Error(data?.detail || data?.raw || "Teamlid verwijderen mislukt");
  }
}

// ----------------------------
// Wachtwoord wijzigen
// ----------------------------

export async function changePassword(
  token: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(`${BASE}/auth/password`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Wachtwoord wijzigen mislukt");
}

export async function adminResetPassword(
  token: string,
  userId: number,
  newPassword: string,
): Promise<void> {
  const res = await fetch(`${BASE}/admin/users/${userId}/password`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ new_password: newPassword }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Wachtwoord resetten mislukt");
}

