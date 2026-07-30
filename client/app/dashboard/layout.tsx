import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

export const metadata = {
  title: "Dashboard | Secure Email Gateway",
  description: "SOC dashboard for monitoring email threats and security posture",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <DashboardSidebar />
      <main className="pl-64 min-h-screen transition-all duration-300 max-lg:pl-20">
        <div className="p-6 md:p-8 max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
