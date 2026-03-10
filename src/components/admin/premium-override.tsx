"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PremiumUser {
  id: string;
  name: string | null;
  email: string;
  isPremiumOverride: boolean;
  pollingConfig: { interval: string; status: string } | null;
}

export function AdminPremiumOverride() {
  const [users, setUsers] = useState<PremiumUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/premium");
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggle = async (userId: string, enabled: boolean) => {
    setTogglingId(userId);
    try {
      await fetch("/api/admin/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, enabled }),
      });
      await fetchUsers();
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Email</th>
            <th className="pb-2 pr-4 font-medium">Current Interval</th>
            <th className="pb-2 pr-4 font-medium">Premium Override</th>
            <th className="pb-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b last:border-0">
              <td className="py-3 pr-4">{user.name ?? "—"}</td>
              <td className="py-3 pr-4 text-muted-foreground">{user.email}</td>
              <td className="py-3 pr-4">{user.pollingConfig?.interval ?? "—"}</td>
              <td className="py-3 pr-4">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  user.isPremiumOverride
                    ? "bg-amber-100 text-amber-800"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {user.isPremiumOverride ? "Active" : "Off"}
                </span>
              </td>
              <td className="py-3">
                {user.isPremiumOverride ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={togglingId === user.id}
                    onClick={() => toggle(user.id, false)}
                  >
                    {togglingId === user.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Revoke Premium
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    disabled={togglingId === user.id}
                    onClick={() => toggle(user.id, true)}
                  >
                    {togglingId === user.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Grant Premium
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-muted-foreground">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
