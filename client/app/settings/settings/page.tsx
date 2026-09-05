"use client";

import { motion } from "framer-motion";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { AuthInput, AuthButton } from "@/components/auth/AuthForm";
import { Bell, Shield, Key, Globe, Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <DashboardHeader
        title="Settings"
        subtitle="Configure your gateway and notification preferences"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 border border-white/[0.05]"
        >
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Organization Profile</h3>
          </div>
          <form className="space-y-4">
            <AuthInput label="Organization Name" defaultValue="Acme Corporation" />
            <AuthInput label="Admin Email" type="email" defaultValue="admin@acme.com" />
            <AuthInput label="Domain" defaultValue="acme.com" />
            <AuthButton type="button" variant="primary">
              <Save className="w-4 h-4" />
              Save Changes
            </AuthButton>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6 border border-white/[0.05]"
        >
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Notifications</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: "Critical threat alerts", enabled: true },
              { label: "Daily summary reports", enabled: true },
              { label: "Quarantine notifications", enabled: false },
              { label: "Weekly analytics digest", enabled: true },
            ].map((item) => (
              <label
                key={item.label}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.03] cursor-pointer hover:bg-white/[0.04] transition-colors"
              >
                <span className="text-sm text-gray-300">{item.label}</span>
                <input
                  type="checkbox"
                  defaultChecked={item.enabled}
                  className="w-4 h-4 rounded border-border bg-black text-foreground"
                />
              </label>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6 border border-white/[0.05]"
        >
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium text-foreground">API Keys</h3>
          </div>
          <div className="space-y-4">
            <AuthInput
              label="Production API Key"
              defaultValue="seg_live_••••••••••••••••"
              readOnly
            />
            <div className="flex gap-3">
              <AuthButton type="button" variant="secondary" className="flex-1">
                Regenerate
              </AuthButton>
              <AuthButton type="button" variant="ghost" className="flex-1">
                Copy Key
              </AuthButton>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6 border border-white/[0.05]"
        >
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Detection Sensitivity</h3>
          </div>
          <div className="space-y-6">
            {[
              { label: "Phishing Detection", value: 85 },
              { label: "Malware Scanning", value: 92 },
              { label: "URL Filtering", value: 78 },
              { label: "AI Risk Scoring", value: 88 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">{item.label}</span>
                  <span className="text-muted-foreground font-medium">{item.value}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue={item.value}
                  className="w-full h-2 bg-foreground/10 rounded-full appearance-none cursor-pointer accent-white"
                />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}
