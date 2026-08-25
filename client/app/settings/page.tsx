"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Mail, Lock, Bell, Server, KeyRound } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getAuthSession, clearAuthSession, type AuthSession } from "@/lib/auth";

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

  useEffect(() => {
    setSession(getAuthSession());
  }, []);

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
                        value={session?.name || "Admin User"}
                        onChange={() => {}}
                        className="w-full max-w-md h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">Email Address</label>
                      <input 
                        type="email" 
                        value={session?.email || "admin@company.com"}
                        className="w-full max-w-md h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-indigo-500/50"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex gap-4">
                    <Button>Update Profile</Button>
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
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {activeTab !== "email" && activeTab !== "account" && (
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
