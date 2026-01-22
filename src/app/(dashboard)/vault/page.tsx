"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Lock, Plus, Key, FileText, MessageSquare, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  createEncryptedVault,
  unlockVault,
  encryptVaultItem,
  decryptVaultItem,
} from "@/lib/crypto/client";

interface VaultItem {
  id: string;
  type: string;
  name: string;
  encryptedData: string;
  nonce: string;
  createdAt: string;
}

interface Vault {
  id: string;
  encryptedMasterKey: string;
  masterKeySalt: string;
  masterKeyNonce: string;
  items: VaultItem[];
}

export default function VaultPage() {
  const [vault, setVault] = useState<Vault | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [password, setPassword] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [setupPassword, setSetupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        setShowSetup(true);
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch vault", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupVault = async () => {
    if (setupPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (setupPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    setUnlocking(true);
    try {
      const vaultData = await createEncryptedVault(setupPassword);
      const response = await fetch("/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vaultData),
      });
      const data = await response.json();
      if (data.success) {
        setVault(data.data);
        setShowSetup(false);
        const key = await unlockVault(
          setupPassword,
          vaultData.encryptedMasterKey,
          vaultData.masterKeySalt,
          vaultData.masterKeyNonce
        );
        setMasterKey(key);
        toast({ title: "Success", description: "Vault created and unlocked" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create vault", variant: "destructive" });
    } finally {
      setUnlocking(false);
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

  if (showSetup || !vault) {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" /> Create Your Vault
            </CardTitle>
            <CardDescription>
              Set a strong password to encrypt your vault. This password never leaves your device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Vault Password</Label>
              <Input
                type="password"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                placeholder="Enter a strong password"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
              />
            </div>
            <Button onClick={handleSetupVault} className="w-full" disabled={unlocking}>
              {unlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Vault
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Warning: If you forget this password, your vault cannot be recovered.
            </p>
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
            <CardDescription>Enter your vault password to access your items</CardDescription>
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

  return (
    <VaultContent vault={vault} masterKey={masterKey} onUpdate={fetchVault} />
  );
}

function VaultContent({
  vault,
  masterKey,
  onUpdate,
}: {
  vault: Vault;
  masterKey: CryptoKey;
  onUpdate: () => void;
}) {
  const [addingItem, setAddingItem] = useState(false);
  const [itemType, setItemType] = useState<"PASSWORD" | "MESSAGE" | "SECRET">("PASSWORD");
  const [itemName, setItemName] = useState("");
  const [itemData, setItemData] = useState("");
  const [decryptedItems, setDecryptedItems] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleAddItem = async () => {
    if (!itemName || !itemData) return;
    setAddingItem(true);
    try {
      const { encryptedData, nonce } = await encryptVaultItem(itemData, masterKey);
      const { encryptedData: encName, nonce: nameNonce } = await encryptVaultItem(itemName, masterKey);

      const response = await fetch("/api/vault/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: itemType,
          name: encName,
          encryptedData,
          nonce,
          metadata: { nameNonce },
        }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Item added to vault" });
        setItemName("");
        setItemData("");
        onUpdate();
      }
    } catch {
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
    } finally {
      setAddingItem(false);
    }
  };

  const handleDecrypt = async (item: VaultItem) => {
    try {
      const decrypted = await decryptVaultItem(item.encryptedData, item.nonce, masterKey);
      setDecryptedItems((prev) => ({ ...prev, [item.id]: decrypted }));
    } catch {
      toast({ title: "Error", description: "Failed to decrypt", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/vault/items/${id}`, { method: "DELETE" });
      toast({ title: "Success", description: "Item deleted" });
      onUpdate();
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "PASSWORD": return <Key className="h-4 w-4" />;
      case "MESSAGE": return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vault</h1>
          <p className="text-slate-600">Your encrypted items ({vault.items.length})</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vault Item</DialogTitle>
              <DialogDescription>Add a new encrypted item to your vault</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Tabs value={itemType} onValueChange={(v) => setItemType(v as typeof itemType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="PASSWORD">Password</TabsTrigger>
                  <TabsTrigger value="MESSAGE">Message</TabsTrigger>
                  <TabsTrigger value="SECRET">Secret</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Gmail, Bank PIN" />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <textarea
                  className="w-full min-h-[100px] rounded-md border p-3 text-sm"
                  value={itemData}
                  onChange={(e) => setItemData(e.target.value)}
                  placeholder={itemType === "PASSWORD" ? "Enter password or credentials" : "Enter your content"}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddItem} disabled={addingItem}>
                {addingItem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add to Vault
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {vault.items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500">Your vault is empty</p>
              <p className="text-sm text-slate-400">Add passwords, messages, or secrets</p>
            </CardContent>
          </Card>
        ) : (
          vault.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-slate-100 rounded-lg">{getIcon(item.type)}</div>
                  <div>
                    <p className="font-medium">{item.type}</p>
                    <p className="text-sm text-slate-500">Added {new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {decryptedItems[item.id] ? (
                    <div className="flex items-center space-x-2">
                      <code className="bg-slate-100 px-2 py-1 rounded text-sm max-w-[200px] truncate">
                        {decryptedItems[item.id]}
                      </code>
                      <Button variant="ghost" size="icon" onClick={() => setDecryptedItems((p) => { const n = {...p}; delete n[item.id]; return n; })}>
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => handleDecrypt(item)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
