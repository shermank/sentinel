"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Settings, Clock, CreditCard, Loader2, CheckCircle } from "lucide-react";

interface PollingConfig {
  interval: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  status: string;
  nextCheckInDue?: string;
  lastCheckInAt?: string;
  gracePeriod1: number;
  gracePeriod2: number;
  gracePeriod3: number;
}

interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd?: string;
}

export default function SettingsPage() {
  const [pollingConfig, setPollingConfig] = useState<PollingConfig | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pollingRes, subRes] = await Promise.all([
        fetch("/api/polling"),
        fetch("/api/subscription"),
      ]);
      const pollingData = await pollingRes.json();
      const subData = await subRes.json();

      if (pollingData.success && pollingData.data) {
        setPollingConfig(pollingData.data);
      }
      if (subData.success && subData.data) {
        setSubscription(subData.data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updatePolling = async (updates: Partial<PollingConfig>) => {
    setSaving(true);
    try {
      const response = await fetch("/api/polling", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (data.success) {
        setPollingConfig(data.data);
        toast({ title: "Success", description: "Settings updated" });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: "monthly" }),
      });
      const data = await response.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      }
    } catch {
      toast({ title: "Error", description: "Failed to start checkout", variant: "destructive" });
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      }
    } catch {
      toast({ title: "Error", description: "Failed to open billing portal", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isPremium = subscription?.plan === "PREMIUM";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-slate-600">Manage your polling and subscription settings</p>
      </div>

      <Tabs defaultValue="polling">
        <TabsList>
          <TabsTrigger value="polling">
            <Clock className="h-4 w-4 mr-2" /> Polling
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-2" /> Subscription
          </TabsTrigger>
        </TabsList>

        <TabsContent value="polling" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Check-in Schedule</CardTitle>
              <CardDescription>Configure how often we check if you&apos;re OK</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Check-in Interval</Label>
                <Select
                  value={pollingConfig?.interval || "MONTHLY"}
                  onValueChange={(value) => updatePolling({ interval: value as "WEEKLY" | "BIWEEKLY" | "MONTHLY" })}
                  disabled={saving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY" disabled={!isPremium}>
                      Weekly {!isPremium && "(Premium)"}
                    </SelectItem>
                    <SelectItem value="BIWEEKLY" disabled={!isPremium}>
                      Bi-weekly {!isPremium && "(Premium)"}
                    </SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-slate-500">Receive check-in reminders via email</p>
                </div>
                <Switch
                  checked={pollingConfig?.emailEnabled ?? true}
                  onCheckedChange={(checked) => updatePolling({ emailEnabled: checked })}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications {!isPremium && "(Premium)"}</Label>
                  <p className="text-sm text-slate-500">Receive check-in reminders via SMS</p>
                </div>
                <Switch
                  checked={pollingConfig?.smsEnabled ?? false}
                  onCheckedChange={(checked) => updatePolling({ smsEnabled: checked })}
                  disabled={saving || !isPremium}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Current polling status and information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Current Status</Label>
                  <p className="font-medium">{pollingConfig?.status || "Not configured"}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Next Check-in Due</Label>
                  <p className="font-medium">
                    {pollingConfig?.nextCheckInDue
                      ? new Date(pollingConfig.nextCheckInDue).toLocaleDateString()
                      : "Not scheduled"}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Last Check-in</Label>
                  <p className="font-medium">
                    {pollingConfig?.lastCheckInAt
                      ? new Date(pollingConfig.lastCheckInAt).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold flex items-center">
                    {subscription?.plan || "FREE"}
                    {isPremium && <CheckCircle className="ml-2 h-5 w-5 text-green-500" />}
                  </p>
                  <p className="text-slate-500">
                    {isPremium
                      ? `Renews ${subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "soon"}`
                      : "Limited features"}
                  </p>
                </div>
                {isPremium ? (
                  <Button variant="outline" onClick={handleManageSubscription}>
                    Manage Subscription
                  </Button>
                ) : (
                  <Button onClick={handleUpgrade}>Upgrade to Premium</Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className={`p-4 rounded-lg border ${!isPremium ? "border-indigo-500" : ""}`}>
                  <h3 className="font-semibold mb-2">Free</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>1 Trustee</li>
                    <li>Monthly check-ins only</li>
                    <li>Email notifications</li>
                    <li>Unlimited vault items</li>
                  </ul>
                </div>
                <div className={`p-4 rounded-lg border ${isPremium ? "border-indigo-500 bg-indigo-50" : ""}`}>
                  <h3 className="font-semibold mb-2">Premium - $9/mo</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>Unlimited trustees</li>
                    <li>Weekly/Bi-weekly check-ins</li>
                    <li>Email + SMS notifications</li>
                    <li>Priority support</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
