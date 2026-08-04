"use client";

import { motion } from "framer-motion";

const technologies = [
  "Next.js", "TypeScript", "Tailwind CSS", "React 19",
  "Node.js", "Python", "FastAPI", "TensorFlow",
  "Redis", "PostgreSQL", "Docker", "Kubernetes",
  "OpenAI", "VirusTotal API", "YARA"
];

export default function TechStack() {
  return (
    <section className="py-24 relative z-10 overflow-hidden bg-black border-y border-purple-500/15">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6 text-white"
          >
            Powered by <span className="text-gradient-blue">Modern Tech</span>
          </motion.h2>
        </div>

        {/* Infinite Scroll Marquee */}
        <div className="relative flex overflow-x-hidden group">
          <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
          
          <motion.div 
            className="flex gap-6 py-4 whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 22, ease: "linear", repeat: Infinity }}
          >
            {[...technologies, ...technologies].map((tech, index) => (
              <div 
                key={index}
                className="glass px-8 py-4 rounded-2xl border border-indigo-500/25 text-indigo-200 font-semibold hover:text-white hover:border-purple-400 hover:bg-purple-500/15 hover:shadow-[0_0_25px_rgba(139,92,246,0.35)] transition-all duration-300 cursor-default shadow-[0_0_15px_rgba(0,0,0,0.8)]"
              >
                {tech}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
