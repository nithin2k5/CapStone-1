import { getAuthSession } from "@/lib/auth";

// Exported for the sign-in calls that run before a session exists. A relative
// value such as "/api/v1" serves the API from the page's own origin.
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user_id: string;
  user_email: string;
  user_name: string;
}

export async function loginWithPassword(email: string, password: string): Promise<TokenResponse> {
  return postPublic<TokenResponse>("/auth/login", { email, password });
}

/** Creates the account only; the caller signs in afterwards for a session. */
export async function registerAccount(name: string, email: string, password: string): Promise<UserProfile> {
  return postPublic<UserProfile>("/auth/register", { name, email, password });
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
  raw_headers?: Record<string, string | string[]>;
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

/** A message as Gmail lists it now; `id` and `status` are null when the gateway never scanned it. */
export interface LiveEmailItem {
  id: string | null;
  gmail_message_id: string;
  sender: string;
  recipient: string;
  subject: string;
  received_at?: string;
  mailbox: string;
  status: EmailItem["status"] | null;
  risk_score: number | null;
  enforced: boolean;
}

export interface LiveEmailListResponse {
  items: LiveEmailItem[];
  next_page_token: string | null;
  total_estimate: number;
}

/** Every received message, read from Gmail on request; `q` is Gmail search syntax. */
export async function getLiveEmails(pageToken?: string, pageSize = 50, q = ""): Promise<LiveEmailListResponse> {
  const params = new URLSearchParams({ page_size: String(pageSize) });
  if (pageToken) params.set("page_token", pageToken);
  if (q) params.set("q", q);
  return fetchWithAuth(`/emails/live?${params}`);
}

export async function fetchLiveGmailMessages(mailbox = "inbox", maxResults = 20): Promise<EmailListResponse> {
  return fetchWithAuth("/emails/fetch", {
    method: "POST",
    body: JSON.stringify({ mailbox, max_results: maxResults }),
  });
}

export interface ScanAllResponse {
  scanned: number;
  quarantined: number;
  safe: number;
  results: ScanResult[];
}

export async function runThreatScan(maxEmails = 50): Promise<ScanAllResponse> {
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

/**
 * Who the concealed text was written for. `analyser` is the only label that is
 * evidence: legitimate mail conceals plenty of machine-directed text, and only
 * text aimed at the system judging the message lacks a benign reason to hide.
 */
export interface AudienceFindings {
  ran: boolean;
  degraded: boolean;
  label: "" | "reader" | "client" | "analyser";
  confidence: number;
  reason: string;
  skipped_reason: string;
}

/** Whether this concealed payload has arrived here before, and from where. */
export interface CampaignFindings {
  ran: boolean;
  matches: number;
  distinct_domains: number;
  crosses_domains: boolean;
  first_seen: string | null;
  fingerprints: string[];
  sample: string;
  skipped_reason: string;
}

export interface StabilityFindings {
  ran: boolean;
  degraded: boolean;
  review_required: boolean;
  inconclusive: boolean;
  skipped_reason: string;
  control_scores: number[];
  noise_range: number;
  threshold: number;
  calls: number;
  findings: string[];
  variants: {
    name: string;
    scores: number[];
    body_sha256: string;
    direction: string;
    reproducible: boolean;
    delta: number;
  }[];
}

export interface IsolationFindings {
  ran: boolean;
  degraded: boolean;
  reproduced: boolean;
  budget_exhausted: boolean;
  skipped_reason: string;
  fragment: string;
  original_chars: number;
  source_sha256: string;
  source_ranges: number[][];
  direction: string;
  control_scores: number[];
  fragment_scores: number[];
  calls: number;
}

export interface ScanFindings {
  sender_trust?: {
    recorded: boolean;
    supporting_email_ids: string[];
    history_truncated: boolean;
    skipped_reason: string;
  };
  trust_reassessment?: {
    triggering_email_id: string;
    previous_score: number;
    new_score: number;
    at: string;
    enforced: boolean;
  };
  trust_invalidation?: {
    considered?: number;
    rescanned?: number;
    pulled?: number;
    unenforced?: number;
    failed?: number;
    truncated?: boolean;
    error?: string;
  };
  accessibility?: AccessibilityFindings;
  isolation?: IsolationFindings;
  stability?: StabilityFindings;
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
  audience?: AudienceFindings;
  campaign?: CampaignFindings;
}

export interface AccessibilityFindings {
  ran: boolean;
  degraded: boolean;
  review_required: boolean;
  skipped_reason: string;
  method: string;
  visible_excerpt: string;
  accessible_excerpt: string;
  machine_excerpt: string;
  evidence_truncated: boolean;
  limitations: string[];
  mismatches: { kind: string; visible: string; accessible: string; reason: string }[];
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

export async function rescanEmail(emailId: string): Promise<ScanResult> {
  return fetchWithAuth(`/scan/email/${emailId}`, { method: "POST" });
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

export async function regenerateApiKey(): Promise<UserSettings> {
  return fetchWithAuth("/settings/regenerate-key", { method: "POST" });
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

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface UserUpdateRequest {
  name?: string;
  password?: string;
}

export async function updateProfile(data: UserUpdateRequest): Promise<UserProfile> {
  return fetchWithAuth("/auth/me", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

