export type AuthProvider = "email" | "google" | "microsoft";

export type AuthSession = {
  provider: AuthProvider;
  email: string;
  name: string;
  picture?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

const SESSION_KEY = "seg_auth_session";

export function setAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function decodeGoogleCredential(credential: string): AuthSession {
  const payload = JSON.parse(atob(credential.split(".")[1])) as {
    email?: string;
    name?: string;
    picture?: string;
  };

  return {
    provider: "google",
    email: payload.email ?? "unknown@gmail.com",
    name: payload.name ?? "Google User",
    picture: payload.picture,
  };
}

export function getJwtExpiration(token: string): number | undefined {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp) {
      return payload.exp * 1000;
    }
  } catch {
    // Ignore error
  }
  return undefined;
}
