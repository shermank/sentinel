"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, Loader2, RefreshCw, AlertTriangle, Clock, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatRelativeTime } from "@/lib/utils";

interface UserData {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  status: string;
  lastCheckInAt: string | null;
  nextCheckInDue: string | null;
  missedCheckIns: number;
  interval: string | null;
  pendingCheckIns: number;
}

export function AdminUserTable() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingUser, setValidatingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/checkin");
      const data = await response.json();

      if (data.success) {
        setUsers(data.data);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch users",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleValidateCheckIn = async (userId: string, userEmail: string) => {
    setValidatingUser(userId);
    try {
      const response = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Check-in Validated",
          description: `Successfully validated check-in for ${userEmail}`,
        });
        // Refresh the user list
        fetchUsers();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to validate check-in",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setValidatingUser(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    setDeletingUser(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "User Deleted",
          description: `Successfully deleted ${userEmail}`,
        });
        fetchUsers();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete user",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      ACTIVE: { color: "bg-green-900/50 text-green-300", icon: <CheckCircle className="h-3 w-3" /> },
      GRACE_1: { color: "bg-yellow-900/50 text-yellow-300", icon: <AlertTriangle className="h-3 w-3" /> },
      GRACE_2: { color: "bg-orange-900/50 text-orange-300", icon: <AlertTriangle className="h-3 w-3" /> },
      GRACE_3: { color: "bg-red-900/50 text-red-300", icon: <AlertTriangle className="h-3 w-3" /> },
      TRIGGERED: { color: "bg-red-900/50 text-red-300", icon: <AlertTriangle className="h-3 w-3" /> },
      PAUSED: { color: "bg-gray-800 text-gray-300", icon: <Clock className="h-3 w-3" /> },
      NOT_CONFIGURED: { color: "bg-gray-800 text-gray-400", icon: null },
    };

    const config = statusConfig[status] || statusConfig.NOT_CONFIGURED;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        No users found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchUsers}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-3 font-medium text-slate-400">User</th>
              <th className="pb-3 font-medium text-slate-400">Status</th>
              <th className="pb-3 font-medium text-slate-400">Last Check-in</th>
              <th className="pb-3 font-medium text-slate-400">Next Due</th>
              <th className="pb-3 font-medium text-slate-400">Missed</th>
              <th className="pb-3 font-medium text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="py-4">
                  <div>
                    <p className="font-medium">{user.name || "No name"}</p>
                    <p className="text-sm text-slate-400">{user.email}</p>
                  </div>
                </td>
                <td className="py-4">
                  {getStatusBadge(user.status)}
                </td>
                <td className="py-4 text-sm text-slate-400">
                  {user.lastCheckInAt
                    ? formatRelativeTime(new Date(user.lastCheckInAt))
                    : "Never"}
                </td>
                <td className="py-4 text-sm text-slate-400">
                  {user.nextCheckInDue
                    ? formatRelativeTime(new Date(user.nextCheckInDue))
                    : "Not set"}
                </td>
                <td className="py-4">
                  <span className={`font-medium ${user.missedCheckIns > 0 ? "text-red-400" : "text-slate-400"}`}>
                    {user.missedCheckIns}
                  </span>
                </td>
                <td className="py-4 text-right space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleValidateCheckIn(user.id, user.email)}
                    disabled={validatingUser === user.id || user.status === "NOT_CONFIGURED" || user.status === "TRIGGERED"}
                  >
                    {validatingUser === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    Validate
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingUser === user.id}
                      >
                        {deletingUser === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete <strong>{user.email}</strong> and all their data including vault items, trustees, check-ins, and subscription. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
