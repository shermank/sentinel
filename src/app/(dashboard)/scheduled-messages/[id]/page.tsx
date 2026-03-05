"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduledMessage {
  id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  label: string | null;
  scheduledFor: string;
  status: "DRAFT" | "SCHEDULED" | "DELIVERED" | "CANCELLED";
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export default function ScheduledMessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [message, setMessage] = useState<ScheduledMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [label, setLabel] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "SCHEDULED">("SCHEDULED");

  useEffect(() => {
    fetchMessage();
  }, [id]);

  async function fetchMessage() {
    try {
      const res = await fetch(`/api/scheduled-messages/${id}`);
      const data = await res.json();
      if (data.success) {
        populate(data.data);
      } else {
        setError(data.error || "Message not found");
      }
    } catch {
      setError("Failed to load message");
    } finally {
      setLoading(false);
    }
  }

  function populate(msg: ScheduledMessage) {
    setMessage(msg);
    setRecipientName(msg.recipientName);
    setRecipientEmail(msg.recipientEmail);
    setSubject(msg.subject);
    setBody(msg.body);
    setLabel(msg.label ?? "");
    setScheduledFor(new Date(msg.scheduledFor).toISOString().slice(0, 16));
    setStatus(msg.status === "DRAFT" ? "DRAFT" : "SCHEDULED");
  }

  async function handleSave() {
    setError("");
    if (!recipientName || !recipientEmail || !subject || !body || !scheduledFor) {
      setError("All required fields must be filled in");
      return;
    }
    if (status === "SCHEDULED" && new Date(scheduledFor) <= new Date()) {
      setError("Scheduled time must be in the future");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/scheduled-messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          recipientEmail,
          subject,
          body,
          label: label || null,
          scheduledFor: new Date(scheduledFor).toISOString(),
          status,
        }),
      });
      const data = await res.json();
      if (data.success) {
        populate(data.data);
        setEditing(false);
      } else {
        setError(data.error || "Failed to save changes");
      }
    } catch {
      setError("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    try {
      const res = await fetch(`/api/scheduled-messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await res.json();
      if (data.success) {
        populate(data.data);
      } else {
        setError(data.error || "Failed to cancel");
      }
    } catch {
      setError("Failed to cancel message");
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/scheduled-messages/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/scheduled-messages");
      } else {
        setError(data.error || "Failed to delete");
      }
    } catch {
      setError("Failed to delete message");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-300">
          {error || "Message not found"}
        </div>
      </div>
    );
  }

  const isEditable = message.status === "DRAFT" || message.status === "SCHEDULED";
  const minDateTime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/scheduled-messages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold truncate">{message.subject}</h1>
            {statusBadge(message.status)}
          </div>
          <p className="text-slate-400 text-sm">
            To: {message.recipientName} &lt;{message.recipientEmail}&gt;
          </p>
        </div>
        {isEditable && !editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {editing ? "Edit Message" : "Message Details"}
          </CardTitle>
          {message.status === "DELIVERED" && message.deliveredAt && (
            <CardDescription>
              Delivered on {new Date(message.deliveredAt).toLocaleString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipient Name *</Label>
                  <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Recipient Email *</Label>
                  <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Label (optional)</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Birthday" />
              </div>

              <div className="space-y-2">
                <Label>Message *</Label>
                <textarea
                  className="w-full min-h-[200px] rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Send Date &amp; Time *</Label>
                <Input
                  type="datetime-local"
                  value={scheduledFor}
                  min={minDateTime}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="bg-slate-900"
                />
              </div>

              <div className="space-y-2">
                <Label>Save as</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus("SCHEDULED")}
                    className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                      status === "SCHEDULED"
                        ? "border-indigo-500 bg-indigo-900/40 text-indigo-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    Scheduled
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("DRAFT")}
                    className={`flex-1 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                      status === "DRAFT"
                        ? "border-indigo-500 bg-indigo-900/40 text-indigo-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    Draft
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setEditing(false); populate(message); setError(""); }}
                >
                  Discard
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </>
          ) : (
            <>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-slate-400">Recipient</dt>
                  <dd>{message.recipientName} &lt;{message.recipientEmail}&gt;</dd>
                </div>
                {message.label && (
                  <div>
                    <dt className="text-slate-400">Label</dt>
                    <dd>{message.label}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-slate-400">Scheduled For</dt>
                  <dd>{new Date(message.scheduledFor).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Message</dt>
                  <dd className="mt-1 whitespace-pre-wrap bg-slate-800 rounded-md p-3 leading-relaxed">
                    {message.body}
                  </dd>
                </div>
              </dl>

              {isEditable && (
                <div className="flex items-center gap-3 pt-4 border-t border-slate-700">
                  {message.status === "SCHEDULED" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="text-yellow-400 border-yellow-700 hover:bg-yellow-900/20">
                          Cancel Delivery
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Scheduled Delivery</AlertDialogTitle>
                          <AlertDialogDescription>
                            This message will not be sent. You can still delete it afterward.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancel}
                            className="bg-yellow-600 hover:bg-yellow-700"
                          >
                            Cancel Delivery
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-red-400 border-red-700 hover:bg-red-900/20 ml-auto">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Message</AlertDialogTitle>
                        <AlertDialogDescription>
                          Permanently delete &quot;{message.subject}&quot;? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
