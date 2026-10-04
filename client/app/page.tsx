import AnimatedBackground from "@/components/ui/AnimatedBackground";
import Navbar from "@/components/sections/Navbar";
import Hero from "@/components/sections/Hero";
import Stats from "@/components/sections/Stats";
import Features from "@/components/sections/Features";
import Architecture from "@/components/sections/Architecture";
import DashboardPreview from "@/components/sections/DashboardPreview";
import HowToUse from "@/components/sections/HowToUse";
import ResearchTimeline from "@/components/sections/ResearchTimeline";
import Standards from "@/components/sections/Standards";
import TechStack from "@/components/sections/TechStack";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />
      <Navbar />

      <div>
        <Hero />
        <Stats />
        <Features />
        <Architecture />
        <DashboardPreview />
        <HowToUse />
        <ResearchTimeline />
        <Standards />
        <TechStack />
        <Contact />
      </div>

      <Footer />
    </div>
  );
}
