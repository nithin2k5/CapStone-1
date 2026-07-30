"use client";

import { motion } from "framer-motion";
import { User, Mail } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "@/components/ui/SocialIcons";

const team = [
  { role: "Project Lead", name: "Alex Chen", color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/5" },
  { role: "AI Engineer", name: "Sarah Jenkins", color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/5" },
  { role: "Backend Engineer", name: "David Kim", color: "text-green-400", border: "border-green-500/20", bg: "bg-green-500/5" },
  { role: "Frontend Engineer", name: "Elena Rodriguez", color: "text-orange-400", border: "border-orange-500/20", bg: "bg-orange-500/5" },
  { role: "Cyber Security Analyst", name: "Marcus Johnson", color: "text-red-400", border: "border-red-500/20", bg: "bg-red-500/5" },
];

export default function Team() {
  return (
    <section className="py-24 relative z-10">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6"
          >
            Meet the <span className="text-gradient-blue">Team</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg"
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
              className={`glass-card p-6 rounded-2xl border ${member.border} ${member.bg} flex flex-col items-center text-center group transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]`}
            >
              <div className="w-20 h-20 rounded-full bg-black/50 border border-white/10 flex items-center justify-center mb-4 overflow-hidden relative">
                <User className="w-10 h-10 text-gray-500 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
              </div>
              
              <h3 className="font-bold text-white mb-1">{member.name}</h3>
              <p className={`text-xs font-medium ${member.color} mb-4 uppercase tracking-wider`}>
                {member.role}
              </p>
              
              <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/5 w-full justify-center">
                <button className="text-gray-500 hover:text-white transition-colors">
                  <GithubIcon className="h-4 w-4" />
                </button>
                <button className="text-gray-500 hover:text-white transition-colors">
                  <LinkedinIcon className="h-4 w-4" />
                </button>
                <button className="text-gray-500 hover:text-white transition-colors">
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
