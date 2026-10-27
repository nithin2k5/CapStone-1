import AuthLayout from "@/components/auth/AuthLayout";

// Shared by every signed-out page so the shell persists across navigation
// between them, and only the form inside the card changes.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
