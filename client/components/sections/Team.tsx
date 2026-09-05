"use client";

import { motion } from "framer-motion";
import { User, Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/ui/SocialIcons";

const team = [
  { role: "Project Lead", name: "Alex Chen" },
  { role: "AI Engineer", name: "Sarah Jenkins" },
  { role: "Backend Engineer", name: "David Kim" },
  { role: "Frontend Engineer", name: "Elena Rodriguez" },
  { role: "Cyber Security Analyst", name: "Marcus Johnson" },
];

export default function Team() {
  return (
    <section className="py-24 relative z-10 bg-black">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-foreground"
          >
            Meet the <span className="text-muted-foreground">Team</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg"
          >
            The security experts and engineers behind the gateway.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          {team.map((member, index) => (
            <motion.div
              key={member.role}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="glass-card p-6 rounded-2xl border border-white/[0.06] flex flex-col items-center text-center group hover:border-border transition-all duration-300"
            >
              <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                <User className="w-10 h-10 text-gray-600 group-hover:text-muted-foreground transition-colors" />
              </div>

              <h3 className="font-bold text-foreground mb-1">{member.name}</h3>
              <p className="text-xs font-medium text-muted-foreground mb-4 uppercase tracking-wider">{member.role}</p>

              <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/[0.06] w-full justify-center">
                <button className="text-gray-600 hover:text-foreground transition-colors">
                  <GithubIcon className="h-4 w-4" />
                </button>
                <button className="text-gray-600 hover:text-foreground transition-colors">
                  <LinkedinIcon className="h-4 w-4" />
                </button>
                <button className="text-gray-600 hover:text-foreground transition-colors">
                  <Mail className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
