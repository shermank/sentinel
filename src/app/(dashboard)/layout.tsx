import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.emailVerified) {
    redirect("/verify-email?pending=true");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-indigo-50">
      <DashboardNav user={session.user} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
