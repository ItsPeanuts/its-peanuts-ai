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

export async function registerCandidate(email: string, password: string, fullName: string) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Registration failed");
  return data;
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

export async function candidateVacancies(token: string) {
  const res = await fetch(`${BASE}/vacancies`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Vacancies failed");
  return data as any[];
}

export async function listCandidateVacancies(token: string) {
  return candidateVacancies(token);
}

export async function employerVacancies(token: string) {
  const res = await fetch(`${BASE}/employer/vacancies`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Employer vacancies failed");
  return data as any[];
}

export async function createVacancy(
  token: string,
  vacancy: {
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
    },
    body: JSON.stringify(vacancy),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Create vacancy failed");
  return data;
}

export async function uploadCv(token: string, file: File) {
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

export async function uploadCV(token: string, file: File) {
  return uploadCv(token, file);
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

export async function applyToVacancy(token: string, vacancyId: number) {
  const res = await fetch(`${BASE}/candidate/apply/${vacancyId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Apply failed");
  return data;
}

export async function myApplications(token: string) {
  const res = await fetch(`${BASE}/candidate/applications`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Applications failed");
  return data as any[];
}

export async function publicVacancies(search?: string, location?: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (location) params.set("location", location);
  const qs = params.toString();

  const res = await fetch(`${BASE}/vacancies${qs ? `?${qs}` : ""}`, {
    headers: { accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Public vacancies failed");
  return data as any[];
}

export async function publicVacancyDetail(vacancyId: number) {
  const res = await fetch(`${BASE}/vacancies/${vacancyId}`, {
    headers: { accept: "application/json" },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(data?.detail || data?.raw || "Vacancy not found");
  return data;
}

