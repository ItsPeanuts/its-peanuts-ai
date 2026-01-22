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

