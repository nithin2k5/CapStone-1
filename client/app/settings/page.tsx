"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import {
  UserRound,
  SlidersHorizontal,
  Bell,
  KeyRound,
  Info,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { clearAuthSession } from "@/lib/auth";
import { useAuthSession } from "@/lib/useAuthSession";
import {
  getSettings,
  updateSettings,
  updateProfile,
  regenerateApiKey,
  type UserSettings,
  type UserUpdateRequest,
} from "@/lib/api";

type TabId = "account" | "detection" | "notifications" | "api";

const tabs: { id: TabId; label: string; icon: LucideIcon; hint: string }[] = [
  { id: "account", label: "Account", icon: UserRound, hint: "Profile and password" },
  { id: "detection", label: "Detection", icon: SlidersHorizontal, hint: "Sensitivity per analyser" },
  { id: "notifications", label: "Notifications", icon: Bell, hint: "Alerts and digests" },
  { id: "api", label: "API access", icon: KeyRound, hint: "Gateway API key" },
];

const sensitivities: { key: keyof Pick<UserSettings, "sens_phishing" | "sens_malware" | "sens_url" | "sens_ai">; label: string; detail: string }[] = [
  { key: "sens_phishing", label: "Phishing", detail: "Impersonation, credential lures, spoofed senders" },
  { key: "sens_malware", label: "Malware", detail: "Dangerous attachments, macros, nested archives" },
  { key: "sens_url", label: "URLs", detail: "Homographs, punycode, shorteners, reputation" },
  { key: "sens_ai", label: "Content model", detail: "The language-model content verdict" },
];

const notifications: { key: keyof Pick<UserSettings, "notif_critical" | "notif_quarantine" | "notif_daily" | "notif_weekly">; label: string; detail: string }[] = [
  { key: "notif_critical", label: "Critical threat alerts", detail: "An alert as soon as a highly malicious or targeted message is caught." },
  { key: "notif_quarantine", label: "Quarantine digest", detail: "A daily digest of mail that was quarantined." },
  { key: "notif_daily", label: "Daily summary", detail: "A short summary of the day’s traffic and mitigated threats." },
  { key: "notif_weekly", label: "Weekly report", detail: "Long-term trends and attack vectors, once a week." },
];

