"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Clock } from "lucide-react";

export default function NewScheduledMessagePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [label, setLabel] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "SCHEDULED">("SCHEDULED");

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
      const res = await fetch("/api/scheduled-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          recipientEmail,
          subject,
          body,
          label: label || undefined,
          scheduledFor: new Date(scheduledFor).toISOString(),
          status,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/scheduled-messages");
      } else {
        setError(data.error || "Failed to create message");
      }
    } catch {
      setError("Failed to create message");
    } finally {
      setSaving(false);
    }
  }

  // Minimum datetime for input (now)
  const minDateTime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/scheduled-messages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Scheduled Message</h1>
          <p className="text-slate-400 text-sm">Compose a message to be delivered at a specific future date</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Compose Message
          </CardTitle>
          <CardDescription>
            This message will be sent directly to the recipient&apos;s email at the scheduled time,
            independent of the dead man&apos;s switch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name *</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email *</Label>
              <Input
                id="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Happy 30th Birthday!"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label (optional)</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Birthday, Anniversary, Graduation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message *</Label>
            <textarea
              id="body"
              className="w-full min-h-[200px] rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledFor">Send Date &amp; Time *</Label>
            <Input
              id="scheduledFor"
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
                Scheduled — will send automatically
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
                Draft — save without scheduling
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" asChild>
              <Link href="/scheduled-messages">Cancel</Link>
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status === "SCHEDULED" ? "Schedule Message" : "Save Draft"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
