import { getAuthSession } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const session = getAuthSession();

  if (!session?.accessToken && typeof window !== "undefined") {
    window.location.href = "/login";
    return new Promise(() => {}); // Prevent further execution
  }

  const headers = {
    "Content-Type": "application/json",
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    return new Promise(() => {}); // Prevent throwing error
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API Error (${res.status}): ${res.statusText}`);
  }
  return res.json();
}

/** FastAPI reports validation failures as a list of objects, not a string. */
function detailMessage(payload: unknown): string {
  const detail = (payload as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg;
  }
  return "";
}

/**
 * POST to an endpoint that has no session yet. `fetchWithAuth` cannot serve
 * these: with no token stored it redirects to /login, which is where the
 * visitor has just come from because they cannot sign in.
 */
async function postPublic<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(detailMessage(payload) || `Request failed (${res.status})`);
  }
  return payload as T;
}

export interface MessageResponse {
  message: string;
}

/**
 * Ask for a reset link. Resolves the same way for an address with no account —
 * the API answers identically by design, so the UI must not imply otherwise.
 */
export async function requestPasswordReset(email: string): Promise<MessageResponse> {
  return postPublic<MessageResponse>("/auth/forgot-password", { email });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<MessageResponse> {
  return postPublic<MessageResponse>("/auth/reset-password", { token, password });
}

export interface TopSender {
  sender: string;
  count: number;
}

export interface TopDomain {
  domain: string;
  count: number;
}

export interface RecentThreat {
  email_id: string;
  sender: string;
  subject: string;
  risk_score: number;
  risk_level: "safe" | "low" | "medium" | "high" | "critical";
  received_at?: string;
}

export interface RiskDistribution {
  safe: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface DashboardData {
  total_emails: number;
  scanned_emails: number;
  blocked_emails: number;
  safe_emails: number;
  quarantined_emails: number;
  top_senders: TopSender[];
  top_domains: TopDomain[];
  recent_threats: RecentThreat[];
  risk_distribution: RiskDistribution;
  monthly_statistics: { month: string; total: number; blocked: number; safe: number }[];
}

export interface EmailItem {
  id: string;
  gmail_message_id: string;
  sender: string;
  recipient: string;
  subject: string;
  status: "pending" | "scanned" | "safe" | "quarantined" | "blocked";
  risk_score: number;
  received_at?: string;
  created_at: string;
  mailbox: string;
}

export interface EmailDetail extends EmailItem {
  body_text?: string;
  body_html?: string;
  raw_headers?: any;
}

export interface EmailListResponse {
  items: EmailItem[];
  total: number;
  page: number;
  page_size: number;
}

export async function getDashboardStats(): Promise<DashboardData> {
  return fetchWithAuth("/dashboard");
}

export async function getEmailQueue(page = 1, pageSize = 50, status?: string): Promise<EmailListResponse> {
  const statusParam = status ? `&status=${status}` : '';
  return fetchWithAuth(`/emails?page=${page}&page_size=${pageSize}${statusParam}`);
}

export async function fetchLiveGmailMessages(mailbox = "inbox", maxResults = 20): Promise<EmailListResponse> {
  return fetchWithAuth("/emails/fetch", {
    method: "POST",
    body: JSON.stringify({ mailbox, max_results: maxResults }),
  });
}

export async function runThreatScan(maxEmails = 50): Promise<any> {
  return fetchWithAuth("/scan/all", {
    method: "POST",
    body: JSON.stringify({ max_emails: maxEmails }),
  });
}

export async function getEmailById(id: string): Promise<EmailDetail> {
  return fetchWithAuth(`/emails/${id}`);
}

/** One run of text the recipient never saw, and the techniques that hid it. */
export interface ConcealedSegment {
  text: string;
  channels: string[];
  truncated: boolean;
}

export interface PerceptualFindings {
  findings: string[];
  hidden_ratio: number;
  hidden_chars: number;
  imperative_hidden: boolean;
  instruction_patterns: string[];
  invisible_codepoints: number;
  mixed_script_words: number;
  link_mismatch: boolean;
  channels: string[];
  evidence?: {
    visible_excerpt: string;
    concealed_segments: ConcealedSegment[];
    truncated: boolean;
  };
}

/** The two verdicts the differential probe compared, and the gap between them. */
export interface ProbeFindings {
  ran: boolean;
  degraded: boolean;
  visible_score: number;
  ingested_score: number;
  suppression: number;
  escalation: number;
  injection_reported: boolean;
  skipped_reason: string;
  findings: string[];
}

export interface ScanFindings {
  header?: string[];
  urls?: string[];
  url_findings?: string[];
  attachments?: string[];
  ai?: {
    phishing_probability: number;
    spam_probability: number;
    reasons: string[];
    source: string;
    degraded: boolean;
    injection_attempt: boolean;
  };
  perceptual?: PerceptualFindings;
  probe?: ProbeFindings;
}

export interface ScanResult {
  id: string;
  email_id: string;
  header_score: number;
  url_score: number;
  attachment_score: number;
  ai_score: number;
  perceptual_score: number;
  final_score: number;
  risk_level: string;
  explanation: string;
  findings: ScanFindings | null;
  scan_time: string;
}

export async function getScanResult(emailId: string): Promise<ScanResult> {
  return fetchWithAuth(`/scan/result/${emailId}`);
}

export interface UserSettings {
  notif_critical: boolean;
  notif_daily: boolean;
  notif_quarantine: boolean;
  notif_weekly: boolean;
  sens_phishing: number;
  sens_malware: number;
  sens_url: number;
  sens_ai: number;
  api_key: string;
}

export async function getSettings(): Promise<UserSettings> {
  return fetchWithAuth("/settings");
}

export async function updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  return fetchWithAuth("/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function downloadReport(): Promise<void> {
  const session = getAuthSession();
  
  if (!session?.accessToken && typeof window !== "undefined") {
    window.location.href = "/login";
    return;
  }
  
  const res = await fetch(`${BASE_URL}/dashboard/report`, {
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
    },
  });
  
  if (!res.ok) {
    throw new Error("Failed to generate report");
  }
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "email_security_report.csv";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export interface UserUpdateRequest {
  name?: string;
  password?: string;
}

export async function updateProfile(data: UserUpdateRequest): Promise<any> {
  return fetchWithAuth("/auth/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

