"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Key, FileText, MessageSquare, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { decryptVaultItem, unlockVault } from "@/lib/crypto/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VaultItem {
  id: string;
  type: string;
  name: string;
  encryptedData: string;
  nonce: string;
  createdAt: string;
}

interface VaultData {
  encryptedMasterKey: string;
  masterKeySalt: string;
  masterKeyNonce: string;
  items: VaultItem[];
}

interface AccessData {
  trusteeName: string;
  userName: string;
  vault: VaultData;
  accessExpiresAt: string;
}

function TrusteeAccessContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "verify" | "unlock" | "viewing" | "error">("loading");
  const [accessData, setAccessData] = useState<AccessData | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [decryptedItems, setDecryptedItems] = useState<Record<string, string>>({});
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (token) {
      verifyAccess();
    } else {
      setStatus("error");
      setError("No access token provided");
    }
  }, [token]);

  const verifyAccess = async () => {
    try {
      const response = await fetch(`/api/trustee/access?token=${token}`);
      const data = await response.json();
      if (data.success) {
        setStatus("verify");
      } else {
        setStatus("error");
        setError(data.error);
      }
    } catch {
      setStatus("error");
      setError("Failed to verify access");
    }
  };

  const handleAccess = async () => {
    try {
      const response = await fetch("/api/trustee/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });
      const data = await response.json();
      if (data.success) {
        setAccessData(data.data);
        setStatus("unlock");
      } else {
        setError(data.error);
      }
    } catch {
      setError("Failed to access vault");
    }
  };

  const handleUnlock = async () => {
    if (!accessData) return;
    setUnlocking(true);
    setError("");
    try {
      const key = await unlockVault(
        password,
        accessData.vault.encryptedMasterKey,
        accessData.vault.masterKeySalt,
        accessData.vault.masterKeyNonce
      );
      setMasterKey(key);
      setStatus("viewing");
    } catch {
      setError("Invalid vault password. You need the original user's vault password.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleDecrypt = async (item: VaultItem) => {
    if (!masterKey) return;
    try {
      const decrypted = await decryptVaultItem(item.encryptedData, item.nonce, masterKey);
      setDecryptedItems((prev) => ({ ...prev, [item.id]: decrypted }));
    } catch {
      setError("Failed to decrypt item");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "PASSWORD": return <Key className="h-4 w-4" />;
      case "MESSAGE": return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (status === "loading") {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-slate-400">Verifying access...</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <h3 className="mt-4 font-semibold text-red-400">Access Denied</h3>
          <p className="text-slate-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "verify") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-indigo-600 mx-auto mb-2" />
          <CardTitle>Digital Legacy Access</CardTitle>
          <CardDescription>
            You have been granted access to view a digital vault
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
            <p className="text-sm text-yellow-200">
              <strong>Important:</strong> This vault contains sensitive information that was entrusted to you.
              Please handle it with care and respect.
            </p>
          </div>
          <Button onClick={handleAccess} className="w-full">
            Access Vault
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "unlock" && accessData) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Lock className="h-12 w-12 text-indigo-600 mx-auto mb-2" />
          <CardTitle>Unlock {accessData.userName}&apos;s Vault</CardTitle>
          <CardDescription>
            Enter the vault password to view contents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Vault Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter the vault password"
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            />
            <p className="text-xs text-slate-400">
              This is the password {accessData.userName} used to secure their vault.
              They may have shared it with you separately.
            </p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleUnlock} className="w-full" disabled={unlocking}>
            {unlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Unlock Vault
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "viewing" && accessData && masterKey) {
    return (
      <div className="w-full max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{accessData.userName}&apos;s Digital Vault</CardTitle>
            <CardDescription>
              Accessed by {accessData.trusteeName} | Expires {new Date(accessData.accessExpiresAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          {accessData.vault.items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lock className="h-12 w-12 text-slate-300 mx-auto" />
                <p className="mt-4 text-slate-400">The vault is empty</p>
              </CardContent>
            </Card>
          ) : (
            accessData.vault.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-800 rounded-lg">{getIcon(item.type)}</div>
                      <div>
                        <p className="font-medium">{item.type}</p>
                        <p className="text-xs text-slate-400">
                          Added {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {decryptedItems[item.id] ? (
                        <div className="flex items-center space-x-2">
                          <div className="bg-slate-800 px-3 py-2 rounded max-w-xs">
                            <pre className="text-sm whitespace-pre-wrap break-all">
                              {decryptedItems[item.id]}
                            </pre>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDecryptedItems((p) => { const n = {...p}; delete n[item.id]; return n; })}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => handleDecrypt(item)}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default function TrusteeAccessPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
          </CardContent>
        </Card>
      }>
        <TrusteeAccessContent />
      </Suspense>
    </div>
  );
}
