// frontend/lib/session.ts
const KEY = "peanuts.session";

export type Role = "candidate" | "employer";
export type Session = {
  token: string;
  role: Role;
  email: string;
};

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function getToken(): string {
  const s = getSession();
  return s?.token || "";
}

export function getRole(): Role | null {
  const s = getSession();
  return s?.role || null;
}
