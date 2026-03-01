const BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "https://its-peanuts-ai.onrender.com";

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
    role: "candidate" | "employer";
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
};

// ----------------------------
// Publieke vacature endpoints
// ----------------------------

export async function listVacancies(params?: {
  q?: string;
  location?: string;
}): Promise<PublicVacancy[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.location) sp.set("location", params.location);
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

