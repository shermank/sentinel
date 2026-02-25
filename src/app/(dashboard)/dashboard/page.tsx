import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Landmark,
  Smartphone,
  Bitcoin,
  Globe,
  Home,
  Briefcase,
  Heart,
  Mail,
  Key,
} from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { CheckInButton } from "@/components/checkin-button";

const useCaseCategories = [
  {
    title: "Financial",
    icon: Landmark,
    color: "text-green-500",
    bgColor: "bg-green-100",
    examples: ["Bank accounts", "Credit cards", "Investment logins"],
  },
  {
    title: "Crypto",
    icon: Bitcoin,
    color: "text-orange-500",
    bgColor: "bg-orange-100",
    examples: ["Wallet seed phrases", "Exchange logins", "Hardware PINs"],
  },
  {
    title: "Devices",
    icon: Smartphone,
    color: "text-blue-500",
    bgColor: "bg-blue-100",
    examples: ["Phone passcodes", "Computer passwords", "Smart home"],
  },
  {
    title: "Online",
    icon: Globe,
    color: "text-purple-500",
    bgColor: "bg-purple-100",
    examples: ["Email accounts", "Social media", "Cloud storage"],
  },
  {
    title: "Property",
    icon: Home,
    color: "text-amber-500",
    bgColor: "bg-amber-100",
    examples: ["Safe combinations", "Vehicle info", "Storage units"],
  },
  {
    title: "Legal",
    icon: Briefcase,
    color: "text-red-500",
    bgColor: "bg-red-100",
    examples: ["Will location", "Insurance", "Business accounts"],
  },
  {
    title: "Medical",
    icon: Heart,
    color: "text-pink-500",
    bgColor: "bg-pink-100",
    examples: ["Health portals", "Prescriptions", "Emergency contacts"],
  },
  {
    title: "Messages",
    icon: Mail,
    color: "text-indigo-500",
    bgColor: "bg-indigo-100",
    examples: ["Letters to loved ones", "Final wishes", "Instructions"],
  },
];

async function getDashboardData(userId: string) {
  const [vault, trustees, pollingConfig, subscription] = await Promise.all([
    prisma.vault.findUnique({
      where: { userId },
      include: { _count: { select: { items: true } } },
    }),
    prisma.trustee.count({
      where: { userId, status: { not: "REVOKED" } },
    }),
    prisma.pollingConfig.findUnique({
      where: { userId },
    }),
    prisma.subscription.findUnique({
      where: { userId },
    }),
  ]);

  return { vault, trusteeCount: trustees, pollingConfig, subscription };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { vault, trusteeCount, pollingConfig, subscription } = await getDashboardData(
    session.user.id
  );

  const needsSetup = !vault;
  const statusColor = pollingConfig?.status === "ACTIVE"
    ? "text-green-400"
    : pollingConfig?.status === "TRIGGERED"
    ? "text-red-400"
    : "text-yellow-400";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {session.user.name?.split(" ")[0]}</h1>
          <p className="text-slate-400">Here&apos;s your digital legacy overview</p>
        </div>
        {pollingConfig?.status === "ACTIVE" && (
          <CheckInButton />
        )}
      </div>

      {needsSetup && (
        <Card className="border-indigo-800 bg-indigo-950">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-900 rounded-full flex items-center justify-center">
                <Lock className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold">Set Up Your Vault</h3>
                <p className="text-sm text-slate-400">
                  Create your encrypted vault to store passwords and documents
                </p>
              </div>
            </div>
            <Link href="/vault">
              <Button>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vault Items</CardTitle>
            <Lock className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vault?._count.items || 0}</div>
            <p className="text-xs text-slate-400">Encrypted items stored</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trustees</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trusteeCount}</div>
            <p className="text-xs text-slate-400">
              {subscription?.plan === "FREE" ? "1 max (Free)" : "Unlimited (Premium)"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Next Check-in</CardTitle>
            <Clock className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pollingConfig?.nextCheckInDue
                ? formatRelativeTime(pollingConfig.nextCheckInDue)
                : "Not set"}
            </div>
            <p className="text-xs text-slate-400">
              {pollingConfig?.interval?.toLowerCase() || "monthly"} polling
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {pollingConfig?.status === "ACTIVE" ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${statusColor}`}>
              {pollingConfig?.status || "SETUP"}
            </div>
            <p className="text-xs text-slate-400">
              {pollingConfig?.currentMissedCheckIns || 0} missed check-ins
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks you might want to do</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/vault" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Lock className="mr-2 h-4 w-4" />
                Add to Vault
              </Button>
            </Link>
            <Link href="/trustees" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Trustees
              </Button>
            </Link>
            <Link href="/settings" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Clock className="mr-2 h-4 w-4" />
                Configure Polling
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Your current plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {subscription?.plan || "FREE"}
                </p>
                <p className="text-sm text-slate-400">
                  {subscription?.plan === "PREMIUM"
                    ? "All features unlocked"
                    : "Limited features"}
                </p>
              </div>
              {subscription?.plan !== "PREMIUM" && (
                <Link href="/settings">
                  <Button>Upgrade</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="mr-2 h-5 w-5 text-indigo-500" />
            What to Store in Your Vault
          </CardTitle>
          <CardDescription>
            Ideas for what your trustees might need access to
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {useCaseCategories.map((category) => (
              <div
                key={category.title}
                className="p-4 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`p-1.5 rounded ${category.bgColor}`}>
                    <category.icon className={`h-4 w-4 ${category.color}`} />
                  </div>
                  <h3 className="font-medium text-sm">{category.title}</h3>
                </div>
                <ul className="text-xs text-slate-500 space-y-1">
                  {category.examples.map((example) => (
                    <li key={example} className="flex items-center">
                      <span className="w-1 h-1 bg-slate-300 rounded-full mr-2" />
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <p className="text-sm text-slate-500">
              All data is encrypted with AES-256 before leaving your browser
            </p>
            <Link href="/use-cases">
              <Button variant="link" size="sm" className="text-indigo-600">
                View all use cases <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
