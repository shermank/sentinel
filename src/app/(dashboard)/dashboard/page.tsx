import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Users, Clock, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { CheckInButton } from "@/components/checkin-button";

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
    ? "text-green-600"
    : pollingConfig?.status === "TRIGGERED"
    ? "text-red-600"
    : "text-yellow-600";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {session.user.name?.split(" ")[0]}</h1>
          <p className="text-slate-600">Here&apos;s your digital legacy overview</p>
        </div>
        {pollingConfig?.status === "ACTIVE" && (
          <CheckInButton />
        )}
      </div>

      {needsSetup && (
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <Lock className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold">Set Up Your Vault</h3>
                <p className="text-sm text-slate-600">
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
            <Lock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vault?._count.items || 0}</div>
            <p className="text-xs text-slate-500">Encrypted items stored</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trustees</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trusteeCount}</div>
            <p className="text-xs text-slate-500">
              {subscription?.plan === "FREE" ? "1 max (Free)" : "Unlimited (Premium)"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Next Check-in</CardTitle>
            <Clock className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pollingConfig?.nextCheckInDue
                ? formatRelativeTime(pollingConfig.nextCheckInDue)
                : "Not set"}
            </div>
            <p className="text-xs text-slate-500">
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
            <p className="text-xs text-slate-500">
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
                <p className="text-sm text-slate-500">
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
    </div>
  );
}
