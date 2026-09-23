import AnimatedBackground from "@/components/ui/AnimatedBackground";
import Navbar from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import Stats from "@/components/sections/Stats";
import Features from "@/components/sections/Features";
import Architecture from "@/components/sections/Architecture";
import DashboardPreview from "@/components/sections/DashboardPreview";
import ResearchTimeline from "@/components/sections/ResearchTimeline";
import Setup from "@/components/sections/Setup";
import Standards from "@/components/sections/Standards";
import TechStack from "@/components/sections/TechStack";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <Navbar />
      
      <div className="flex flex-col gap-0">
        <Hero />
        <Stats />
        <Features />
        <Architecture />
        <DashboardPreview />
        <ResearchTimeline />
        <Setup />
        <Standards />
        <TechStack />
        <Contact />
      </div>

      <Footer />
    </main>
  );
}
