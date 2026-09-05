"use client";

import { motion } from "framer-motion";
import { Send, Mail, User, MessageSquare } from "lucide-react";

export default function Contact() {
  return (
    <section id="contact" className="py-24 relative z-10 bg-black">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6 text-foreground">
                Ready to secure your <br />
                <span className="text-gradient">infrastructure?</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Get in touch with our cybersecurity specialists for an enterprise evaluation, neural inspection demo, or custom architecture deployment.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-gray-200">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/15 flex items-center justify-center border border-purple-500/40 shadow-[0_0_20px_rgba(139,92,246,0.25)]">
                    <Mail className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase text-purple-300/70 tracking-wider">Email Us</div>
                    <div className="font-bold text-lg text-foreground">security@gateway.local</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <form className="glass-card p-8 rounded-3xl border border-indigo-500/30 shadow-[0_0_60px_rgba(139,92,246,0.2)] relative overflow-hidden bg-neutral-950/90">
                {/* Background Purple Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-indigo-200 mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                      <input 
                        type="text" 
                        placeholder="John Doe"
                        className="w-full bg-black/80 border border-indigo-500/30 rounded-xl py-3.5 pl-12 pr-4 text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-indigo-200 mb-2">Work Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                      <input 
                        type="email" 
                        placeholder="john@company.com"
                        className="w-full bg-black/80 border border-indigo-500/30 rounded-xl py-3.5 pl-12 pr-4 text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-indigo-200 mb-2">Message</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-purple-400" />
                      <textarea 
                        rows={4}
                        placeholder="Describe your security infrastructure goals..."
                        className="w-full bg-black/80 border border-indigo-500/30 rounded-xl py-3.5 pl-12 pr-4 text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-purple-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all resize-none"
                      />
                    </div>
                  </div>

                  <button 
                    type="button"
                    className="w-full py-4 btn-primary rounded-xl text-base flex items-center justify-center gap-2 group shadow-[0_0_30px_rgba(139,92,246,0.45)]"
                  >
                    Send Message
                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </button>
                </div>
              </form>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
}
