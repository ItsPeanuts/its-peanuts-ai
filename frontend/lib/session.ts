export type Role = "candidate" | "employer";

const TOKEN_KEY = "ip_token";
const ROLE_KEY = "ip_role";

export function setSession(token: string, role: Role) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getRole(): Role | "" {
  return (localStorage.getItem(ROLE_KEY) as Role) || "";
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
