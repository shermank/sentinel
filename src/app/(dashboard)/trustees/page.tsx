"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Users, Plus, Mail, Phone, Trash2, CheckCircle, Clock, Loader2 } from "lucide-react";

interface Trustee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  relationship?: string;
  status: string;
  verifiedAt?: string;
  createdAt: string;
}

export default function TrusteesPage() {
  const [trustees, setTrustees] = useState<Trustee[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTrustees();
  }, []);

  const fetchTrustees = async () => {
    try {
      const response = await fetch("/api/trustees");
      const data = await response.json();
      if (data.success) {
        setTrustees(data.data);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch trustees", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!name || !email) {
      toast({ title: "Error", description: "Name and email are required", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const response = await fetch("/api/trustees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone || undefined, relationship: relationship || undefined }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: "Trustee added. They will receive an invitation email." });
        setDialogOpen(false);
        setName("");
        setEmail("");
        setPhone("");
        setRelationship("");
        fetchTrustees();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to add trustee", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await fetch(`/api/trustees/${id}`, { method: "DELETE" });
      toast({ title: "Success", description: "Trustee removed" });
      fetchTrustees();
    } catch {
      toast({ title: "Error", description: "Failed to remove trustee", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      VERIFIED: "bg-blue-100 text-blue-800",
      ACTIVE: "bg-green-100 text-green-800",
      REVOKED: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100"}`}>
        {status}
      </span>
    );
  };

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
          <h1 className="text-3xl font-bold">Trustees</h1>
          <p className="text-slate-600">People who can access your vault if needed</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Trustee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Trustee</DialogTitle>
              <DialogDescription>
                Add someone you trust to receive your vault access if you become unreachable
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone (optional)</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1234567890" />
              </div>
              <div className="space-y-2">
                <Label>Relationship (optional)</Label>
                <Input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Spouse, Lawyer, Friend" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={adding}>
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Trustee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Trustees</CardTitle>
          <CardDescription>
            These people will be notified and given vault access after multiple missed check-ins
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trustees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No trustees added yet</p>
              <p className="text-sm text-slate-400">Add someone you trust to receive your digital legacy</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trustees.map((trustee) => (
                <div
                  key={trustee.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold">
                        {trustee.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{trustee.name}</p>
                        {getStatusBadge(trustee.status)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-500">
                        <span className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" /> {trustee.email}
                        </span>
                        {trustee.phone && (
                          <span className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" /> {trustee.phone}
                          </span>
                        )}
                      </div>
                      {trustee.relationship && (
                        <p className="text-xs text-slate-400">{trustee.relationship}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {trustee.status === "VERIFIED" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {trustee.status === "PENDING" && (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => handleRemove(trustee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
