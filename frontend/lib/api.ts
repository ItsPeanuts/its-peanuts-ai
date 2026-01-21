const BASE = process.env.NEXT_PUBLIC_API_BASE || "";

function mustBase() {
  if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE ontbreekt. Zet dit in .env.local");
  return BASE;
}

export function getApiBase() {
  return mustBase();
}

export async function login(email: string, password: string) {
  const url = `${mustBase()}/auth/login`;

  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "accept": "application/json",
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): ${text}`);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Login response is geen JSON: ${text}`);
  }

  if (!json?.access_token) {
    throw new Error(`Geen access_token in response: ${text}`);
  }

  return json.access_token as string;
}

export async function me(token: string) {
  const url = `${mustBase()}/auth/me`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "accept": "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`GET /auth/me failed (${res.status}): ${text}`);
  return JSON.parse(text);
}
