import Link from "next/link";
import { Shield, ArrowLeft, Book, Code, Plug, Key } from "lucide-react";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

const docsSections = [
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

export const metadata = {
  title: "Documentation | Secure Email Gateway",
  description: "Documentation for Secure Email Gateway API and integration",
};

const sectionIcons = [Book, Code, Plug, Key];

export default function DocsPage() {
  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <Shield className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-4xl font-bold text-foreground">Documentation</h1>
            <p className="text-muted-foreground mt-1">Guides, API reference, and integration docs</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {docsSections.map((section, index) => {
            const Icon = sectionIcons[index] ?? Book;
            return (
              <div
                key={section.title}
                className="glass-card rounded-2xl p-6 border border-white/[0.06] hover:border-border transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-heading text-xl font-bold text-foreground">{section.title}</h2>
                </div>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item}>
                      <Link
                        href="#"
                        className="text-muted-foreground hover:text-foreground transition-colors text-sm block py-1.5"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-12 glass-card rounded-2xl p-8 border border-white/[0.05]">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Quick Start</h2>
          <pre className="bg-black/50 rounded-xl p-6 overflow-x-auto text-sm text-gray-300 font-mono border border-white/[0.05]">
{`# Install the CLI
npm install -g @seg/cli

# Configure your gateway
seg init --domain yourcompany.com

# Start scanning
seg scan --mode live`}
          </pre>
        </div>
      </div>
    </div>
  );
}
