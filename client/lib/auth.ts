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

// Subscribers to the session. A `storage` event never fires in the tab that
// wrote the value, so signing in or out here has to announce itself.
const listeners = new Set<() => void>();

function announce() {
  listeners.forEach((listener) => listener());
}

export function setAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  announce();
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
  announce();
}

// useSyncExternalStore compares snapshots by identity. getAuthSession parses a
// fresh object every call, which would hand React a new value on every render
// and spin, so the parse is cached against the raw string it came from.
let cachedRaw: string | null = null;
let cachedSession: AuthSession | null = null;

export function getAuthSessionSnapshot(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = getAuthSession();
  }
  return cachedSession;
}

/** The server has no session, and neither does the first client render. */
export function getServerAuthSession(): AuthSession | null {
  return null;
}

export function subscribeToAuthSession(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
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
