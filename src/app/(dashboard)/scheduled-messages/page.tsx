"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, Plus, Trash2, Loader2, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduledMessage {
  id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  label: string | null;
  scheduledFor: string;
  status: "DRAFT" | "SCHEDULED" | "DELIVERED" | "CANCELLED";
  deliveredAt: string | null;
  createdAt: string;
}

function statusBadge(status: ScheduledMessage["status"]) {
  const map: Record<ScheduledMessage["status"], { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-slate-700 text-slate-300" },
    SCHEDULED: { label: "Scheduled", className: "bg-indigo-900 text-indigo-300" },
    DELIVERED: { label: "Delivered", className: "bg-green-900 text-green-300" },
    CANCELLED: { label: "Cancelled", className: "bg-red-900 text-red-300" },
  };
  const { label, className } = map[status];
  return <span className={cn("px-2 py-1 text-xs rounded-full", className)}>{label}</span>;
}

export default function ScheduledMessagesPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages() {
    try {
      const res = await fetch("/api/scheduled-messages");
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      } else {
        setError(data.error || "Failed to load messages");
      }
    } catch {
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/scheduled-messages/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      } else {
        setError(data.error || "Failed to delete message");
      }
    } catch {
      setError("Failed to delete message");
    }
  }

  async function handleCancel(id: string) {
    try {
      const res = await fetch(`/api/scheduled-messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => prev.map((m) => (m.id === id ? data.data : m)));
      } else {
        setError(data.error || "Failed to cancel message");
      }
    } catch {
      setError("Failed to cancel message");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduled Messages</h1>
          <p className="text-slate-400">
            Messages delivered to recipients at a future date, independent of the dead man&apos;s switch
          </p>
        </div>
        <Button asChild>
          <Link href="/scheduled-messages/new">
            <Plus className="mr-2 h-4 w-4" /> New Message
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {messages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-slate-500 mb-4" />
            <p className="text-slate-400">No scheduled messages yet</p>
            <p className="text-sm text-slate-500 mb-4">
              Schedule a message to be delivered at a specific future date
            </p>
            <Button asChild>
              <Link href="/scheduled-messages/new">
                <Plus className="mr-2 h-4 w-4" /> Create Your First Message
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {messages.map((msg) => (
            <Card key={msg.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{msg.subject}</p>
                      {msg.label && (
                        <span className="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-300">
                          {msg.label}
                        </span>
                      )}
                      {statusBadge(msg.status)}
                    </div>
                    <p className="text-sm text-slate-400">
                      To: {msg.recipientName} &lt;{msg.recipientEmail}&gt;
                    </p>
                    <p className="text-xs text-slate-500">
                      {msg.status === "DELIVERED" && msg.deliveredAt
                        ? `Delivered ${new Date(msg.deliveredAt).toLocaleString()}`
                        : `Scheduled for ${new Date(msg.scheduledFor).toLocaleString()}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0 ml-4">
                  {msg.status !== "DELIVERED" && msg.status !== "CANCELLED" && (
                    <>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/scheduled-messages/${msg.id}`}>
                          <Edit3 className="h-4 w-4" />
                        </Link>
                      </Button>
                      {msg.status === "SCHEDULED" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-yellow-500">
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Message</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cancel this scheduled message? It will not be delivered. You can delete it afterward.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancel(msg.id)}
                                className="bg-yellow-600 hover:bg-yellow-700"
                              >
                                Cancel Message
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Message</AlertDialogTitle>
                            <AlertDialogDescription>
                              Permanently delete &quot;{msg.subject}&quot;? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(msg.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