const inputClass =
  "h-11 w-full max-w-md rounded-xl border border-border bg-card px-4 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
        checked ? "border-transparent bg-accent-solid" : "border-border bg-secondary"
      )}
      style={checked ? { boxShadow: "0 0 14px -2px var(--accent)" } : undefined}
    >
      <span
        className={cn(
          "absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

/** Says plainly what a saved preference does not do yet. */
function Caveat({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
      <span>{children}</span>
    </div>
  );
}

function SaveBar({ saving, saved, onSave, label = "Save changes" }: { saving: boolean; saved: boolean; onSave: () => void; label?: string }) {
  return (
    <div className="mt-8 flex items-center justify-end gap-4 border-t border-border pt-6">
      <AnimatePresence>
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 font-mono text-[12px] text-[var(--success)]"
          >
            <Check className="h-3.5 w-3.5" /> saved
          </motion.span>
        )}
      </AnimatePresence>
      <button type="button" onClick={onSave} disabled={saving} className="btn-primary px-5 py-2.5 text-[13px] disabled:opacity-60">
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}

function PanelHead({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6 border-b border-border pb-5">
      <h3 className="display text-[1.2rem] text-foreground">{title}</h3>
      <p className="mt-1 text-[13.5px] text-muted-foreground">{description}</p>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const session = useAuthSession();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Null until the field is touched, so the name shown follows the session
  // until the user decides otherwise. Seeding state from the session in an
  // effect instead would cost a second render on every mount.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const profileName = nameDraft ?? session?.name ?? "";

  useEffect(() => {
    getSettings().then(setUserSettings).catch(console.error);
  }, []);

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveSettings = async (patch: Partial<UserSettings>) => {
    setSaving(true);
    try {
      setUserSettings(await updateSettings(patch));
      flashSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    setProfileSaving(true);
    setProfileSuccess(false);
    setProfileError("");
    try {
      const updates: UserUpdateRequest = {};
      if (profileName && profileName !== session?.name) {
        updates.name = profileName;
      }
      if (newPassword) {
        updates.password = newPassword;
      }
      if (Object.keys(updates).length > 0) {
        await updateProfile(updates);
        setNewPassword("");
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setProfileSaving(false);
    }
  };

  const maskedKey = userSettings?.api_key
    ? `${userSettings.api_key.slice(0, 9)}${"•".repeat(24)}${userSettings.api_key.slice(-4)}`
    : "";

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <span className="eyebrow">
          <span className="h-px w-6 bg-accent" />
          configuration
        </span>
        <h2 className="display mt-3 text-[1.7rem] text-foreground">Settings</h2>
        <p className="mt-1.5 text-[14px] text-muted-foreground">Your profile, detection preferences and gateway access.</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card/60 p-1.5 lg:flex-col">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  activeTab === tab.id ? "bg-accent-subtle text-accent" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <tab.icon className="h-[18px] w-[18px] shrink-0" />
                <span>
                  <span className="block text-[13.5px] font-medium">{tab.label}</span>
                  <span className="hidden font-mono text-[10.5px] text-muted-foreground lg:block">{tab.hint}</span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "account" && (
                <GlassCard className="p-6 md:p-8">
                  <PanelHead title="Account" description="How you appear in the gateway, and how you sign in." />

                  <div className="mb-8 flex items-center gap-4 rounded-2xl border border-border bg-secondary/50 p-4">
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-[18px] font-bold text-accent-contrast"
                      style={{ background: "linear-gradient(135deg, var(--accent-solid), var(--accent-2))" }}
                    >
                      {(profileName || session?.email || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-foreground">{profileName || "Analyst"}</div>
                      <div className="truncate font-mono text-[12px] text-muted-foreground">{session?.email}</div>
                      {session?.provider && (
                        <span className="mt-1.5 inline-block font-mono text-[10px] uppercase tracking-wider text-accent">
                          signed in with {session.provider}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <label className="block">
                      <span className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">Display name</span>
                      <input type="text" value={profileName} onChange={(e) => setNameDraft(e.target.value)} className={inputClass} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">Email · cannot be changed</span>
                      <input type="email" value={session?.email ?? ""} readOnly className={cn(inputClass, "cursor-not-allowed opacity-60")} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">New password</span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep the current one"
                        autoComplete="new-password"
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        clearAuthSession();
                        window.location.href = "/login";
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--danger)]/30 px-4 py-2.5 text-[13px] font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/10"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                    <div className="flex items-center gap-4">
                      {profileSuccess && (
                        <span className="flex items-center gap-1.5 font-mono text-[12px] text-[var(--success)]">
                          <Check className="h-3.5 w-3.5" /> profile updated
                        </span>
                      )}
                      {profileError && <span className="text-[12px] text-[var(--danger)]">{profileError}</span>}
                      <button type="button" onClick={handleUpdateProfile} disabled={profileSaving} className="btn-primary px-5 py-2.5 text-[13px] disabled:opacity-60">
                        {profileSaving ? "Updating…" : "Update profile"}
                      </button>
                    </div>
                  </div>
                </GlassCard>
              )}

              {activeTab === "detection" && (
                <GlassCard className="p-6 md:p-8">
                  <PanelHead title="Detection sensitivity" description="How readily each analyser should flag a message, from 0 (lenient) to 100 (strict)." />
                  <Caveat>
                    These values are saved to your profile, but the scanner does not read them yet — verdicts
                    still use the engine&rsquo;s built-in thresholds.
                  </Caveat>
                  {!userSettings ? (
                    <div className="mt-6 space-y-4">
                      {sensitivities.map((s) => <div key={s.key} className="h-14 animate-pulse rounded-xl bg-secondary" />)}
                    </div>
                  ) : (
                    <>
                      <div className="mt-6 space-y-6">
                        {sensitivities.map((s) => {
                          const v = userSettings[s.key];
                          return (
                            <div key={s.key}>
                              <div className="flex items-baseline justify-between gap-3">
                                <div>
                                  <div className="text-[14px] font-medium text-foreground">{s.label}</div>
                                  <div className="text-[12px] text-muted-foreground">{s.detail}</div>
                                </div>
                                <span className="display text-[1.3rem] text-accent">{v}</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={v}
                                onChange={(e) => setUserSettings({ ...userSettings, [s.key]: Number(e.target.value) })}
                                className="mt-3 w-full accent-[var(--accent-solid)]"
                                aria-label={`${s.label} sensitivity`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <SaveBar
                        saving={saving}
                        saved={saved}
                        onSave={() =>
                          saveSettings({
                            sens_phishing: userSettings.sens_phishing,
                            sens_malware: userSettings.sens_malware,
                            sens_url: userSettings.sens_url,
                            sens_ai: userSettings.sens_ai,
                          })
                        }
                      />
                    </>
                  )}
                </GlassCard>
              )}

              {activeTab === "notifications" && (
                <GlassCard className="p-6 md:p-8">
                  <PanelHead title="Notifications" description="Which alerts and digests you want from the gateway." />
                  <Caveat>
                    Preferences are saved, but the gateway does not send these alerts or digests yet.
                  </Caveat>
                  {!userSettings ? (
                    <div className="mt-6 space-y-3">
                      {notifications.map((n) => <div key={n.key} className="h-16 animate-pulse rounded-xl bg-secondary" />)}
                    </div>
                  ) : (
                    <>
                      <div className="mt-6 divide-y divide-border rounded-2xl border border-border">
                        {notifications.map((n) => (
                          <div key={n.key} className="flex items-center justify-between gap-4 p-4">
                            <div>
                              <div className="text-[14px] font-medium text-foreground">{n.label}</div>
                              <div className="mt-0.5 text-[12.5px] text-muted-foreground">{n.detail}</div>
                            </div>
                            <Toggle
                              label={n.label}
                              checked={userSettings[n.key]}
                              onChange={(v) => setUserSettings({ ...userSettings, [n.key]: v })}
                            />
                          </div>
                        ))}
                      </div>
                      <SaveBar
                        saving={saving}
                        saved={saved}
                        onSave={() =>
                          saveSettings({
                            notif_critical: userSettings.notif_critical,
                            notif_quarantine: userSettings.notif_quarantine,
                            notif_daily: userSettings.notif_daily,
                            notif_weekly: userSettings.notif_weekly,
                          })
                        }
                      />
                    </>
                  )}
                </GlassCard>
              )}

              {activeTab === "api" && (
                <GlassCard className="p-6 md:p-8">
                  <PanelHead title="API access" description="A key identifying your gateway to scripts and integrations." />
                  <Caveat>
                    No gateway endpoint accepts this key yet; it is issued and stored for future integrations.
                  </Caveat>
                  <div className="mt-6">
                    <span className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">Current key</span>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <code className="flex h-11 min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap rounded-xl border border-border bg-secondary px-4 font-mono text-[13px] text-foreground">
                        {userSettings ? (keyVisible ? userSettings.api_key : maskedKey) : "…"}
                      </code>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setKeyVisible((v) => !v)}
                          aria-label={keyVisible ? "Hide key" : "Show key"}
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
                        >
                          {keyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          disabled={!userSettings}
                          onClick={async () => {
                            if (!userSettings) return;
                            await navigator.clipboard.writeText(userSettings.api_key);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          aria-label="Copy key"
                          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-accent/50 hover:text-accent"
                        >
                          {copied ? <Check className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
                    <p className="text-[12.5px] text-muted-foreground">Regenerating replaces the key immediately.</p>
                    <button
                      type="button"
                      disabled={regenerating}
                      onClick={async () => {
                        setRegenerating(true);
                        try {
                          setUserSettings(await regenerateApiKey());
                          setKeyVisible(true);
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setRegenerating(false);
                        }
                      }}
                      className="btn-secondary px-4 py-2.5 text-[13px] disabled:opacity-60"
                    >
                      <RefreshCw className={cn("h-4 w-4", regenerating && "animate-spin")} />
                      {regenerating ? "Regenerating…" : "Regenerate key"}
                    </button>
                  </div>
                </GlassCard>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
