"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

function CheckInContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "pending" | "confirmed" | "expired" | "error">("loading");
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (token) {
      checkStatus();
    } else {
      setStatus("error");
      setMessage("No check-in token provided");
    }
  }, [token]);

  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/checkin/confirm?token=${token}`);
      const data = await response.json();
      if (data.success) {
        if (data.data.status === "CONFIRMED") {
          setStatus("confirmed");
          setMessage("You've already confirmed this check-in");
        } else if (data.data.isExpired) {
          setStatus("expired");
          setMessage("This check-in link has expired");
        } else {
          setStatus("pending");
        }
      } else {
        setStatus("error");
        setMessage(data.error || "Invalid check-in link");
      }
    } catch {
      setStatus("error");
      setMessage("Failed to verify check-in link");
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const response = await fetch("/api/checkin/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (data.success) {
        setStatus("confirmed");
        setMessage("Check-in confirmed! Stay safe.");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to confirm");
      }
    } catch {
      setStatus("error");
      setMessage("An error occurred");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-indigo-600" />
          </div>
          <CardTitle>Eternal Sentinel Check-in</CardTitle>
          <CardDescription>Confirm you&apos;re OK</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === "loading" && (
            <div className="py-8">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
              <p className="mt-4 text-slate-400">Verifying...</p>
            </div>
          )}

          {status === "pending" && (
            <div className="py-8 space-y-6">
              <div className="w-20 h-20 bg-indigo-900 rounded-full flex items-center justify-center mx-auto">
                <Clock className="h-10 w-10 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Check-in Required</h3>
                <p className="text-slate-400">Click below to confirm you&apos;re doing well</p>
              </div>
              <Button size="lg" onClick={handleConfirm} disabled={confirming} className="w-full">
                {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                I&apos;m OK
              </Button>
            </div>
          )}

          {status === "confirmed" && (
            <div className="py-8 space-y-4">
              <div className="w-20 h-20 bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-green-400">Confirmed!</h3>
              <p className="text-slate-400">{message}</p>
            </div>
          )}

          {status === "expired" && (
            <div className="py-8 space-y-4">
              <div className="w-20 h-20 bg-yellow-900 rounded-full flex items-center justify-center mx-auto">
                <Clock className="h-10 w-10 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-yellow-400">Expired</h3>
              <p className="text-slate-400">{message}</p>
            </div>
          )}

          {status === "error" && (
            <div className="py-8 space-y-4">
              <div className="w-20 h-20 bg-red-900 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="h-10 w-10 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-red-400">Error</h3>
              <p className="text-slate-400">{message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    }>
      <CheckInContent />
    </Suspense>
  );
}
