"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Mail, Lock, Bell, Server, KeyRound } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getAuthSession, clearAuthSession, type AuthSession } from "@/lib/auth";
import { getSettings, updateSettings, updateProfile, type UserSettings } from "@/lib/api";

const tabs = [
  { id: "account", label: "Account", icon: Lock },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "email", label: "Email Protection", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "system", label: "System", icon: Server },
  { id: "api", label: "API Keys", icon: KeyRound },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("email");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    const authSession = getAuthSession();
    setSession(authSession);
    if (authSession?.name) {
      setProfileName(authSession.name);
    }
    getSettings().then(setUserSettings).catch(console.error);
  }, []);

  const handleUpdateProfile = async () => {
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      const updates: any = {};
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
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];
  const ActiveIcon = currentTab.icon;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white mb-2">System Settings</h1>
          <p className="text-sm text-gray-400">Configure global security policies and preferences.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                  activeTab === tab.id
                    ? "bg-indigo-500/10 text-white border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          {activeTab === "email" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6 md:p-8">
                <h3 className="text-lg font-heading font-semibold text-white mb-6 border-b border-white/5 pb-4">
                  Email Protection Settings
                </h3>

                <div className="space-y-8">
                  {/* Setting Toggle Group 1 */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Deep Attachment Scanning</h4>
                      <p className="text-xs text-gray-400 max-w-md">Extract and analyze archives (ZIP, RAR) and detonate payloads in sandboxed environments.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>

                  {/* Setting Toggle Group 2 */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Link Time-of-Click Protection</h4>
                      <p className="text-xs text-gray-400 max-w-md">Rewrite URLs in incoming emails to proxy through the gateway for real-time analysis upon clicking.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>

                  {/* Setting Toggle Group 3 */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Spoofing Detection (DMARC)</h4>
                      <p className="text-xs text-gray-400 max-w-md">Automatically quarantine emails that fail strict DMARC alignment checks.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>

                  {/* Setting Select Group */}
                  <div className="border-t border-white/5 pt-8">
                    <h4 className="text-sm font-medium text-white mb-4">Heuristics Sensitivity</h4>
                    <select className="w-full md:w-64 h-10 bg-black border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                      <option value="low">Low (Fewer False Positives)</option>
                      <option value="medium">Medium (Balanced)</option>
                      <option value="high">High (Maximum Security)</option>
                    </select>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <Button>Save Preferences</Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeTab === "account" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6 md:p-8">
                <h3 className="text-lg font-heading font-semibold text-white mb-6 border-b border-white/5 pb-4">
                  Account Profile
                </h3>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border border-white/10 p-4 rounded-xl bg-black/20">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                      <Lock className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-white">Administrator</h4>
                      <p className="text-sm text-gray-400">Manage your system credentials</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">Display Name</label>
                      <input 
                        type="text" 
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full max-w-md h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">Email Address (Cannot be changed)</label>
                      <input 
                        type="email" 
                        value={session?.email || "admin@company.com"}
                        className="w-full max-w-md h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500/50 cursor-not-allowed opacity-70"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">Set New Password</label>
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current password"
                        className="w-full max-w-md h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex gap-4 items-center">
                    <Button onClick={handleUpdateProfile} disabled={profileSaving}>
                      {profileSaving ? "Updating..." : "Update Profile"}
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        clearAuthSession();
                        window.location.href = "/login";
                      }}
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                    >
                      Sign Out
                    </Button>
                    {profileSuccess && <span className="text-sm text-green-400 ml-4">Profile updated successfully</span>}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeTab === "notifications" && userSettings && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="p-6 md:p-8">
                <h3 className="text-lg font-heading font-semibold text-white mb-6 border-b border-white/5 pb-4">
                  Notification Preferences
                </h3>
                
                <div className="space-y-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Critical Threat Alerts</h4>
                      <p className="text-xs text-gray-400 max-w-md">Receive immediate email alerts when a highly malicious or targeted threat is detected.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={userSettings.notif_critical} 
                        onChange={(e) => setUserSettings({...userSettings, notif_critical: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Quarantine Digests</h4>
                      <p className="text-xs text-gray-400 max-w-md">Send users a daily digest of emails that were caught and quarantined.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={userSettings.notif_quarantine} 
                        onChange={(e) => setUserSettings({...userSettings, notif_quarantine: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Daily System Summary</h4>
                      <p className="text-xs text-gray-400 max-w-md">Receive a high-level summary of the day's traffic and mitigated threats.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={userSettings.notif_daily} 
                        onChange={(e) => setUserSettings({...userSettings, notif_daily: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white mb-1">Weekly Analytics Report</h4>
                      <p className="text-xs text-gray-400 max-w-md">Receive a comprehensive PDF report outlining long-term trends and attack vectors.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={userSettings.notif_weekly} 
                        onChange={(e) => setUserSettings({...userSettings, notif_weekly: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                    </label>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex justify-end">
                    <Button 
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await updateSettings(userSettings);
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Preferences"}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeTab !== "email" && activeTab !== "account" && activeTab !== "notifications" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-gray-500">
              <ActiveIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Settings panel for {currentTab.label} coming soon.</p>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
