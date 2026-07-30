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
    <section className="py-24 relative z-10 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-3xl md:text-5xl font-bold mb-6"
          >
            Powered by <span className="text-gradient-blue">Modern Tech</span>
          </motion.h2>
        </div>

        {/* Infinite Scroll Marquee */}
        <div className="relative flex overflow-x-hidden group">
          <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
          <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />
          
          <motion.div 
            className="flex gap-4 py-4 whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 20, ease: "linear", repeat: Infinity }}
          >
            {/* Double the array for seamless looping */}
            {[...technologies, ...technologies].map((tech, index) => (
              <div 
                key={index}
                className="glass px-8 py-4 rounded-xl border border-white/10 text-gray-300 font-medium hover:text-white hover:border-blue-500/50 hover:bg-blue-500/10 transition-all cursor-default shadow-[0_0_15px_rgba(0,0,0,0.5)]"
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
