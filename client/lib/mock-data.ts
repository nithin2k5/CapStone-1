export type ThreatLevel = "critical" | "high" | "medium" | "low";

export type ThreatEvent = {
  id: string;
  time: string;
  sender: string;
  subject: string;
  type: string;
  level: ThreatLevel;
  action: "blocked" | "quarantined" | "flagged";
  country: string;
};

export type EmailQueueItem = {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  status: "scanning" | "clean" | "blocked" | "queued";
  riskScore: number;
  receivedAt: string;
};

export type BlockedDomain = {
  domain: string;
  hits: number;
  category: string;
  lastSeen: string;
};

export type DashboardStats = {
  emailsProtected: number;
  threatsBlocked: number;
  malwareDetected: number;
  maliciousUrls: number;
  detectionAccuracy: number;
  queueSize: number;
};

export const dashboardStats: DashboardStats = {
  emailsProtected: 2547832,
  threatsBlocked: 195420,
  malwareDetected: 18432,
  maliciousUrls: 420891,
  detectionAccuracy: 99.4,
  queueSize: 847,
};

export const threatFeed: ThreatEvent[] = [
  {
    id: "TH-9821",
    time: "10:42 AM",
    sender: "admin@paypaI.com",
    subject: "Account Suspended - Verify Now",
    type: "Phishing",
    level: "critical",
    action: "blocked",
    country: "Russia",
  },
  {
    id: "TH-9820",
    time: "10:38 AM",
    sender: "hr@company-portal.net",
    subject: "Q3 Bonus Document Attached",
    type: "Malware (PDF)",
    level: "high",
    action: "quarantined",
    country: "China",
  },
  {
    id: "TH-9819",
    time: "10:15 AM",
    sender: "support@microsoft-update.com",
    subject: "Action Required: Password Reset",
    type: "Spoofing",
    level: "high",
    action: "blocked",
    country: "Unknown",
  },
  {
    id: "TH-9818",
    time: "09:55 AM",
    sender: "billing@amaz0n-deals.io",
    subject: "Invoice #9921 - Payment Due",
    type: "Malicious URL",
    level: "critical",
    action: "blocked",
    country: "North Korea",
  },
  {
    id: "TH-9817",
    time: "09:41 AM",
    sender: "noreply@dhl-shipping.xyz",
    subject: "Package Delivery Failed",
    type: "Credential Harvest",
    level: "medium",
    action: "flagged",
    country: "Nigeria",
  },
  {
    id: "TH-9816",
    time: "09:22 AM",
    sender: "ceo@internal-corp.net",
    subject: "Urgent Wire Transfer Request",
    type: "BEC Attack",
    level: "critical",
    action: "blocked",
    country: "Romania",
  },
];

export const emailQueue: EmailQueueItem[] = [
  {
    id: "EM-44102",
    sender: "john.doe@company.com",
    recipient: "team@company.com",
    subject: "Weekly Security Report",
    status: "clean",
    riskScore: 12,
    receivedAt: "10:45 AM",
  },
  {
    id: "EM-44101",
    sender: "notifications@slack.com",
    recipient: "admin@company.com",
    subject: "New message in #security",
    status: "clean",
    riskScore: 8,
    receivedAt: "10:44 AM",
  },
  {
    id: "EM-44100",
    sender: "unknown@192.168.x.x",
    recipient: "finance@company.com",
    subject: "Invoice #9921",
    status: "blocked",
    riskScore: 94,
    receivedAt: "10:43 AM",
  },
  {
    id: "EM-44099",
    sender: "marketing@vendor.io",
    recipient: "sales@company.com",
    subject: "Partnership Proposal",
    status: "scanning",
    riskScore: 45,
    receivedAt: "10:42 AM",
  },
  {
    id: "EM-44098",
    sender: "hr@company-portal.net",
    recipient: "all-staff@company.com",
    subject: "Updated Employee Handbook",
    status: "blocked",
    riskScore: 88,
    receivedAt: "10:40 AM",
  },
];

export const blockedDomains: BlockedDomain[] = [
  { domain: "paypaI.com", hits: 1247, category: "Phishing", lastSeen: "2 min ago" },
  { domain: "microsoft-update.com", hits: 892, category: "Spoofing", lastSeen: "5 min ago" },
  { domain: "amaz0n-deals.io", hits: 654, category: "Credential Harvest", lastSeen: "12 min ago" },
  { domain: "dhl-shipping.xyz", hits: 421, category: "Malware Delivery", lastSeen: "18 min ago" },
  { domain: "secure-login-bank.net", hits: 389, category: "Phishing", lastSeen: "24 min ago" },
  { domain: "crypto-airdrop-free.io", hits: 312, category: "Scam", lastSeen: "31 min ago" },
];

export const attackCountries = [
  { country: "Russia", percent: 34, color: "bg-red-500" },
  { country: "China", percent: 22, color: "bg-orange-500" },
  { country: "North Korea", percent: 14, color: "bg-yellow-500" },
  { country: "Romania", percent: 11, color: "bg-purple-500" },
  { country: "Unknown", percent: 19, color: "bg-gray-500" },
];

export const threatActivity24h = [
  42, 38, 55, 48, 62, 71, 65, 58, 82, 91, 88, 76,
  69, 74, 85, 92, 98, 87, 79, 83, 95, 102, 88, 76,
];

export const docsSections = [
  {
    title: "Getting Started",
    items: ["Quick Start Guide", "Installation", "Configuration", "API Keys"],
  },
  {
    title: "Detection Engine",
    items: ["Header Analysis", "URL Scanning", "Attachment Scanning", "AI Models"],
  },
  {
    title: "Integration",
    items: ["SMTP Relay", "Microsoft 365", "Google Workspace", "Webhooks"],
  },
  {
    title: "API Reference",
    items: ["Authentication", "Threat Reports", "Quarantine API", "Analytics"],
  },
];
