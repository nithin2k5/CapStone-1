import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

export const metadata = {
  title: "Privacy Policy | Secure Email Gateway",
  description: "Privacy policy and terms of service",
};

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />

      <div className="relative z-10 container mx-auto px-6 py-24 max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <h1 className="font-heading text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>

        <div className="glass-card rounded-2xl p-8 border border-white/[0.05] prose prose-invert max-w-none">
          <div className="space-y-6 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-foreground mb-3">1. Information We Collect</h2>
              <p>
                Secure Email Gateway processes email metadata including sender addresses, recipient
                addresses, subject lines, and attachment hashes for threat detection purposes. We do
                not store email body content unless explicitly configured for quarantine review.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground mb-3">2. How We Use Data</h2>
              <p>
                Collected data is used exclusively for phishing detection, malware scanning, and
                security analytics. Aggregated threat intelligence may be shared with our security
                partners to improve global email security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground mb-3">3. Data Retention</h2>
              <p>
                Threat logs are retained for 90 days by default. Quarantined emails are retained
                for 30 days before automatic deletion. Retention periods are configurable in your
                dashboard settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground mb-3">4. Security</h2>
              <p>
                All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption.
                Our infrastructure complies with ISO 27001 and SOC 2 Type II standards.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-foreground mb-3">5. Contact</h2>
              <p>
                For privacy-related inquiries, contact our Data Protection Officer at{" "}
                <span className="text-muted-foreground">privacy@gateway.local</span>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
