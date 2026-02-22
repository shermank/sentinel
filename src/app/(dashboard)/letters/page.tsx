"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Lock, Plus, Mail, Trash2, Edit3, Loader2, Send, FileEdit } from "lucide-react";
import { unlockVault, encryptVaultItem, decryptVaultItem } from "@/lib/crypto/client";

interface Letter {
  id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  encryptedBody: string;
  nonce: string;
  status: "DRAFT" | "READY" | "DELIVERED";
  createdAt: string;
  updatedAt: string;
}

interface Vault {
  id: string;
  encryptedMasterKey: string;
  masterKeySalt: string;
  masterKeyNonce: string;
}

export default function LettersPage() {
  const [vault, setVault] = useState<Vault | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [password, setPassword] = useState("");
  const [noVault, setNoVault] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVault();
  }, []);

  const fetchVault = async () => {
    try {
      const response = await fetch("/api/vault");
      const data = await response.json();
      if (data.success && data.data) {
        setVault(data.data);
      } else {
        setNoVault(true);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch vault", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!vault) return;
    setUnlocking(true);
    try {
      const key = await unlockVault(
        password,
        vault.encryptedMasterKey,
        vault.masterKeySalt,
        vault.masterKeyNonce
      );
      setMasterKey(key);
      setPassword("");
      toast({ title: "Success", description: "Vault unlocked" });
    } catch {
      toast({ title: "Error", description: "Invalid password", variant: "destructive" });
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (noVault || !vault) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" /> Vault Required
            </CardTitle>
            <CardDescription>
              You need to set up your vault before creating final letters. Letter contents are encrypted with your vault key.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/vault">Set Up Vault</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!masterKey) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" /> Unlock Vault
            </CardTitle>
            <CardDescription>Enter your vault password to access your final letters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Vault Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your vault password"
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              />
            </div>
            <Button onClick={handleUnlock} className="w-full" disabled={unlocking}>
              {unlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unlock
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <LettersContent masterKey={masterKey} />;
}

function LettersContent({ masterKey }: { masterKey: CryptoKey }) {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Form fields
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    try {
      const response = await fetch("/api/letters");
      const data = await response.json();
      if (data.success) {
        setLetters(data.data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch letters", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRecipientName("");
    setRecipientEmail("");
    setSubject("");
    setBody("");
  };

  const handleCompose = async () => {
    if (!recipientName || !recipientEmail || !subject || !body) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { encryptedData, nonce } = await encryptVaultItem(body, masterKey);

      const response = await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          recipientEmail,
          subject,
          encryptedBody: encryptedData,
          nonce,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: "Letter saved" });
        setComposeOpen(false);
        resetForm();
        fetchLetters();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save letter", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (letter: Letter) => {
    setEditingLetter(letter);
    setRecipientName(letter.recipientName);
    setRecipientEmail(letter.recipientEmail);
    setSubject(letter.subject);

    try {
      const decrypted = await decryptVaultItem(letter.encryptedBody, letter.nonce, masterKey);
      setBody(decrypted);
    } catch {
      toast({ title: "Error", description: "Failed to decrypt letter body", variant: "destructive" });
      setBody("");
    }

    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingLetter) return;
    if (!recipientName || !recipientEmail || !subject || !body) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { encryptedData, nonce } = await encryptVaultItem(body, masterKey);

      const response = await fetch(`/api/letters/${editingLetter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          recipientEmail,
          subject,
          encryptedBody: encryptedData,
          nonce,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: "Letter updated" });
        setEditOpen(false);
        setEditingLetter(null);
        resetForm();
        fetchLetters();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update letter", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/letters/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: "Letter deleted" });
        fetchLetters();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete letter", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (letter: Letter) => {
    const newStatus = letter.status === "DRAFT" ? "READY" : "DRAFT";
    try {
      const response = await fetch(`/api/letters/${letter.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Status Updated",
          description: newStatus === "READY" ? "Letter is ready to be sent" : "Letter moved back to draft",
        });
        fetchLetters();
      }
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <span className="px-2 py-1 text-xs rounded-full bg-slate-700 text-slate-300">Draft</span>;
      case "READY":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-900 text-green-300">Ready</span>;
      case "DELIVERED":
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-900 text-blue-300">Delivered</span>;
      default:
        return null;
    }
  };

  const letterForm = (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Recipient Name</Label>
          <Input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label>Recipient Email</Label>
          <Input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="john@example.com"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Subject</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="A message for you"
        />
      </div>
      <div className="space-y-2">
        <Label>Message</Label>
        <textarea
          className="w-full min-h-[200px] rounded-md border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message here..."
        />
      </div>
    </div>
  );

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
          <h1 className="text-3xl font-bold">Final Letters</h1>
          <p className="text-slate-400">
            Letters to be delivered to your loved ones ({letters.length})
          </p>
        </div>
        <Dialog open={composeOpen} onOpenChange={(open) => { setComposeOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Compose Letter</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Compose Final Letter</DialogTitle>
              <DialogDescription>
                This letter will be encrypted and delivered to the recipient after your death protocol triggers.
              </DialogDescription>
            </DialogHeader>
            {letterForm}
            <DialogFooter>
              <Button onClick={handleCompose} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Letter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditingLetter(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Letter</DialogTitle>
            <DialogDescription>Update this letter&apos;s content and recipient details.</DialogDescription>
          </DialogHeader>
          {letterForm}
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {letters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Mail className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-400">No letters yet</p>
              <p className="text-sm text-slate-500">Compose a letter to get started</p>
            </CardContent>
          </Card>
        ) : (
          letters.map((letter) => (
            <Card key={letter.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-slate-800 rounded-lg">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{letter.subject}</p>
                      {statusBadge(letter.status)}
                    </div>
                    <p className="text-sm text-slate-400">
                      To: {letter.recipientName} &lt;{letter.recipientEmail}&gt;
                    </p>
                    <p className="text-xs text-slate-500">
                      Updated {new Date(letter.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {letter.status !== "DELIVERED" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(letter)}
                        title={letter.status === "DRAFT" ? "Mark as ready" : "Move to draft"}
                      >
                        {letter.status === "DRAFT" ? (
                          <><Send className="h-4 w-4 mr-1" /> Ready</>
                        ) : (
                          <><FileEdit className="h-4 w-4 mr-1" /> Draft</>
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(letter)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Letter</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this letter to {letter.recipientName}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(letter.id)}
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
          ))
        )}
      </div>
    </div>
  );
}
